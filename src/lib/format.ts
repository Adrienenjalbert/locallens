// Shared text helpers. One home for the slug/label/date formatting that was
// previously copy-pasted across portfolio views, routes and libs — so behaviour
// is consistent and there's a single place to change it.

/** "lawn-care" → "Lawn care" (first letter capitalised; for labels/tags). */
export function humanize(slug: string): string {
  const s = slug.replace(/-/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "greenthumb-gardens" → "Greenthumb Gardens" (every word; for names/places). */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Lowercase, hyphenated, accent/punctuation-free slug from any string. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ISO date → "May 2026" (en-GB), or undefined for empty/invalid input. */
export function formatMonthYear(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? undefined
    : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}
