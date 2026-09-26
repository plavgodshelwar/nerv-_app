// Global site config — single source of truth for SEO defaults.
// Kevin's SEO_METADATA.md flows in here (site-level) and into each post's
// frontmatter (per-page). Keep absolute origin in one place.
export default {
  name: "Nerv",
  blogName: "Nerv Blog",
  // Origin with no trailing slash; pathPrefix (/blog/) is applied by Eleventy.
  origin: "https://nerv.in",
  baseUrl: "https://nerv.in/blog/",
  // Blog-index description (Kevin's SEO_METADATA.md §3.9).
  description:
    "Guides, deep dives, and comparisons on running multi-agent Claude Code: orchestration, agent memory, automation, and the tooling landscape.",
  tagline: "Notes from the office floor.",
  lang: "en",
  locale: "en_US",
  author: {
    name: "Chaitanya Giri",
    twitter: "",
    url: "https://nerv.in",
  },
  // Home-page pillar anchors blog posts link UP to (SEO_METADATA.md §5.7).
  pillars: {
    what: "https://nerv.in/#what",
    how: "https://nerv.in/#how",
    why: "https://nerv.in/#why",
    install: "https://nerv.in/#install",
    claude: "https://nerv.in/#claude",
    opensource: "https://nerv.in/#opensource",
  },
  social: {
    github: "https://github.com/chaitanyagiri/nerv",
    site: "https://nerv.in",
  },
  // Default OG image (absolute). Per-post `ogImage` overrides this.
  defaultOgImage: "https://nerv.in/media/og.png",
  themeColor: "#F5F2E8",
  // Topic clusters (categories), aligned to Kevin's keyword taxonomy + the
  // technical/non-technical split in BLOG_IDEAS.md. A post's `category` field
  // picks one of these; the index/topics pages derive the live list from posts.
  clusters: [
    { key: "guides", label: "Guides", kind: "technical" },
    { key: "orchestration", label: "Orchestration", kind: "technical" },
    { key: "memory", label: "Memory", kind: "technical" },
    { key: "internals", label: "Internals", kind: "technical" },
    { key: "concepts", label: "Concepts", kind: "non-technical" },
    { key: "comparisons", label: "Comparisons", kind: "non-technical" },
    { key: "use-cases", label: "Use Cases", kind: "non-technical" },
    { key: "story", label: "Story", kind: "non-technical" },
  ],
};
