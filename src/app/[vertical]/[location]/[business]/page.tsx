import type { Metadata } from "next";
import { ProfileView } from "@/views/ProfileView";
import { VERTICALS } from "@config/index";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { findPublishedPage } from "@/lib/seo/pages";
import { siteUrl } from "@/lib/paths";
import { formatMonthYear, titleCaseSlug } from "@/lib/format";
import {
  buildBreadcrumbJsonLd,
  buildLocalBusinessJsonLd,
  jsonLdGraph,
} from "@/lib/tools/jsonld";

interface RouteParams {
  vertical: string;
  location: string;
  business: string;
}

// Static export: enumerate the business profile pages to pre-render at build
// time. In production this is driven by the `page` table (one published row per
// readiness-passing business profile). Seeded here with the gardeners ×
// Manchester × GreenThumb Gardens wedge so the route builds under `export`.
export function generateStaticParams(): RouteParams[] {
  return [
    {
      vertical: "gardeners",
      location: "manchester",
      business: "greenthumb-gardens",
    },
  ];
}

export function generateMetadata({ params }: { params: RouteParams }): Metadata {
  const vertical = VERTICALS[params.vertical];
  const verticalName = (vertical?.name ?? params.vertical).toLowerCase();
  const businessName = titleCaseSlug(params.business);
  const place = titleCaseSlug(params.location);
  const path = `/${params.vertical}/${params.location}/${params.business}/`;
  return buildPageMetadata({
    title: `${businessName} — ${verticalName} in ${place}`,
    description: `${businessName} is a ${verticalName.replace(/s$/, "")} in ${place}, ranked honestly by the LocalLens Quality Score from real reviews, verified credentials and portfolio quality. See why they rank where they do, or claim this listing.`,
    path,
    type: "article",
    modifiedTime: findPublishedPage(path)?.lastModified,
  });
}

export default function Page({ params }: { params: RouteParams }) {
  const vertical = VERTICALS[params.vertical];
  const verticalName = (vertical?.name ?? params.vertical).toLowerCase();
  const businessName = titleCaseSlug(params.business);
  const place = titleCaseSlug(params.location);
  const path = `/${params.vertical}/${params.location}/${params.business}/`;
  const published = findPublishedPage(path);

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "Home", url: siteUrl("/") },
    {
      name: `${vertical?.name ?? params.vertical} in ${place}`,
      url: siteUrl(`/${params.vertical}/${params.location}/`),
    },
    { name: businessName, url: siteUrl(path) },
  ]);

  // Rating mirrors the demo signals ProfileView renders; in production both read
  // the same golden record. LocalBusiness + aggregateRating is what makes this
  // profile eligible for local AI-answer citation.
  const localBusiness = buildLocalBusinessJsonLd({
    url: siteUrl(path),
    name: businessName,
    description: `${businessName} is a ${verticalName.replace(/s$/, "")} in ${place}, ranked by the LocalLens Quality Score from real reviews, verified credentials and portfolio quality.`,
    areaServed: place,
    priceRange: "££",
    rating: { ratingValue: 4.9, reviewCount: 412 },
    dateModified: published?.lastModified,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdGraph([breadcrumb, localBusiness]),
        }}
      />
      <ProfileView
        vertical={params.vertical}
        location={params.location}
        business={params.business}
        lastUpdatedLabel={formatMonthYear(published?.lastModified)}
      />
    </>
  );
}
