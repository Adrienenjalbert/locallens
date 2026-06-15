// Opportunity / Market-Entry model (profit-aware pSEO) — the pure, explainable
// scoring source of truth (mirrored later into a Deno copy for the etl-keywords
// Edge function, like quality-score). Implements docs/01-DATA-SCIENCE.md §4:
//
//   opportunity = volume × intent_weight × competition_gap   (demand)
//               × affiliate_rpm_potential                    (monetisable even with no supply)
//               × supply_readiness                           (enough confident data to be useful)
//
// It changes two decisions: (1) which pages to BUILD (queue a `page` row only
// above threshold AND with sufficient page-readiness), and (2) which
// vertical×metro MARKETS to enter (aggregate opportunity across a market). A
// market with high affiliate-RPM potential can be entered with ZERO operators,
// funded by the affiliate rail, before any supply outreach.
//
// Every output stores its inputs (`breakdown`) so any score is auditable — for
// trust and for the CRISP-DM loop.

/** Funnel stage of the query the page would target. Drives intent weight. */
export type IntentStage = "research" | "compare" | "hire-now";

/** How commercially valuable the query is (independent of stage). */
export type IntentValue = "low" | "medium" | "high";

export interface OpportunityInputs {
  /** Monthly search volume for the keyword (e.g. from Keyword Planner / GSC impressions). */
  volume: number;
  intentStage: IntentStage;
  intentValue: IntentValue;
  /**
   * Competition gap in [0,1]: how winnable the SERP is. 1 = wide open (weak/forum
   * results, no dominant brand); 0 = locked up by strong incumbents. For Google
   * AI citation we need top-~20 organic ranking, so a real gap is the gate.
   */
  competitionGap: number;
  /**
   * Affiliate RPM potential in [0,1]: expected revenue-per-1k-sessions from the
   * affiliate rail for this intent, normalised. Lets a page earn day-one with no
   * operators (the cold-start unlock).
   */
  affiliateRpmPotential: number;
  /**
   * Supply readiness in [0,1]: do we have enough confident data (operators,
   * reviews, golden records) to make the page genuinely useful?
   */
  supplyReadiness: number;
}

export interface OpportunityComponent {
  value: number;
  weight: number;
  /** Multiplicative contribution to the final 0..1 score. */
  factor: number;
}

export interface OpportunityResult {
  /** Final opportunity score in [0,1]. */
  score: number;
  /** Whether this clears the build threshold (page should be queued). */
  shouldBuild: boolean;
  breakdown: Record<keyof OpportunityInputs, OpportunityComponent>;
}

// Intent weights: a "hire-now, high-value" query is worth far more than a
// "research, low-value" one. Stage and value combine multiplicatively, then are
// normalised to [0,1] by the max possible product.
const STAGE_WEIGHT: Record<IntentStage, number> = {
  research: 0.4,
  compare: 0.7,
  "hire-now": 1.0,
};

const VALUE_WEIGHT: Record<IntentValue, number> = {
  low: 0.4,
  medium: 0.7,
  high: 1.0,
};

const MAX_INTENT = STAGE_WEIGHT["hire-now"] * VALUE_WEIGHT.high; // 1.0

/**
 * Normalise raw monthly volume to [0,1] with diminishing returns. Local-intent
 * keywords rarely exceed a few thousand searches/mo, so we saturate gently:
 * ~500/mo ≈ 0.5, ~2000/mo ≈ 0.8. Avoids a single huge head term dominating.
 */
export function normaliseVolume(volume: number): number {
  if (volume <= 0) return 0;
  const HALF_SATURATION = 500; // volume at which we reach 0.5
  return volume / (volume + HALF_SATURATION);
}

export function intentWeight(stage: IntentStage, value: IntentValue): number {
  return (STAGE_WEIGHT[stage] * VALUE_WEIGHT[value]) / MAX_INTENT;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

// Build-queue threshold on the final opportunity score. Because the score is the
// product of five [0,1] factors, realistic values compress low: a strong local
// hire-now page lands ~0.12–0.16, a near-perfect one ~0.5. 0.08 cleanly
// separates genuine commercial location/tool pages from marginal research/guide
// queries. Tunable via the loop (promote a winning threshold into config).
export const BUILD_THRESHOLD = 0.08;

export function computeOpportunity(
  inputs: OpportunityInputs,
): OpportunityResult {
  const volume = normaliseVolume(inputs.volume);
  const intent = intentWeight(inputs.intentStage, inputs.intentValue);
  const competitionGap = clamp01(inputs.competitionGap);
  const affiliate = clamp01(inputs.affiliateRpmPotential);
  const supply = clamp01(inputs.supplyReadiness);

  // Multiplicative: a zero on any axis (no demand, locked SERP, no way to earn,
  // no usable data) correctly zeroes the opportunity. This is the profit-aware
  // filter — demand alone is not enough.
  const score =
    Math.round(volume * intent * competitionGap * affiliate * supply * 1000) /
    1000;

  return {
    score,
    shouldBuild: score >= BUILD_THRESHOLD,
    breakdown: {
      volume: { value: inputs.volume, weight: 1, factor: volume },
      intentStage: { value: STAGE_WEIGHT[inputs.intentStage], weight: 1, factor: intent },
      intentValue: { value: VALUE_WEIGHT[inputs.intentValue], weight: 1, factor: intent },
      competitionGap: { value: competitionGap, weight: 1, factor: competitionGap },
      affiliateRpmPotential: { value: affiliate, weight: 1, factor: affiliate },
      supplyReadiness: { value: supply, weight: 1, factor: supply },
    },
  };
}

export interface MarketEntryInputs {
  vertical: string;
  metro: string;
  /** Per-keyword opportunity inputs that make up this market. */
  keywords: OpportunityInputs[];
}

export interface MarketEntryResult {
  vertical: string;
  metro: string;
  /** Aggregate market-entry score in [0,1] (mean of keyword opportunities). */
  entryScore: number;
  buildableKeywords: number;
  totalKeywords: number;
  /**
   * Can this market be entered with ZERO operators, funded by affiliate alone?
   * True when affiliate-RPM potential carries the market even where supply is thin.
   */
  affiliateFundable: boolean;
}

/**
 * Aggregate keyword opportunities into a single market-entry score. This is the
 * strategist's market-entry filter: a market with high affiliate-RPM potential
 * can be validated before any supply exists.
 */
export function computeMarketEntry(
  inputs: MarketEntryInputs,
): MarketEntryResult {
  const results = inputs.keywords.map(computeOpportunity);
  const total = results.length || 1;
  const entryScore =
    Math.round(
      (results.reduce((sum, r) => sum + r.score, 0) / total) * 1000,
    ) / 1000;

  // "Affiliate-fundable" = the demand×winnability×affiliate signal is healthy
  // on average even if we ignore supply readiness (treat supply as fully ready).
  const affiliateOnly = inputs.keywords.map((k) =>
    computeOpportunity({ ...k, supplyReadiness: 1 }).score,
  );
  const affiliateScore =
    affiliateOnly.reduce((sum, s) => sum + s, 0) / total;

  return {
    vertical: inputs.vertical,
    metro: inputs.metro,
    entryScore,
    buildableKeywords: results.filter((r) => r.shouldBuild).length,
    totalKeywords: results.length,
    affiliateFundable: affiliateScore >= BUILD_THRESHOLD,
  };
}
