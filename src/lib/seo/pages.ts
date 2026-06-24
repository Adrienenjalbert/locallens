// The published-pages registry: the single source of truth for every
// statically-exported, indexable URL. Both `generateStaticParams` (what Next
// pre-renders) and `sitemap.ts` (what we tell crawlers about) read from here so
// the two can never drift.
//
// In production this is materialised from the `page` table (only demand-backed,
// data-backed, readiness-passing rows are published). It's hard-coded to the
// gardeners × Manchester wedge for now; swapping the source for a Supabase read
// at build time is the only change needed to scale this to thousands of pages.

import {
  activeCategories,
  liveTools,
  toolPath,
  categoryPath,
} from "@/lib/tools/registry";
import {
  allProjects,
  ideasPath,
  projectPath,
  projectStyles,
  projectsForStyle,
} from "@/lib/portfolio/projects";

export type PageKind =
  | "home"
  | "location"
  | "profile"
  | "project"
  | "ideas"
  | "tool"
  | "tool-hub"
  | "tool-category"
  | "static";

export interface PublishedPage {
  kind: PageKind;
  /** Site-relative path, no basePath, no origin. Always leading slash. */
  path: string;
  /** ISO date the underlying golden record / content last changed (freshness). */
  lastModified: string;
  /** Sitemap priority hint (0–1). */
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
}

// Keep in lock-step with the dates surfaced on-page (AnswerBlock stat / "Updated
// {date}") so the freshness signal a crawler reads in JSON-LD matches what a
// human sees. AI answer engines weight recency heavily.
export const PUBLISHED_PAGES: PublishedPage[] = [
  {
    kind: "home",
    path: "/",
    lastModified: "2026-06-15",
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    kind: "location",
    path: "/gardeners/manchester/",
    lastModified: "2026-06-15",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    kind: "profile",
    path: "/gardeners/manchester/greenthumb-gardens/",
    lastModified: "2026-06-12",
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    kind: "tool",
    path: "/tools/gardeners-cost-manchester/",
    lastModified: "2026-06-15",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    kind: "tool",
    path: "/tools/gardeners-vs/",
    lastModified: "2026-06-15",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  // ── Free-tools directory ─────────────────────────────────────────────────
  // Generated from the registry (src/lib/tools/registry.ts) so the hub,
  // category landing pages and per-tool pages can never drift from the sitemap.
  ...freeToolsDirectoryPages(),
  // ── Portfolio (projects + style galleries) ───────────────────────────────
  // Generated from the projects module so every published project page and
  // /ideas/[style]/ gallery is crawlable the moment it exists.
  ...portfolioPages(),
];

/** The hub + one page per active category + one page per live tool. */
function freeToolsDirectoryPages(): PublishedPage[] {
  const hub: PublishedPage = {
    kind: "tool-hub",
    path: "/tools/",
    lastModified: "2026-06-15",
    priority: 0.8,
    changeFrequency: "weekly",
  };

  const categories: PublishedPage[] = activeCategories().map((c) => ({
    kind: "tool-category",
    path: categoryPath(c.slug),
    lastModified: "2026-06-15",
    priority: 0.7,
    changeFrequency: "weekly",
  }));

  const tools: PublishedPage[] = liveTools().map((t) => ({
    kind: "tool",
    path: toolPath(t.slug),
    lastModified: t.lastModified,
    priority: 0.7,
    changeFrequency: "monthly",
  }));

  return [hub, ...categories, ...tools];
}

/** One page per published project + one per style gallery, from the projects module. */
function portfolioPages(): PublishedPage[] {
  const projects: PublishedPage[] = allProjects().map((p) => ({
    kind: "project",
    path: projectPath(p),
    lastModified: p.lastModified,
    priority: 0.6,
    changeFrequency: "monthly",
  }));

  const ideas: PublishedPage[] = projectStyles().map((style) => {
    const latest = projectsForStyle(style)
      .map((p) => p.lastModified)
      .sort()
      .at(-1);
    return {
      kind: "ideas",
      path: ideasPath(style),
      lastModified: latest ?? "2026-06-15",
      priority: 0.6,
      changeFrequency: "monthly",
    };
  });

  return [...projects, ...ideas];
}

/** Look up the publish metadata for a path (used to surface freshness on-page). */
export function findPublishedPage(path: string): PublishedPage | undefined {
  return PUBLISHED_PAGES.find((p) => p.path === path);
}
