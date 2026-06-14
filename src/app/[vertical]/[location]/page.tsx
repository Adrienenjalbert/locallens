import type { Metadata } from "next";
import { LocationPage } from "@/views/LocationPage";
import { VERTICALS } from "@config/index";

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
  return {
    title: `Best ${name} in ${place} | LocalLens`,
    description: `The top-rated ${name.toLowerCase()} in ${place}, ranked honestly by our Quality Score from real reviews, verified credentials and portfolio quality.`,
  };
}

export default function Page({ params }: { params: RouteParams }) {
  return <LocationPage vertical={params.vertical} location={params.location} />;
}
