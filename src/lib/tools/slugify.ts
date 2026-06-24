// Pure slug + UTM helpers shared by the client widgets. Kept pure (no DOM, no
// React) so they are unit-testable and reusable server-side if ever needed.

/** Common English stop words dropped from slugs when `dropStopWords` is on. */
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export interface SlugifyOptions {
  /** Drop common English stop words (the, a, of…). Default false. */
  dropStopWords?: boolean;
  /** Word separator. Default "-". */
  separator?: string;
}

/**
 * Turn arbitrary text into a clean, lowercase, hyphen-separated URL slug:
 * strips accents/diacritics, removes punctuation, collapses whitespace, and
 * optionally drops stop words. Deterministic and safe for empty input.
 */
export function slugify(input: string, options: SlugifyOptions = {}): string {
  const separator = options.separator ?? "-";
  const normalised = input
    .normalize("NFKD")
    // strip combining diacritical marks (é → e)
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim();

  let words = normalised.split(/[\s-]+/).filter(Boolean);
  if (options.dropStopWords) {
    const kept = words.filter((w) => !STOP_WORDS.has(w));
    // Don't return an empty slug if the title is entirely stop words.
    if (kept.length > 0) words = kept;
  }
  return words.join(separator);
}

export interface UtmParams {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term?: string;
  content?: string;
}

/** Lowercase + trim a UTM value (values are case-sensitive in analytics). */
export function normaliseUtmValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Build a UTM-tagged URL. Preserves any existing query string and hash on the
 * base URL, lowercases UTM values, and omits empty optional params. Returns the
 * original (trimmed) input unchanged if it isn't a parseable URL yet.
 */
export function buildUtmUrl(params: UtmParams): string {
  const base = params.url.trim();
  if (!base) return "";

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    // Not yet a valid absolute URL (user still typing) — return as-is.
    return base;
  }

  const entries: Array<[string, string]> = [
    ["utm_source", normaliseUtmValue(params.source)],
    ["utm_medium", normaliseUtmValue(params.medium)],
    ["utm_campaign", normaliseUtmValue(params.campaign)],
  ];
  if (params.term) entries.push(["utm_term", normaliseUtmValue(params.term)]);
  if (params.content) entries.push(["utm_content", normaliseUtmValue(params.content)]);

  for (const [key, value] of entries) {
    if (value) parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

/** Pixel-width budgets Google uses to truncate; approximate but useful. */
export const TITLE_PIXEL_LIMIT = 580;
export const DESCRIPTION_CHAR_LIMIT = 160;

/**
 * Approximate the rendered pixel width of a title using per-character widths
 * (Arial ~13px). Good enough to warn before Google truncates (~580px).
 */
export function approxTitlePixels(title: string): number {
  // Average character width at Google's title size; wide chars (m, w) count
  // a little more, narrow ones (i, l) a little less.
  let px = 0;
  for (const ch of title) {
    if ("mwMW".includes(ch)) px += 13;
    else if ("iljtfI .,".includes(ch)) px += 4;
    else px += 8;
  }
  return px;
}
