import type { Metadata } from "next";
import { LocationPage } from "@/views/LocationPage";
import { SHORTLIST, businessSlug } from "@/lib/directory/shortlist";
import { VERTICALS } from "@config/index";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { findPublishedPage } from "@/lib/seo/pages";
import { siteUrl } from "@/lib/paths";
import {
  buildBreadcrumbJsonLd,
  buildItemListJsonLd,
  buildLocalBusinessJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";

interface RouteParams {
  vertical: string;
  location: string;
}

// Static export: enumerate the pages to pre-render at build time. In
// production this is driven by the `page` table (only demand-backed,
// data-backed, page-readiness-passing pages are emitted). Seeded here with
// the gardeners × Manchester wedge.
export function generateStaticParams(): RouteParams[] {
  return [{ vertical: "gardeners", location: "manchester" }];
}

export function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Metadata {
  const vertical = VERTICALS[params.vertical];
  const name = vertical?.name ?? params.vertical;
  const place =
    params.location.charAt(0).toUpperCase() + params.location.slice(1);
  const path = `/${params.vertical}/${params.location}/`;
  return buildPageMetadata({
    title: `Best ${name} in ${place}`,
    description: `The top-rated ${name.toLowerCase()} in ${place}, ranked honestly by our Quality Score from real reviews, verified credentials and portfolio quality.`,
    path,
    modifiedTime: findPublishedPage(path)?.lastModified,
  });
}

function titleCase(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function formatDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? undefined
    : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

export default function Page({ params }: { params: RouteParams }) {
  const vertical = VERTICALS[params.vertical];
  const name = vertical?.name ?? params.vertical;
  const place = titleCase(params.location);
  const path = `/${params.vertical}/${params.location}/`;
  const published = findPublishedPage(path);

  // Build the page's JSON-LD @graph from the SAME shortlist the UI renders, so
  // the machine-readable answer (breadcrumb + ranked ItemList + the top
  // business as a LocalBusiness with its aggregate rating) mirrors the page.
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    { name: `${name} in ${place}`, url: siteUrl(path) },
  ]);

  const itemList = buildItemListJsonLd(
    SHORTLIST.map((b) => ({
      name: b.name,
      url: siteUrl(`${path}${businessSlug(b.name)}/`),
    })),
  );

  const top = SHORTLIST[0];
  const localBusiness = top
    ? buildLocalBusinessJsonLd({
        url: siteUrl(`${path}${businessSlug(top.name)}/`),
        name: top.name,
        description: `${top.name} — top-ranked ${name.toLowerCase()} in ${place} by the LocalLens Quality Score.`,
        areaServed: place,
        rating: { ratingValue: top.rating, reviewCount: top.reviewCount },
        dateModified: published?.lastModified,
      })
    : undefined;

  const graph = [breadcrumb, itemList, ...(localBusiness ? [localBusiness] : [])];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdGraph(graph) }}
      />
      <LocationPage
        vertical={params.vertical}
        location={params.location}
        lastUpdatedLabel={formatDate(published?.lastModified)}
      />
    </>
  );
}
