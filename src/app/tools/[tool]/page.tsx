import type { Metadata } from "next";
import { CostEstimatorView } from "@/views/tools/CostEstimatorView";
import { ComparatorView } from "@/views/tools/ComparatorView";
import { VERTICALS } from "@config/index";
import { buildPriceRangeJsonLd, jsonLdScript } from "@/lib/tools/jsonld";
import { estimateRange, DEFAULT_SIZE, DEFAULT_SCOPE } from "@/lib/tools/pricing";

interface RouteParams {
  tool: string;
}

type ToolKind = "estimator" | "comparator";

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
  if (!def) return { title: "Tool | LocalLens" };

  const name = VERTICALS[def.vertical]?.name ?? def.vertical;
  const placeName = place(def.location);

  if (def.kind === "estimator") {
    return {
      title: `${name} cost estimator — ${placeName} | LocalLens`,
      description: `Estimate what a ${name.toLowerCase().replace(/s$/, "")} costs in ${placeName} by garden size and job type, using typical local price bands. Free, no signup.`,
    };
  }
  return {
    title: `Compare ${name.toLowerCase()} in ${placeName} | LocalLens`,
    description: `Side-by-side comparison of top-rated ${name.toLowerCase()} in ${placeName} across Quality Score, rating, portfolio, response time and price. Free, no signup.`,
  };
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
    default: {
      const _exhaustive: never = def.kind;
      return _exhaustive;
    }
  }
}
