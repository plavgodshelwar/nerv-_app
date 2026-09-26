<div align="center">

<img src="./docs/nerv-mark.jpg" alt="NERV command mark" width="180" />

# NERV

### Build teams. Ship outcomes.

NERV is a local-first desktop command center for coordinating a team of terminal-based AI coding agents. It keeps the work on your computer, lets you use the CLI providers you already have, and gives every agent a shared place to receive tasks, keep context, and report progress.

[Download for Windows](https://github.com/plavgodshelwar/nerv-_app/releases/latest) · [Project website](https://plavgodshelwar.github.io/Nerv-web/)

</div>

## What NERV does

- Runs Claude Code, Codex, Gemini, Grok, Kimi, Qwen, OpenCode, Copilot CLI, and custom terminal commands as real local processes.
- Coordinates agents through a visual operations floor, a task queue, inboxes, and durable local memory.
- Gives you project files, Git tools, terminal sessions, schedules, webhooks, skills, and optional voice controls in one desktop app.
- Keeps you in control: agents are local processes, sensitive keys remain on your machine, and imported agent roles always require human review before launch.

## Install

For Windows, download `NERV-<version>-win-x64-setup.exe` from the latest GitHub release and run the installer. Windows may show a SmartScreen warning for an unsigned first release; choose **More info → Run anyway** only after confirming the file came from this repository.

The app runs on Windows, macOS, and Linux. Releases are built by GitHub Actions after a version tag is pushed.

## Run from source

Prerequisites: Node.js 20+ and at least one supported coding-agent CLI installed and authenticated.

```powershell
npm install
npm run dev
```

Create a production Windows installer:

```powershell
npm run dist:win
```

The installer is written to `dist/`.

## Optional PostgreSQL service

NERV works without Docker: its default durable store is local SQLite. The included `docker-compose.yml` starts a PostgreSQL 16 instance for integrations or development that need it.

```powershell
docker compose up -d postgres
docker compose ps
```

It exposes PostgreSQL on `localhost:5432` with development-only defaults (`postgres` / `postgres`, database `nerv`). Change those values before exposing the service beyond your machine.

## Release and website download button

1. Update the version in `package.json`.
2. Commit and push the change to `main`.
3. Push a tag such as `v0.4.9`.
4. The release workflow builds and publishes platform installers to GitHub Releases.
5. Point the website’s Windows download link to:

   `https://github.com/plavgodshelwar/nerv-_app/releases/latest/download/NERV-0.4.9-win-x64-setup.exe`

Use the exact versioned filename created by the release workflow. The stable `releases/latest` page remains a safe general fallback.

## Project structure

- `src/main` — Electron main process, persistence, agent orchestration, integrations, and updater.
- `src/renderer` — React/Pixi desktop interface and visual operations floor.
- `src/shared` — shared types, agent definitions, release state, and validation.
- `resources/skills` — bundled, reviewed skills available to local agents.
- `.github/workflows/release.yml` — cross-platform installer builds and GitHub Release publishing.

## Origin and license

NERV is a customized distribution based on the MIT-licensed [Nerv](https://github.com/chaitanyagiri/nerv) project. This repository preserves the original MIT license and notices. The NERV name, visual mark, project site, release channel, and configuration in this fork are maintained independently and are not affiliated with the original project or Neon Genesis Evangelion.

See [LICENSE](./LICENSE) and [LICENSE-ASSETS](./LICENSE-ASSETS).
