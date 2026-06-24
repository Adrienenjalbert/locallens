import { Star } from "lucide-react";
import { getVertical } from "@config/index";
import { gardeners } from "@config/verticals/gardeners";
import { AnswerBlock } from "@/components/directory/AnswerBlock";
import { Badge } from "@/components/ui/primitives";
import {
  ComparatorTable,
  QualityScoreCell,
  type ComparatorColumn,
  type ComparatorCriterion,
} from "@/components/tools/ComparatorTable";
import { FaqBlock } from "@/components/tools/FaqBlock";
import { ToolResultCta } from "@/components/tools/ToolResultCta";
import type { Candidate, RouterContext } from "@/lib/revenue-router";
import type { FaqItem } from "@/lib/tools/jsonld";

interface CompareBusiness {
  id: string;
  name: string;
  qualityScore: number;
  rating: number;
  reviewCount: number;
  portfolio: number; // number of portfolio projects
  responseHours: number; // typical first-response time
  priceBand: "£" | "££" | "£££";
}

// Demo records (in production: golden records for the page's locality).
const BUSINESSES: CompareBusiness[] = [
  {
    id: "greenthumb-gardens",
    name: "GreenThumb Gardens",
    qualityScore: 91,
    rating: 4.9,
    reviewCount: 412,
    portfolio: 48,
    responseHours: 2,
    priceBand: "£££",
  },
  {
    id: "urban-roots",
    name: "Urban Roots",
    qualityScore: 84,
    rating: 4.7,
    reviewCount: 188,
    portfolio: 22,
    responseHours: 4,
    priceBand: "££",
  },
  {
    id: "petal-and-spade",
    name: "Petal & Spade",
    qualityScore: 78,
    rating: 4.8,
    reviewCount: 96,
    portfolio: 31,
    responseHours: 6,
    priceBand: "£",
  },
];

const PRICE_BAND_LABEL: Record<CompareBusiness["priceBand"], string> = {
  "£": "Budget-friendly",
  "££": "Mid-range",
  "£££": "Premium",
};

const FAQS: FaqItem[] = [
  {
    question: "How are these gardeners compared?",
    answer:
      "Each is scored on the LocalLens Quality Score (real reviews, portfolio, verification, completeness and data confidence), star rating, portfolio depth, typical response time and price band. The top pick has the highest overall Quality Score.",
  },
  {
    question: "Which gardener should I choose?",
    answer:
      "Pick the highest Quality Score for overall confidence, the fastest responder if your job is urgent, or the lowest price band if budget is the priority. The summary above flags the best option for each.",
  },
  {
    question: "Is the cheapest option always worse?",
    answer:
      "No. A lower price band often reflects smaller overheads, not lower quality — check the Quality Score and reviews. Petal & Spade, for example, is budget-friendly yet highly rated.",
  },
];

/**
 * Server-rendered comparator page. Answer-first block, best-for summary, the
 * side-by-side table, methodology and FAQ + JSON-LD all render into the static
 * HTML (AEO/crawlable). The comparison itself is the shareable, linkable
 * artifact. The ending CTA hydrates as a client island.
 */
