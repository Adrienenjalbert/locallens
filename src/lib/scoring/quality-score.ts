import type { ScoreWeights } from "@config/types";

// ── The LocalLens Quality Score ───────────────────────────────────────────
// Pure, dependency-free functions so the SAME logic runs in the Node front end
// (display, tests) AND the Deno ETL function (computation on load). Explainable
// by construction: every component is returned in the breakdown for the
// "Why ranked here" panel and for the CRISP-DM loop's audit trail.

export interface ReviewSignal {
  /** Cross-source average rating, 0..5. */
  rating: number;
  /** Total review count across sources. */
  reviewCount: number;
  /** Days since the most recent review (recency decay input). */
  daysSinceLatest: number;
  /** 0..1 agreement across sources (1 = sources agree). */
  crossSourceConsistency: number;
}

export interface BusinessSignals {
  review: ReviewSignal;
  /** Portfolio: count of real items + recency, for visual verticals. */
  portfolioItems: number;
  portfolioDaysSinceLatest: number;
  /** Verification flags. */
  claimed: boolean;
  verifiedContact: boolean;
  verifiedCredentials: number;
  /** 0..1 profile completeness. */
  completeness: number;
  /** 0..1 data confidence from the ETL pipeline. */
  dataConfidence: number;
}

export interface ScoreComponent {
  /** Raw 0..1 sub-score before weighting. */
  value: number;
  /** Weight applied (from vertical config). */
  weight: number;
  /** value × weight × 100 contribution to the final score. */
  contribution: number;
}

export interface ScoreBreakdown {
  score: number; // 0..100
  components: Record<keyof ScoreWeights, ScoreComponent>;
  tier: "top_rated" | "verified" | "rising" | "listed";
  version: string;
}

export const SCORE_VERSION = "qs-v1";

/**
 * Bayesian-adjusted rating — the core fairness device. A 4.9 with 3 reviews
 * must not outrank a 4.7 with 400. We pull few-review businesses toward the
 * global prior mean `priorMean` with strength `priorStrength` (m). Returns 0..1.
 *   adjusted = (v·R + m·C) / (v + m)   then normalised /5
 */
export function bayesianRating(
  rating: number,
  reviewCount: number,
  priorMean = 4.2,
  priorStrength = 20,
): number {
  const v = Math.max(0, reviewCount);
  const adjusted =
    (v * rating + priorStrength * priorMean) / (v + priorStrength);
  return clamp01(adjusted / 5);
}

/** Exponential recency decay: 1.0 at 0 days → ~0.5 at `halfLifeDays`. */
export function recencyDecay(days: number, halfLifeDays = 180): number {
  if (days <= 0) return 1;
  return clamp01(Math.pow(0.5, days / halfLifeDays));
}

/** Diminishing-returns volume credit: more reviews help, but with a cap. */
export function volumeCredit(reviewCount: number, saturation = 100): number {
  return clamp01(Math.log10(1 + reviewCount) / Math.log10(1 + saturation));
}

function reviewSubScore(r: ReviewSignal): number {
  const base = bayesianRating(r.rating, r.reviewCount);
  const recency = recencyDecay(r.daysSinceLatest);
  const volume = volumeCredit(r.reviewCount);
  // Blend: quality-adjusted rating is primary, modulated by recency + volume +
  // cross-source agreement. Each factor in 0..1; weighted blend stays in 0..1.
  return clamp01(
    base * 0.55 +
      base * recency * 0.15 +
      volume * 0.2 +
      r.crossSourceConsistency * 0.1,
  );
}

function portfolioSubScore(items: number, daysSinceLatest: number): number {
  if (items <= 0) return 0;
  const depth = clamp01(Math.log10(1 + items) / Math.log10(1 + 12));
  const recency = recencyDecay(daysSinceLatest, 365);
  return clamp01(depth * 0.7 + depth * recency * 0.3);
}

function verificationSubScore(s: BusinessSignals): number {
  let v = 0;
  if (s.claimed) v += 0.4;
  if (s.verifiedContact) v += 0.3;
  v += clamp01(s.verifiedCredentials / 3) * 0.3;
  return clamp01(v);
}

function tierFor(score: number): ScoreBreakdown["tier"] {
  if (score >= 85) return "top_rated";
  if (score >= 70) return "verified";
  if (score >= 50) return "rising";
  return "listed";
}

/** Compute the explainable 0–100 Quality Score from signals + vertical weights. */
export function computeQualityScore(
  signals: BusinessSignals,
  weights: ScoreWeights,
): ScoreBreakdown {
  const raw: Record<keyof ScoreWeights, number> = {
    review_quality: reviewSubScore(signals.review),
    portfolio_quality: portfolioSubScore(
      signals.portfolioItems,
      signals.portfolioDaysSinceLatest,
    ),
    verification: verificationSubScore(signals),
    completeness: clamp01(signals.completeness),
    data_confidence: clamp01(signals.dataConfidence),
  };

  const components = {} as Record<keyof ScoreWeights, ScoreComponent>;
  let score = 0;
  (Object.keys(raw) as (keyof ScoreWeights)[]).forEach((key) => {
    const value = raw[key];
    const weight = weights[key] ?? 0;
    const contribution = value * weight * 100;
    components[key] = { value, weight, contribution };
    score += contribution;
  });

  const rounded = Math.round(clamp(score, 0, 100) * 100) / 100;
  return {
    score: rounded,
    components,
    tier: tierFor(rounded),
    version: SCORE_VERSION,
  };
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
