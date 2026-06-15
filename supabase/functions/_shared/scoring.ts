// Quality Score + page-readiness + Opportunity model — DENO copy for the ETL
// pipeline.
//
// ⚠️ KEEP IN SYNC with `src/lib/scoring/quality-score.ts`,
// `src/lib/scoring/page-readiness.ts` + `src/lib/scoring/opportunity.ts`. These
// are pure, dependency-free functions duplicated here because Deno (Edge
// Functions) and Node (Next front end + Vitest) can't share module-aliased
// imports cleanly. The Node copy is the unit-tested source of truth; this copy
// must match its algorithm. A keep-in-sync test
// (`src/lib/scoring/opportunity.sync.test.ts`) asserts the two agree.

export interface ScoreWeights {
  review_quality: number;
  portfolio_quality: number;
  verification: number;
  completeness: number;
  data_confidence: number;
}

export interface BusinessSignals {
  review: { rating: number; reviewCount: number; daysSinceLatest: number; crossSourceConsistency: number };
  portfolioItems: number;
  portfolioDaysSinceLatest: number;
  claimed: boolean;
  verifiedContact: boolean;
  verifiedCredentials: number;
  completeness: number;
  dataConfidence: number;
}

export const SCORE_VERSION = "qs-v1";

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const clamp01 = (n: number) => clamp(n, 0, 1);

export function bayesianRating(rating: number, reviewCount: number, priorMean = 4.2, priorStrength = 20): number {
  const v = Math.max(0, reviewCount);
  return clamp01((v * rating + priorStrength * priorMean) / (v + priorStrength) / 5);
}
export function recencyDecay(days: number, halfLifeDays = 180): number {
  return days <= 0 ? 1 : clamp01(Math.pow(0.5, days / halfLifeDays));
}
export function volumeCredit(reviewCount: number, saturation = 100): number {
  return clamp01(Math.log10(1 + reviewCount) / Math.log10(1 + saturation));
}

export function computeQualityScore(s: BusinessSignals, w: ScoreWeights) {
  const reviewSub = clamp01(
    bayesianRating(s.review.rating, s.review.reviewCount) * 0.55 +
      bayesianRating(s.review.rating, s.review.reviewCount) * recencyDecay(s.review.daysSinceLatest) * 0.15 +
      volumeCredit(s.review.reviewCount) * 0.2 +
      s.review.crossSourceConsistency * 0.1,
  );
  const depth = s.portfolioItems > 0 ? clamp01(Math.log10(1 + s.portfolioItems) / Math.log10(13)) : 0;
  const portfolioSub = s.portfolioItems > 0
    ? clamp01(depth * 0.7 + depth * recencyDecay(s.portfolioDaysSinceLatest, 365) * 0.3)
    : 0;
  let verif = 0;
  if (s.claimed) verif += 0.4;
  if (s.verifiedContact) verif += 0.3;
  verif += clamp01(s.verifiedCredentials / 3) * 0.3;

  const raw: ScoreWeights = {
    review_quality: reviewSub,
    portfolio_quality: portfolioSub,
    verification: clamp01(verif),
    completeness: clamp01(s.completeness),
    data_confidence: clamp01(s.dataConfidence),
  };

  const components: Record<string, { value: number; weight: number; contribution: number }> = {};
  let score = 0;
  for (const key of Object.keys(raw) as (keyof ScoreWeights)[]) {
    const value = raw[key];
    const weight = w[key] ?? 0;
    const contribution = value * weight * 100;
    components[key] = { value, weight, contribution };
    score += contribution;
  }
  const rounded = Math.round(clamp(score, 0, 100) * 100) / 100;
  const tier = rounded >= 85 ? "top_rated" : rounded >= 70 ? "verified" : rounded >= 50 ? "rising" : "listed";
  return { score: rounded, components, tier, version: SCORE_VERSION };
}

export interface ReadinessInputs {
  hasRealPhotos: boolean;
  reviewCount: number;
  hasHours: boolean;
  serviceCount: number;
  hasContact: boolean;
  credentialCount: number;
  affiliateMatch: boolean;
}
export function computePageReadiness(i: ReadinessInputs) {
  const W = { photos: 0.25, reviews: 0.25, hours: 0.1, services: 0.15, contact: 0.15, credentials: 0.1 };
  const missing: string[] = [];
  let score = 0;
  i.hasRealPhotos ? (score += W.photos) : missing.push("photos");
  i.reviewCount > 0 ? (score += W.reviews) : missing.push("reviews");
  i.hasHours ? (score += W.hours) : missing.push("hours");
  i.serviceCount > 0 ? (score += W.services) : missing.push("services");
  i.hasContact ? (score += W.contact) : missing.push("contact");
  i.credentialCount > 0 ? (score += W.credentials) : missing.push("credentials");
  const completenessScore = Math.round(score * 1000) / 1000;
  const threshold = i.affiliateMatch ? 0.4 : 0.55;
  return { completenessScore, missingFields: missing, affiliateMatch: i.affiliateMatch, publishable: completenessScore >= threshold };
}

// ── Opportunity / Market-Entry model (profit-aware pSEO) ──
// Mirror of src/lib/scoring/opportunity.ts. opportunity =
//   volume × intent_weight × competition_gap × affiliate_rpm_potential × supply_readiness

export type IntentStage = "research" | "compare" | "hire-now";
export type IntentValue = "low" | "medium" | "high";

export interface OpportunityInputs {
  volume: number;
  intentStage: IntentStage;
  intentValue: IntentValue;
  competitionGap: number;
  affiliateRpmPotential: number;
  supplyReadiness: number;
}

const STAGE_WEIGHT: Record<IntentStage, number> = { research: 0.4, compare: 0.7, "hire-now": 1.0 };
const VALUE_WEIGHT: Record<IntentValue, number> = { low: 0.4, medium: 0.7, high: 1.0 };
const MAX_INTENT = STAGE_WEIGHT["hire-now"] * VALUE_WEIGHT.high;

/** Build-queue threshold on the final opportunity score. KEEP IN SYNC. */
export const BUILD_THRESHOLD = 0.08;

export function normaliseVolume(volume: number): number {
  if (volume <= 0) return 0;
  const HALF_SATURATION = 500;
  return volume / (volume + HALF_SATURATION);
}

export function intentWeight(stage: IntentStage, value: IntentValue): number {
  return (STAGE_WEIGHT[stage] * VALUE_WEIGHT[value]) / MAX_INTENT;
}

export function computeOpportunity(inputs: OpportunityInputs) {
  const volume = normaliseVolume(inputs.volume);
  const intent = intentWeight(inputs.intentStage, inputs.intentValue);
  const competitionGap = clamp01(inputs.competitionGap);
  const affiliate = clamp01(inputs.affiliateRpmPotential);
  const supply = clamp01(inputs.supplyReadiness);
  const score =
    Math.round(volume * intent * competitionGap * affiliate * supply * 1000) / 1000;
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
