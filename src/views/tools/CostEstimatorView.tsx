import { Suspense } from "react";
import { getVertical } from "@config/index";
import { gardeners } from "@config/verticals/gardeners";
import { formatGBP } from "@/lib/utils";
import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { FaqBlock } from "@/components/tools/FaqBlock";
import { CostEstimatorWidget } from "@/components/tools/CostEstimatorWidget";
import { ToolResultCta } from "@/components/tools/ToolResultCta";
import type { Candidate, RouterContext } from "@/lib/revenue-router";
import type { FaqItem } from "@/lib/tools/jsonld";
import { DEFAULT_SIZE, DEFAULT_SCOPE, estimateRange } from "@/lib/tools/pricing";

const FAQS: FaqItem[] = [
  {
    question: "How much does a gardener cost in Manchester?",
    answer:
      "Most Manchester gardeners charge £40–£75 for a small garden tidy and £80–£160 for a typical back garden visit. Larger jobs like clearance or landscaping run higher. Use the estimator above to get a range for your garden size and job type.",
  },
  {
    question: "Do gardeners charge by the hour or per job?",
    answer:
      "Both. Routine maintenance is often priced per visit, while clearance and landscaping are usually quoted per job after a site visit. Hourly rates in Manchester typically fall between £25 and £45 per gardener.",
  },
  {
    question: "What affects the price most?",
    answer:
      "Garden size and job scope are the biggest drivers, followed by access, green-waste removal and how overgrown the space is. Landscaping and redesign cost several times more than routine maintenance.",
  },
  {
    question: "Is this estimate a quote?",
    answer:
      "No. It is a guide based on typical local price bands to help you budget. Always get a written quote from a verified gardener before booking.",
  },
];

/**
 * Server-rendered estimator page. The answer-first block, methodology, FAQ +
 * JSON-LD and ending CTA all render into the static HTML (AEO/crawlable). Only
 * the interactive inputs + live range hydrate as a client island, which also
 * encodes its state in the URL so results are shareable.
 */
export function CostEstimatorView({
  vertical = "gardeners",
  location = "manchester",
}: {
  vertical?: string;
  location?: string;
}) {
  const config = getVertical(vertical) ?? gardeners;
  const inputs = config.tools.calculator?.inputs ?? [];
  const placeName = location.charAt(0).toUpperCase() + location.slice(1);

  // Static HTML carries the default (no-query) estimate as the answer-first fact.
  const range = estimateRange(DEFAULT_SIZE, DEFAULT_SCOPE);

  const baseContext: Omit<RouterContext, "slot"> = {
    pageType: "tool",
    intentStage: "compare",
    intentValue: "high",
    device: "mobile",
    verticalSlug: config.slug,
    geoTier: 1,
    hasClaimedOperators: true,
    consent: { analytics: true, marketing: true },
    answerAlreadyRendered: true,
    slotIsOrganicList: false,
    featuredAboveFoldCount: 0,
  };

  const candidates: Candidate[] = [
    {
      rail: "lead",
      ref: "lead-slot",
      expectedValue: 0.45,
      relevance: 1,
      featured: false,
      label: `Get free quotes from top-rated ${config.name.toLowerCase()}`,
    },
    {
      rail: "affiliate",
      ref: "offer-liability",
      expectedValue: 0.4,
      relevance: 0.66,
      featured: false,
      label: "Compare cover",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <AnswerBlock
        heading={`${config.name} cost estimator — ${placeName}`}
        answer={`A typical back garden maintenance visit in ${placeName} costs ${formatGBP(range.low)}–${formatGBP(range.high)}. Adjust the garden size and job type below for a tailored range. This is a budgeting guide, not a quote — always confirm with a verified gardener.`}
        stat={{
          label: `Typical range: ${formatGBP(range.low)}–${formatGBP(range.high)} for a standard visit`,
          source: "LocalLens price bands",
          date: "Jun 2026",
        }}
      />

      <Suspense fallback={null}>
        <CostEstimatorWidget inputs={inputs} placeName={placeName} />
      </Suspense>

      <section
        aria-label="How this is calculated"
        className="rounded-lg border bg-card p-5 text-sm text-muted-foreground"
      >
        <h2 className="font-display text-base font-semibold text-foreground">
          How this is calculated
        </h2>
        <p className="mt-2 max-w-prose">
          We start from typical one-off price bands by garden size, apply a job-type
          modifier (maintenance ×1 up to landscaping ×3.2) and a local cost-of-living
          factor for {placeName}, then round to the nearest £5. Bands reflect typical
          local quotes and are a budgeting guide, not a fixed price.
        </p>
        <p className="mt-2">
          <span className="font-medium text-foreground">Source:</span> LocalLens
          aggregated price bands, June 2026.
        </p>
      </section>

      {/* Ending CTA: the router decides lead vs affiliate vs nothing. */}
      <ToolResultCta
        context={baseContext}
        policy={config.routerPolicy}
        candidates={candidates}
        keywords={["gardener", "quotes", "insurance", "maintenance"]}
      />

      <FaqBlock items={FAQS} />
    </main>
  );
}
