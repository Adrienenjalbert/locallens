import type { Metadata } from "next";
import { CostEstimatorView } from "@/views/tools/CostEstimatorView";
import { ComparatorView } from "@/views/tools/ComparatorView";
import { ReviewEmailSetupView } from "@/views/tools/ReviewEmailSetupView";
import { VERTICALS } from "@config/index";
import { buildPriceRangeJsonLd, jsonLdScript } from "@/lib/tools/jsonld";
import { estimateRange, DEFAULT_SIZE, DEFAULT_SCOPE } from "@/lib/tools/pricing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { findPublishedPage } from "@/lib/seo/pages";

interface RouteParams {
  tool: string;
}

type ToolKind = "estimator" | "comparator" | "review-email-setup";

interface ToolDef {
  kind: ToolKind;
  vertical: string;
  location: string;
}

// Map of the statically-exported tool slugs to what they render. In production
// this is driven by the `page` table (one row per demand-backed tool page).
const TOOLS: Record<string, ToolDef> = {
  "gardeners-cost-manchester": {
    kind: "estimator",
    vertical: "gardeners",
    location: "manchester",
  },
  "gardeners-vs": {
    kind: "comparator",
    vertical: "gardeners",
    location: "manchester",
  },
  "review-email-setup": {
    kind: "review-email-setup",
    vertical: "gardeners",
    location: "manchester",
  },
};

// Static export: enumerate every tool page to pre-render at build time.
export function generateStaticParams(): RouteParams[] {
  return Object.keys(TOOLS).map((tool) => ({ tool }));
}

function place(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export function generateMetadata({ params }: { params: RouteParams }): Metadata {
  const def = TOOLS[params.tool];
  if (!def) return { title: "Tool" };

  const name = VERTICALS[def.vertical]?.name ?? def.vertical;
  const placeName = place(def.location);
  const path = `/tools/${params.tool}/`;
  const modifiedTime = findPublishedPage(path)?.lastModified;

  if (def.kind === "estimator") {
    return buildPageMetadata({
      title: `${name} cost estimator — ${placeName}`,
      description: `Estimate what a ${name.toLowerCase().replace(/s$/, "")} costs in ${placeName} by garden size and job type, using typical local price bands. Free, no signup.`,
      path,
      modifiedTime,
    });
  }
  if (def.kind === "review-email-setup") {
    return buildPageMetadata({
      title: "Free review-request email builder",
      description:
        "Build a ready-to-send Google review-request email with a clickable 5-star rating in 2 minutes. Happy customers go to Google, unhappy ones to a private form — fully compliant. Free, no signup.",
      path,
      modifiedTime,
    });
  }
  return buildPageMetadata({
    title: `Compare ${name.toLowerCase()} in ${placeName}`,
    description: `Side-by-side comparison of top-rated ${name.toLowerCase()} in ${placeName} across Quality Score, rating, portfolio, response time and price. Free, no signup.`,
    path,
    modifiedTime,
  });
}

export default function Page({ params }: { params: RouteParams }) {
  const def = TOOLS[params.tool];

  if (!def) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Tool not found
        </h1>
      </main>
    );
  }

  switch (def.kind) {
    case "estimator": {
      const name = VERTICALS[def.vertical]?.name ?? def.vertical;
      const placeName = place(def.location);
      // Seed the price-range JSON-LD with the default (no-query) estimate so the
      // statically-exported HTML carries machine-extractable pricing.
      const range = estimateRange(DEFAULT_SIZE, DEFAULT_SCOPE);
      const priceJsonLd = buildPriceRangeJsonLd({
        name: `${name} services in ${placeName}`,
        description: `Typical price range for ${name.toLowerCase()} in ${placeName}.`,
        currency: "GBP",
        lowPrice: range.low,
        highPrice: range.high,
        priceValidUntil: "2026-12-31",
      });
      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLdScript(priceJsonLd) }}
          />
          <CostEstimatorView vertical={def.vertical} location={def.location} />
        </>
      );
    }
    case "comparator":
      return <ComparatorView vertical={def.vertical} location={def.location} />;
    case "review-email-setup":
      return <ReviewEmailSetupView />;
    default: {
      const _exhaustive: never = def.kind;
      return _exhaustive;
    }
  }
}
