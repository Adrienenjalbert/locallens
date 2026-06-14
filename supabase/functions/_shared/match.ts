// Entity-resolution helpers for etl-dedup: decide whether two staging records
// are the same real business. Combines fuzzy name + geo proximity + phone/web.

/** Normalised Levenshtein-based similarity, 0..1. */
export function nameSimilarity(a: string, b: string): number {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const dist = levenshtein(x, y);
  return 1 - dist / Math.max(x.length, y.length);
}

/** Haversine distance in metres. */
export function metresBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface MatchInput {
  name: string;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
}

/**
 * Composite match score, 0..1. Two records are "the same business" above a
 * threshold (caller decides, e.g. 0.7). Phone/website exact matches are strong
 * signals; geo proximity gates name similarity (same name 5km apart ≠ same).
 */
export function matchScore(a: MatchInput, b: MatchInput): number {
  let score = 0;
  const name = nameSimilarity(a.name, b.name);

  let geoOk = true;
  if (a.lat != null && a.lng != null && b.lat != null && b.lng != null) {
    const d = metresBetween(a.lat, a.lng, b.lat, b.lng);
    geoOk = d < 250; // within 250m
    score += geoOk ? 0.3 : 0;
  }
  score += name * (geoOk ? 0.4 : 0.2);

  if (a.phone && b.phone && a.phone === b.phone) score += 0.2;
  if (a.website && b.website && sameHost(a.website, b.website)) score += 0.1;

  return Math.min(1, score);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(ltd|limited|the|co|company|services?|gardening|gardeners?)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function sameHost(a: string, b: string): boolean {
  try {
    const ha = new URL(a).hostname.replace(/^www\./, "");
    const hb = new URL(b).hostname.replace(/^www\./, "");
    return ha === hb;
  } catch {
    return false;
  }
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}
