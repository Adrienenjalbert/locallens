import type { Metadata } from "next";
import { siteUrl } from "@/lib/paths";

// Shared metadata helpers so every indexable page emits a self-referencing
// canonical (de-dupes the /vertical/location vs /tools overlap) plus OpenGraph +
// Twitter cards (controls how AI answer engines and social surfaces render us).

const SITE_NAME = "LocalLens";

export interface PageMetaInput {
  title: string;
  description: string;
  /** Site-relative path WITH trailing slash, no origin/basePath, e.g. "/gardeners/manchester/". */
  path: string;
  type?: "website" | "article";
  /** ISO date the page content last changed (emitted for article pages). */
  modifiedTime?: string;
}

export function buildPageMetadata(input: PageMetaInput): Metadata {
  const canonical = siteUrl(input.path);
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      type: input.type ?? "website",
      siteName: SITE_NAME,
      title: input.title,
      description: input.description,
      url: canonical,
      locale: "en_GB",
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
  };
}
