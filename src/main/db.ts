/**
 * PersistStore — durable harness state in PostgreSQL (pg, async).
 *
 * Phase A scope (the rest of the renderer state stays in localStorage for now):
 *   - kv:               scalar app state. Today: the main window's bounds.
 *   - command_history:  NET-NEW — every prompt the user submits to an agent.
 *
 * Lives in the Electron MAIN process; the renderer reaches it over IPC.
 * Connection defaults to postgres://postgres:postgres@localhost:5432/nerv
 * (override via PG_URL env var or individual PG_* vars).
 *
 * Schema evolves via a simple migrations table: an ordered array where
 * migration N runs when it hasn't been recorded yet. NEVER edit a shipped
 * migration — only append.
 */
import { Pool } from 'pg';

/** A captured user prompt, as returned to the renderer (camelCase columns). */
export interface CommandHistoryRow {
  id: number;
  agentId: string;
  cwd: string | null;
  text: string;
  ts: number;
}

/**
 * Ordered, append-only migrations. Index N takes the DB from version N to N+1.
 * To evolve the schema, APPEND a new SQL string — never edit an existing one
 * (shipped DBs have already run it).
 */
const MIGRATIONS: string[] = [
  // Migration 0 → version 1 (Phase A): migrations tracker + kv + command history.
  `
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     INTEGER PRIMARY KEY,
      applied_at  BIGINT  NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      key        TEXT    PRIMARY KEY,
      value      TEXT    NOT NULL,
      updated_at BIGINT  NOT NULL
    );
    CREATE TABLE IF NOT EXISTS command_history (
      id       SERIAL  PRIMARY KEY,
      agent_id TEXT    NOT NULL,
      cwd      TEXT,
      text     TEXT    NOT NULL,
      ts       BIGINT  NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ch_agent_ts ON command_history(agent_id, ts DESC);
  `
];

/** Resolve PostgreSQL connection URL from env or defaults. */
function resolveConnectionString(): string {
  if (process.env.PG_URL) return process.env.PG_URL;
  const host = process.env.PG_HOST ?? 'localhost';
  const port = process.env.PG_PORT ?? '5432';
  const user = process.env.PG_USER ?? 'postgres';
  const pass = process.env.PG_PASSWORD ?? 'postgres';
  const db   = process.env.PG_DB   ?? 'nerv';
  return `postgresql://${user}:${pass}@${host}:${port}/${db}`;
}

export class PersistStore {
  private pool: Pool | null = null;

  /** Open (creating pool if needed) and migrate the DB. Idempotent — a second
   *  call is a no-op. Throws if the connection fails; callers should guard so a
   *  DB failure can't crash app startup. */
  async open(): Promise<void> {
    if (this.pool) return;
    const connectionString = resolveConnectionString();
    const pool = new Pool({ connectionString, max: 5 });
    // Smoke-test the connection before accepting it
    await pool.query('SELECT 1');
    await this.migrate(pool);
    this.pool = pool;
  }

  private async migrate(pool: Pool): Promise<void> {
    // Ensure the migrations table exists (idempotent — part of migration 0)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version     INTEGER PRIMARY KEY,
        applied_at  BIGINT  NOT NULL
      )
    `);

    for (let i = 0; i < MIGRATIONS.length; i++) {
      const res = await pool.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1', [i]
      );
      if (res.rowCount && res.rowCount > 0) continue; // already applied

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(MIGRATIONS[i]);
        await client.query(
          'INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)',
          [i, Date.now()]
        );
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }
  }

  /** Drain the pool. Safe to call when already closed. */
  async close(): Promise<void> {
    try { await this.pool?.end(); } catch { /* best-effort on shutdown */ }
    this.pool = null;
  }

  get isOpen(): boolean { return this.pool !== null; }

  // ─── kv (scalar app state) ─────────────────────────────────────────────────

  /** Read a JSON-decoded scalar, or undefined if absent/unparseable. */
  async getKv<T = unknown>(key: string): Promise<T | undefined> {
    if (!this.pool) return undefined;
    try {
      const res = await this.pool.query<{ value: string }>(
        'SELECT value FROM kv WHERE key = $1', [key]
      );
      const row = res.rows[0];
      if (!row) return undefined;
      try { return JSON.parse(row.value) as T; } catch { return undefined; }
    } catch { return undefined; }
  }

  /** Upsert a JSON-encoded scalar. */
  async setKv(key: string, value: unknown): Promise<void> {
    if (!this.pool) return;
    await this.pool.query(
      `INSERT INTO kv (key, value, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
      [key, JSON.stringify(value), Date.now()]
    );
  }

  // ─── command history (net-new) ─────────────────────────────────────────────

  /** Record one submitted prompt. Empty text or missing agent id are ignored. */
  async addHistory(entry: { agentId: string; cwd?: string | null; text: string }): Promise<void> {
    if (!this.pool) return;
    const text = (entry.text ?? '').trim();
    if (!text || !entry.agentId) return;
    await this.pool.query(
      'INSERT INTO command_history (agent_id, cwd, text, ts) VALUES ($1, $2, $3, $4)',
      [entry.agentId, entry.cwd ?? null, text, Date.now()]
    );
  }

  /** Most-recent-first history, optionally scoped to one agent. */
  async listHistory(agentId?: string, limit = 100): Promise<CommandHistoryRow[]> {
    if (!this.pool) return [];
    const lim = clampLimit(limit, 100);
    const res = agentId
      ? await this.pool.query<{ id: number; agentid: string; cwd: string | null; text: string; ts: string }>(
          'SELECT id, agent_id AS agentId, cwd, text, ts FROM command_history WHERE agent_id = $1 ORDER BY ts DESC, id DESC LIMIT $2',
          [agentId, lim]
        )
      : await this.pool.query<{ id: number; agentid: string; cwd: string | null; text: string; ts: string }>(
          'SELECT id, agent_id AS agentId, cwd, text, ts FROM command_history ORDER BY ts DESC, id DESC LIMIT $1',
          [lim]
        );
    return res.rows.map(normalizeHistoryRow);
  }

  /** Substring search over prompt text, most-recent-first. */
  async searchHistory(query: string, limit = 50): Promise<CommandHistoryRow[]> {
    if (!this.pool) return [];
    const q = (query ?? '').trim();
    if (!q) return [];
    const lim = clampLimit(limit, 50);
    const res = await this.pool.query<{ id: number; agentid: string; cwd: string | null; text: string; ts: string }>(
      `SELECT id, agent_id AS agentId, cwd, text, ts FROM command_history
       WHERE text ILIKE $1 ORDER BY ts DESC, id DESC LIMIT $2`,
      [`%${q}%`, lim]
    );
    return res.rows.map(normalizeHistoryRow);
  }
}

/** pg returns column names lowercase; normalise to camelCase for callers. */
function normalizeHistoryRow(row: { id: number; agentid?: string; agentId?: string; cwd: string | null; text: string; ts: string | number }): CommandHistoryRow {
  return {
    id: row.id,
    agentId: (row.agentId ?? row.agentid ?? '') as string,
    cwd: row.cwd,
    text: row.text,
    ts: typeof row.ts === 'string' ? parseInt(row.ts, 10) : row.ts
  };
}

/** Coerce an untrusted limit into [1, 1000] with a sane fallback. */
function clampLimit(n: number, fallback: number): number {
  const v = Math.floor(Number(n));
  if (!Number.isFinite(v) || v <= 0) return fallback;
  return Math.min(1000, v);
}
