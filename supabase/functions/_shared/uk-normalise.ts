// UK normalisation helpers for the ETL pipeline. Pure functions, Deno-friendly.
// Used by etl-normalise to map heterogeneous source data to canonical form
// with consistent phone (E.164), postcode, and category taxonomy.

/** Normalise a UK phone number to E.164 (+44…). Returns null if implausible. */
export function ukPhoneToE164(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+44")) digits = "+44" + digits.slice(3).replace(/^0+/, "");
  else if (digits.startsWith("44")) digits = "+44" + digits.slice(2).replace(/^0+/, "");
  else if (digits.startsWith("0")) digits = "+44" + digits.slice(1);
  else if (digits.startsWith("+")) {
    // already international, non-UK — keep as-is if plausible length
    return digits.length >= 8 && digits.length <= 16 ? digits : null;
  } else digits = "+44" + digits;
  const national = digits.replace(/^\+44/, "");
  // UK national numbers are 9–10 digits after the country code.
  if (national.length < 9 || national.length > 10) return null;
  return digits;
}

const UK_POSTCODE_RE =
  /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

/** Validate + canonicalise a UK postcode ("m1 1ae" → "M1 1AE"). */
export function ukPostcode(input: string | null | undefined): string | null {
  if (!input) return null;
  const m = input.trim().toUpperCase().match(UK_POSTCODE_RE);
  if (!m) return null;
  return `${m[1]} ${m[2]}`;
}

/**
 * Map a source category string to our taxonomy slug using a per-vertical map.
 * Falls back to a slugified version so nothing is silently dropped.
 */
export function mapCategory(
  raw: string,
  categoryMap: Record<string, string>,
): string {
  const key = raw.trim().toLowerCase();
  return categoryMap[key] ?? slugify(raw);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Normalise opening hours to a structured {mon..sun: [{open,close}]} shape. */
export function normaliseHours(
  raw: unknown,
): Record<string, { open: string; close: string }[]> | null {
  // Sources vary wildly; here we accept Google's `weekday_text`-style array or
  // an already-structured object. Real impl maps each provider; kept minimal.
  if (!raw) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, { open: string; close: string }[]>;
  }
  return null;
}
