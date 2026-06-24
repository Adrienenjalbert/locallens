// Portfolio projects: the server-safe source of truth for every published
// project page (/[vertical]/[location]/[business]/work/[project]/) and the
// style galleries (/ideas/[style]/). Mirrors the enriched shape the self-serve
// builder will write — a superset of the `portfolio_item` row
// (supabase/migrations/0001_foundation.sql) plus the SEO/tagging fields that
// make each project a unique, internally-linked page.
//
// Why this lives here (no "use client"): both the server route files (which
// build JSON-LD + metadata) and the client views (ProfileView grid,
// LocationPage recent-work strip) import it, so the rendered page and the
// machine-readable schema can never drift. In production this is materialised
// from the `portfolio_item` table at build time; the seed below is the
// gardeners × Manchester × GreenThumb wedge so the routes export under `output:
// "export"`.

/** A single project photo. before/after flags drive the comparison UI + alt. */
export interface ProjectImage {
  url: string;
  alt: string;
  /** Marks the "before" frame in a before/after pair. */
  before?: boolean;
  /** Marks the "after" frame in a before/after pair. */
  after?: boolean;
}

/** A verified, post-job review attached to a specific project (Moat B). */
export interface ProjectReview {
  author: string;
  /** 1–5. */
  rating: number;
  text: string;
}

/**
 * A portfolio project. `slug` is the URL segment under `/work/`; the
 * vertical/location/business triple keys it onto the owning business profile so
 * the page nests correctly and breadcrumbs/links resolve.
 */
export interface PortfolioProject {
  slug: string;
  vertical: string;
  location: string;
  /** Owning business profile segment (matches the directory profile route). */
  business: string;
  title: string;
  /** 40–60 word, answer-first summary rendered before the gallery (AEO surface). */
  summary: string;
  /** Longer body copy. */
  description: string;
  /** Taxonomy service slug (e.g. "landscaping") — links to the location/service grid. */
  service: string;
  /** Style slug (e.g. "modern") — links to /ideas/[style]/ (cross-pro aggregation). */
  style: string;
  /** Materials/elements used — tags + future filters + page uniqueness. */
  materials: string[];
  images: ProjectImage[];
  /** Human place the job was done, e.g. "Didsbury". */
  locationName: string;
  /** ISO date the job completed (freshness + sort key). */
  completedAt: string;
  review?: ProjectReview;
  /** ISO date the page content last changed (sitemap freshness). */
  lastModified: string;
}

// Reliable, deterministic placeholder imagery for the demo (seeded so each
// project renders a stable image). Production swaps these for scraped/uploaded
// photos. Kept as a helper so the seed stays readable.
function demoImage(seed: string, alt: string, flag?: "before" | "after"): ProjectImage {
  return {
    url: `https://picsum.photos/seed/${seed}/1200/900`,
    alt,
    ...(flag === "before" ? { before: true } : {}),
    ...(flag === "after" ? { after: true } : {}),
  };
}

