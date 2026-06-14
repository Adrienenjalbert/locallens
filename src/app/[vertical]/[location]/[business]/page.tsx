import type { Metadata } from "next";
import { ProfileView } from "@/views/ProfileView";
import { VERTICALS } from "@config/index";

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

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function generateMetadata({
  params,
}: {
  params: RouteParams;
}): Metadata {
  const vertical = VERTICALS[params.vertical];
  const verticalName = (vertical?.name ?? params.vertical).toLowerCase();
  const businessName = titleCaseSlug(params.business);
  const place = titleCaseSlug(params.location);
  return {
    title: `${businessName} — ${verticalName} in ${place} | LocalLens`,
    description: `${businessName} is a ${verticalName.replace(/s$/, "")} in ${place}, ranked honestly by the LocalLens Quality Score from real reviews, verified credentials and portfolio quality. See why they rank where they do, or claim this listing.`,
  };
}

export default function Page({ params }: { params: RouteParams }) {
  return (
    <ProfileView
      vertical={params.vertical}
      location={params.location}
      business={params.business}
    />
  );
}
