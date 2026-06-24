// Base-path-aware href helper. On GitHub Pages project sites the app is served
// under /<repo>, so internal links must be prefixed. Next's <Link> already
// prefixes basePath for navigation, but this helper is handy for non-Link uses
// (sitemaps, canonical URLs, manual anchors).
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}

export function siteUrl(path = "/"): string {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://localhost:3000";
  return `${origin}${withBasePath(path)}`;
}
