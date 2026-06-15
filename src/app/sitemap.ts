import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/paths";
import { PUBLISHED_PAGES } from "@/lib/seo/pages";

// Emitted as a static /sitemap.xml by the export. Generated from the published-
// pages registry so it never drifts from what `generateStaticParams` renders.
// Absolute URLs (origin + basePath) keep it unambiguous on GitHub Pages project
// sites. Only readiness-passing, indexable pages appear here.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLISHED_PAGES.map((page) => ({
    url: siteUrl(page.path),
    lastModified: page.lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