export function ComparatorView({
  vertical = "gardeners",
  location = "manchester",
}: {
  vertical?: string;
  location?: string;
}) {
  const config = getVertical(vertical) ?? gardeners;
  const criteriaKeys = config.tools.comparator?.criteria ?? [];
  const placeName = location.charAt(0).toUpperCase() + location.slice(1);

  const selected = BUSINESSES;

  const bestOverall = [...selected].sort((a, b) => b.qualityScore - a.qualityScore)[0];
  const fastest = [...selected].sort((a, b) => a.responseHours - b.responseHours)[0];
  const bestValue = [...selected].sort(
    (a, b) => a.priceBand.length - b.priceBand.length || b.rating - a.rating,
  )[0];

  const columns: ComparatorColumn[] = selected.map((b) => ({
    id: b.id,
    name: b.name,
    highlight: b.id === bestOverall.id,
  }));

  const allCriteria: ComparatorCriterion<CompareBusiness>[] = [
    {
      key: "quality_score",
      label: "Quality Score",
      hint: "0–100, our overall trust signal",
      render: (b) => <QualityScoreCell score={b.qualityScore} />,
    },
    {
      key: "rating",
      label: "Rating",
      render: (b) => (
        <span className="inline-flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-warning text-warning" aria-hidden />
          <span className="font-medium">{b.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">({b.reviewCount})</span>
        </span>
      ),
    },
    {
      key: "portfolio",
      label: "Portfolio",
      hint: "Completed projects on file",
      render: (b) => <span>{b.portfolio} projects</span>,
    },
    {
      key: "response",
      label: "Response time",
      render: (b) => <span>~{b.responseHours}h typical</span>,
    },
    {
      key: "price_band",
      label: "Price band",
      render: (b) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-medium text-foreground">{b.priceBand}</span>
          <span className="text-muted-foreground">{PRICE_BAND_LABEL[b.priceBand]}</span>
        </span>
      ),
    },
  ];

  // Render criteria in the order the vertical config declares (config-driven).
  const criteria =
    criteriaKeys.length > 0
      ? (criteriaKeys
          .map((key) => allCriteria.find((c) => c.key === key))
          .filter(Boolean) as ComparatorCriterion<CompareBusiness>[])
      : allCriteria;

  const baseContext: Omit<RouterContext, "slot"> = {
    pageType: "compare",
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
      expectedValue: 0.5,
      relevance: 1,
      featured: false,
      label: `Get free quotes from these ${config.name.toLowerCase()}`,
    },
    {
      rail: "affiliate",
      ref: "offer-liability",
      expectedValue: 0.38,
      relevance: 0.6,
      featured: false,
      label: "Compare cover",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <AnswerBlock
        heading={`Compare ${config.name.toLowerCase()} in ${placeName}`}
        answer={`${bestOverall.name} is the top overall pick with a Quality Score of ${bestOverall.qualityScore}/100. ${fastest.name} responds fastest (~${fastest.responseHours}h) and ${bestValue.name} offers the best value (${PRICE_BAND_LABEL[bestValue.priceBand].toLowerCase()}). Compare all criteria side by side below.`}
        stat={{
          label: `${selected.length} verified ${config.name.toLowerCase()} compared`,
          source: "LocalLens data",
          date: "Jun 2026",
        }}
      />

      <section aria-label="Best for" className="grid gap-3 sm:grid-cols-3">
        <SummaryPick title="Best overall" name={bestOverall.name} tone="primary" />
        <SummaryPick
          title="Best for speed"
          name={`${fastest.name} · ~${fastest.responseHours}h`}
          tone="success"
        />
        <SummaryPick
          title="Best for value"
          name={`${bestValue.name} · ${bestValue.priceBand}`}
          tone="muted"
        />
      </section>

      <ComparatorTable
        caption={`Comparison of ${config.name.toLowerCase()} in ${placeName} across quality, rating, portfolio, response time and price`}
        columns={columns}
        criteria={criteria}
        businesses={selected}
      />

      <section
        aria-label="How this is calculated"
        className="rounded-lg border bg-card p-5 text-sm text-muted-foreground"
      >
        <h2 className="font-display text-base font-semibold text-foreground">
          How this comparison works
        </h2>
        <p className="mt-2 max-w-prose">
          Businesses are compared on the LocalLens Quality Score and four supporting
          signals. The top pick is the highest Quality Score; speed and value picks use
          response time and price band. Figures are illustrative golden-record values.
        </p>
        <p className="mt-2">
          <span className="font-medium text-foreground">Source:</span> LocalLens golden
          records, June 2026.
        </p>
      </section>

      {/* Ending CTA: router decides lead vs affiliate vs nothing. */}
      <ToolResultCta
        context={baseContext}
        policy={config.routerPolicy}
        candidates={candidates}
        keywords={["gardener", "quotes", "compare", "insurance"]}
      />

      <FaqBlock items={FAQS} />
    </main>
  );
}

function SummaryPick({
  title,
  name,
  tone,
}: {
  title: string;
  name: string;
  tone: "primary" | "success" | "muted";
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <Badge tone={tone}>{title}</Badge>
      <p className="mt-2 font-display text-base font-semibold text-foreground">{name}</p>
    </div>
  );
}
