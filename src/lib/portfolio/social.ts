// The social remix engine: turn one published project into ready-to-paste posts
// for every channel a local pro actually uses. Pure + deterministic (no LLM, no
// network) so it runs at build time or client-side at zero marginal cost — the
// "useful, repeatable, low running cost" supply service. Every post links back
// to the project page, so sharing seeds links into the directory's SEO graph.

import type { PortfolioProject } from "@/lib/portfolio/projects";
import { humanize } from "@/lib/format";

export type SocialPlatform =
  | "instagram"
  | "facebook"
  | "google-business"
  | "pinterest"
  | "x"
  | "reel";

export interface SocialPost {
  platform: SocialPlatform;
  /** Human label, e.g. "Instagram". */
  label: string;
  /** One-line "what this is for" hint shown in the UI. */
  hint: string;
  /** Ready-to-paste body (already includes the link where the platform supports it). */
  body: string;
  /** Hashtags to append/copy separately ([] where a platform discourages them). */
  hashtags: string[];
  /** Soft character budget for the platform (UI shows count vs this). */
  charLimit?: number;
}

export interface SocialPackInput {
  project: PortfolioProject;
  businessName: string;
  /** The metro/launch geography, e.g. "Manchester". */
  placeName: string;
  /** Absolute URL of the project page (for the link-back). */
  url: string;
}

/** Turn a phrase/slug into a single lowercase hashtag, e.g. "lawn-care" → "#lawncare". */
function tag(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return cleaned ? `#${cleaned}` : "";
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** The hashtag pool, ordered most → least specific, deduped. */
function hashtagPool(input: SocialPackInput): string[] {
  const { project, placeName } = input;
  return dedupe([
    tag(`${placeName} ${input.project.service}`),
    tag(`${placeName} gardener`),
    tag(project.locationName),
    tag(project.service),
    tag(`${project.style} garden`),
    ...project.materials.map(tag),
    "#gardendesign",
    "#beforeandafter",
    "#gardentransformation",
    "#landscaping",
    "#gardeninspo",
  ]);
}

/**
 * Build the full social pack for a project. Returns one post per channel, in the
 * order a pro is most likely to publish them.
 */
export function buildSocialPack(input: SocialPackInput): SocialPost[] {
  const { project, businessName, url } = input;
  const service = humanize(project.service).toLowerCase();
  const place = project.locationName;
  const pool = hashtagPool(input);

  // Instagram — visual-first, hook + value + soft CTA, generous hashtags.
  const instagram: SocialPost = {
    platform: "instagram",
    label: "Instagram",
    hint: "Carousel of your before/after photos + this caption.",
    body: [
      `${project.title} ✨`,
      "",
      project.summary,
      "",
      `Thinking about ${service} in ${place}? Tap the link in our bio to see the full project and get a quote.`,
    ].join("\n"),
    hashtags: pool.slice(0, 12),
    charLimit: 2200,
  };

  // Facebook — a touch more narrative, link inline, light hashtags.
  const facebook: SocialPost = {
    platform: "facebook",
    label: "Facebook",
    hint: "Post your photos with this text; the link previews automatically.",
    body: [
      `${project.title}`,
      "",
      project.description,
      "",
      `Want something similar in ${place} or nearby? See the full project and request a quote 👇`,
      url,
    ].join("\n"),
    hashtags: pool.slice(0, 4),
  };

  // Google Business Profile — local-SEO keywords, clear CTA, NO hashtags.
  const googleBusiness: SocialPost = {
    platform: "google-business",
    label: "Google Business Profile",
    hint: "Add as a GBP 'Update' post with the 'Learn more' button → the link.",
    body: [
      `${humanize(project.style)} ${service} in ${place}.`,
      "",
      project.summary,
      "",
      `${businessName} covers ${place} and the surrounding area. Tap “Learn more” to see the full project and get a free quote.`,
    ].join("\n"),
    hashtags: [],
    charLimit: 1500,
  };

  // Pinterest — search-driven: keyword-rich title + description, link on the pin.
  const pinterest: SocialPost = {
    platform: "pinterest",
    label: "Pinterest",
    hint: "Pin your best 'after' photo; use this as the title + description.",
    body: [
      `${humanize(project.style)} garden ideas: ${project.title}`,
      "",
      `${project.summary} Real ${service} project by ${businessName} in ${place}.`,
    ].join("\n"),
    hashtags: pool.slice(0, 6),
    charLimit: 500,
  };

  // X / Twitter — must fit 280 incl. the link; trim the summary to suit.
  const xHashtags = pool.slice(0, 2);
  const xReserve = url.length + xHashtags.join(" ").length + 8; // spaces/newlines
  const xLede = `${project.title} —`;
  const room = Math.max(0, 280 - xReserve - xLede.length - 1);
  const xSummary =
    project.summary.length > room
      ? `${project.summary.slice(0, Math.max(0, room - 1)).trimEnd()}…`
      : project.summary;
  const x: SocialPost = {
    platform: "x",
    label: "X / Twitter",
    hint: "Attach a photo; this fits in one tweet.",
    body: `${xLede} ${xSummary}\n${url}\n${xHashtags.join(" ")}`.trim(),
    hashtags: xHashtags,
    charLimit: 280,
  };

  // Reel / TikTok — a shot-by-shot script, not a caption (the highest-reach format).
  const reel: SocialPost = {
    platform: "reel",
    label: "Reel / TikTok script",
    hint: "Film these 4 clips; on-screen text in quotes; ~20–30s.",
    body: [
      `1. BEFORE (3s) — text: “${place}, before”`,
      `   Show the original ${project.locationName} garden.`,
      `2. PROCESS (8s) — text: “The work”`,
      `   Quick cuts of the ${service} going in (${project.materials.map(humanize).join(", ").toLowerCase()}).`,
      `3. AFTER (8s) — text: “${humanize(project.style)} finish”`,
      `   Slow pan across the finished result.`,
      `4. CTA (4s) — text: “Garden goals in ${place}? Link in bio.”`,
      "",
      `Caption: ${project.title}. ${service} in ${place} by ${businessName}.`,
    ].join("\n"),
    hashtags: pool.slice(0, 8),
    charLimit: undefined,
  };

  return [instagram, facebook, googleBusiness, pinterest, x, reel];
}

/** Combine a post body with its hashtags into one copy-paste string. */
export function postWithHashtags(post: SocialPost): string {
  if (post.hashtags.length === 0) return post.body;
  return `${post.body}\n\n${post.hashtags.join(" ")}`;
}
