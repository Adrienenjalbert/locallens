// The published-pages registry: the single source of truth for every
// statically-exported, indexable URL. Both `generateStaticParams` (what Next
// pre-renders) and `sitemap.ts` (what we tell crawlers about) read from here so
// the two can never drift.
//
// In production this is materialised from the `page` table (only demand-backed,
// data-backed, readiness-passing rows are published). It's hard-coded to the
// gardeners × Manchester wedge for now; swapping the source for a Supabase read
// at build time is the only change needed to scale this to thousands of pages.

export type PageKind = "home" | "location" | "profile" | "tool" | "static";

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
];

/** Look up the publish metadata for a path (used to surface freshness on-page). */
export function findPublishedPage(path: string): PublishedPage | undefined {
  return PUBLISHED_PAGES.find((p) => p.path === path);
}
