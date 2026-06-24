// Self-serve draft logic: the pure functions behind the owner project builder.
// The product principle is "confirm, don't compose" — a non-technical pro should
// never face a blank box, so we derive a slug, an answer-first summary and a body
// from the few fields they give us. Kept pure (no React, no network) so the form
// stays thin and this is unit-testable.

import type { PortfolioProject, ProjectImage, ProjectReview } from "@/lib/portfolio/projects";
import { humanize, slugify } from "@/lib/format";

/** Style options offered in the builder (vertical-specific; config later). */
export const STYLE_OPTIONS = [
  "modern",
  "cottage",
  "low-maintenance",
  "japanese",
  "mediterranean",
  "family-friendly",
  "wildlife",
] as const;

/** What the owner fills in (most of it pre-filled from their scraped record). */
export interface ProjectForm {
  vertical: string;
  location: string;
  business: string;
  /** Display name of the business (for drafted copy). */
  businessName: string;
  title: string;
  /** Human area the work was done, e.g. "Didsbury". */
  area: string;
  service: string;
  style: string;
  materials: string[];
  images: ProjectImage[];
  /** Optional overrides — when blank we draft them. */
  summary?: string;
  description?: string;
  review?: ProjectReview;
  /** ISO date (YYYY-MM-DD); defaults to today. */
  completedAt?: string;
}

function listToProse(items: string[]): string {
  const clean = items.map((m) => humanize(m).toLowerCase()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

/** Today as an ISO date (YYYY-MM-DD). */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * An answer-first ~40–60 word summary derived from the form. This is the draft a
 * pro confirms or tweaks — never a blank field.
 */
export function draftSummary(form: ProjectForm): string {
  const style = humanize(form.style).toLowerCase();
  const service = humanize(form.service).toLowerCase();
  const area = form.area.trim() || "the local area";
  const mats = listToProse(form.materials);
  const matClause = mats ? ` using ${mats}` : "";
  return (
    `A ${style} ${service} project in ${area}${matClause}. ` +
    `${form.businessName} transformed the space with a clean, hard-wearing finish built to last. ` +
    `See the before-and-after photos below, then get a free quote for similar ${service} in ${area} and nearby.`
  );
}

/** A longer body, also drafted so the field is never empty. */
export function draftDescription(form: ProjectForm): string {
  const style = humanize(form.style).toLowerCase();
  const service = humanize(form.service).toLowerCase();
  const area = form.area.trim() || "the local area";
  const mats = listToProse(form.materials);
  const matSentence = mats
    ? ` Key materials included ${mats}, chosen for durability and a ${style} look.`
    : "";
  return (
    `This ${service} project in ${area} was completed by ${form.businessName}.` +
    matSentence +
    ` The result is a ${style} space that's practical to live with and built to a standard that holds up. ` +
    `If you're planning something similar in ${area}, the team can talk you through options and costs.`
  );
}

/** Which required fields are still missing (mirrors the page-readiness gate). */
export function projectReadiness(form: ProjectForm): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!form.title.trim()) missing.push("title");
  if (!form.area.trim()) missing.push("area");
  if (!form.service.trim()) missing.push("service");
  if (!form.style.trim()) missing.push("style");
  if (form.images.filter((i) => i.url.trim()).length === 0) missing.push("at least one photo");
  return { ready: missing.length === 0, missing };
}

/** Map the form to a publishable PortfolioProject, drafting any blank copy. */
export function formToProject(form: ProjectForm): PortfolioProject {
  const day = today();
  const images: ProjectImage[] = form.images
    .filter((i) => i.url.trim())
    .map((i) => ({
      url: i.url.trim(),
      alt: i.alt.trim() || `${form.title} — ${form.businessName}`,
      ...(i.before ? { before: true } : {}),
      ...(i.after ? { after: true } : {}),
    }));

  return {
    slug: slugify(form.title),
    vertical: form.vertical,
    location: form.location,
    business: form.business,
    title: form.title.trim(),
    summary: form.summary?.trim() || draftSummary(form),
    description: form.description?.trim() || draftDescription(form),
    service: form.service,
    style: form.style,
    materials: form.materials.map((m) => m.trim()).filter(Boolean),
    images,
    locationName: form.area.trim(),
    completedAt: form.completedAt ?? day,
    review: form.review,
    lastModified: day,
  };
}

/** Parse a free-text materials field ("porcelain, decking") into slugged tags. */
export function parseMaterials(input: string): string[] {
  return input
    .split(",")
    .map((m) => slugify(m))
    .filter(Boolean);
}