export const PROJECTS: PortfolioProject[] = [
  {
    slug: "modern-porcelain-patio-didsbury",
    vertical: "gardeners",
    location: "manchester",
    business: "greenthumb-gardens",
    title: "Modern porcelain patio in Didsbury",
    summary:
      "A tired, waterlogged lawn in Didsbury became a 40m² porcelain patio with composite-decking steps and integrated lighting. Laid on a full sub-base with drainage in nine days, it gives this south-facing garden a low-maintenance entertaining space that stays usable through a Manchester winter.",
    description:
      "The brief was a clean, contemporary space that handled the site's poor drainage. We dug out and laid a permeable sub-base, installed a linear channel drain, then finished in light-grey porcelain with a composite-decking transition to the lawn. Low-voltage lighting was run to the steps and border. The result is a sharp, modern patio that needs little more than an occasional wash.",
    service: "landscaping",
    style: "modern",
    materials: ["porcelain", "composite-decking", "drainage"],
    images: [
      demoImage("patio-didsbury-before", "The Didsbury garden before work began", "before"),
      demoImage("patio-didsbury-after", "Finished modern porcelain patio in Didsbury", "after"),
      demoImage("patio-didsbury-detail", "Composite decking step and lighting detail"),
    ],
    locationName: "Didsbury",
    completedAt: "2026-05-20",
    review: {
      author: "Sarah M.",
      rating: 5,
      text: "GreenThumb turned a swamp into the best part of our house. Tidy, on time, and the drainage finally works. The porcelain looks fantastic.",
    },
    lastModified: "2026-05-22",
  },
  {
    slug: "full-lawn-renovation-chorlton",
    vertical: "gardeners",
    location: "manchester",
    business: "greenthumb-gardens",
    title: "Full lawn renovation in Chorlton",
    summary:
      "A patchy, moss-heavy 120m² lawn in Chorlton was scarified, aerated, top-dressed and over-seeded across two visits. Six weeks on it had grown into a thick, even, hard-wearing lawn — a low-maintenance reset that costs a fraction of returfing.",
    description:
      "Years of moss and compaction had thinned this family lawn. We scarified to pull the moss, hollow-tine aerated to relieve compaction, applied a sandy top-dress to level the surface, then over-seeded with a hard-wearing rye blend and a starter feed. A simple watering and mowing schedule did the rest. It's now the resilient lawn the family wanted for the kids.",
    service: "lawn-care",
    style: "low-maintenance",
    materials: ["grass-seed", "top-dressing"],
    images: [
      demoImage("lawn-chorlton-before", "Patchy mossy lawn in Chorlton before renovation", "before"),
      demoImage("lawn-chorlton-after", "Thick even renovated lawn in Chorlton", "after"),
    ],
    locationName: "Chorlton",
    completedAt: "2026-04-12",
    review: {
      author: "James P.",
      rating: 5,
      text: "Booked a lawn renovation and the difference is night and day. Clear advice on aftercare, no upsell. Lawn has never looked better.",
    },
    lastModified: "2026-04-15",
  },
  {
    slug: "cottage-border-planting-sale",
    vertical: "gardeners",
    location: "manchester",
    business: "greenthumb-gardens",
    title: "Cottage border planting in Sale",
    summary:
      "Two long, empty borders in Sale were transformed into a layered cottage-garden scheme — structural shrubs, repeat-flowering perennials and spring bulbs chosen for year-round colour and pollinators. Planted in a day with a season-by-season care plan handed over.",
    description:
      "The owners wanted a relaxed, English cottage feel that flowered for as long as possible. We improved the soil with compost, set structural evergreens for winter bones, then layered geraniums, salvias, lupins and grasses for succession, underplanted with bulbs. Mulched to lock in moisture and suppress weeds. A short planting plan explains what to cut back and when.",
    service: "landscaping",
    style: "cottage",
    materials: ["topsoil", "bark-mulch", "perennials"],
    images: [
      demoImage("border-sale-before", "Bare empty garden borders in Sale", "before"),
      demoImage("border-sale-after", "Layered cottage-garden borders in Sale", "after"),
    ],
    locationName: "Sale",
    completedAt: "2026-03-30",
    review: {
      author: "Priya K.",
      rating: 5,
      text: "They understood the cottage look we wanted immediately. The borders have been in flower for months and the bees love it.",
    },
    lastModified: "2026-04-02",
  },
];

/** Site-relative path (with trailing slash) for a project page. */
export function projectPath(p: Pick<
  PortfolioProject,
  "vertical" | "location" | "business" | "slug"
>): string {
  return `/${p.vertical}/${p.location}/${p.business}/work/${p.slug}/`;
}

/** Site-relative path (with trailing slash) for a style/ideas gallery. */
export function ideasPath(style: string): string {
  return `/ideas/${style}/`;
}

/** Every published project (newest first). */
export function allProjects(): PortfolioProject[] {
  return [...PROJECTS].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

/** Projects for one business profile (newest first). */
export function projectsForBusiness(
  vertical: string,
  location: string,
  business: string,
): PortfolioProject[] {
  return allProjects().filter(
    (p) => p.vertical === vertical && p.location === location && p.business === business,
  );
}

/** Projects across all businesses in a location (newest first) — the recent-work strip. */
export function projectsForLocation(
  vertical: string,
  location: string,
): PortfolioProject[] {
  return allProjects().filter((p) => p.vertical === vertical && p.location === location);
}

/** Projects in a given style across all businesses — the /ideas/[style]/ gallery. */
export function projectsForStyle(style: string): PortfolioProject[] {
  return allProjects().filter((p) => p.style === style);
}

/** Distinct style slugs that have at least one project (drives /ideas params + sitemap). */
export function projectStyles(): string[] {
  return Array.from(new Set(PROJECTS.map((p) => p.style))).sort();
}

/** Look up a single project by its full key. */
export function findProject(
  vertical: string,
  location: string,
  business: string,
  slug: string,
): PortfolioProject | undefined {
  return PROJECTS.find(
    (p) =>
      p.vertical === vertical &&
      p.location === location &&
      p.business === business &&
      p.slug === slug,
  );
}

/**
 * Related projects for the hub-and-spoke internal linking: prefer same style,
 * then same service, never the project itself. Capped to `limit`. Every project
 * page thus injects fresh internal links toward sibling content.
 */
export function relatedProjects(
  project: PortfolioProject,
  limit = 3,
): PortfolioProject[] {
  const others = allProjects().filter((p) => p.slug !== project.slug);
  const scored = others
    .map((p) => {
      let score = 0;
      if (p.style === project.style) score += 2;
      if (p.service === project.service) score += 1;
      return { p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.p);
}
