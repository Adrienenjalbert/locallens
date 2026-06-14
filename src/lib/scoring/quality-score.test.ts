import { describe, it, expect } from "vitest";
import {
  computeQualityScore,
  bayesianRating,
  recencyDecay,
  volumeCredit,
  type BusinessSignals,
} from "./quality-score";
import { computePageReadiness } from "./page-readiness";
import { gardeners } from "@config/verticals/gardeners";

const weights = gardeners.scoreWeights;

function signals(overrides: Partial<BusinessSignals> = {}): BusinessSignals {
  return {
    review: {
      rating: 4.7,
      reviewCount: 200,
      daysSinceLatest: 10,
      crossSourceConsistency: 0.9,
    },
    portfolioItems: 8,
    portfolioDaysSinceLatest: 30,
    claimed: true,
    verifiedContact: true,
    verifiedCredentials: 2,
    completeness: 0.9,
    dataConfidence: 0.9,
    ...overrides,
  };
}

describe("bayesianRating (fairness device)", () => {
  it("pulls few-review businesses toward the prior", () => {
    const fewReviews = bayesianRating(4.9, 3);
    const manyReviews = bayesianRating(4.7, 400);
    // The 4.7 with 400 reviews must beat the 4.9 with 3 reviews.
    expect(manyReviews).toBeGreaterThan(fewReviews);
  });

  it("returns a value in 0..1", () => {
    expect(bayesianRating(5, 1000)).toBeLessThanOrEqual(1);
    expect(bayesianRating(0, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe("recencyDecay & volumeCredit", () => {
  it("decays to ~0.5 at the half-life", () => {
    expect(recencyDecay(180, 180)).toBeCloseTo(0.5, 1);
  });
  it("volume credit is monotonic and capped at 1", () => {
    expect(volumeCredit(10)).toBeLessThan(volumeCredit(100));
    expect(volumeCredit(100000)).toBeLessThanOrEqual(1);
  });
});

describe("computeQualityScore", () => {
  it("produces an explainable breakdown summing to the score", () => {
    const result = computeQualityScore(signals(), weights);
    const sum = Object.values(result.components).reduce(
      (acc, c) => acc + c.contribution,
      0,
    );
    expect(result.score).toBeCloseTo(Math.round(sum * 100) / 100, 1);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("a strong, verified, well-reviewed business scores Top rated", () => {
    const result = computeQualityScore(signals(), weights);
    expect(result.tier).toBe("top_rated");
  });

  it("an unclaimed, sparse business scores lower and is not top rated", () => {
    const weak = computeQualityScore(
      signals({
        review: { rating: 3.8, reviewCount: 4, daysSinceLatest: 400, crossSourceConsistency: 0.5 },
        portfolioItems: 0,
        claimed: false,
        verifiedContact: false,
        verifiedCredentials: 0,
        completeness: 0.3,
        dataConfidence: 0.4,
      }),
      weights,
    );
    const strong = computeQualityScore(signals(), weights);
    expect(weak.score).toBeLessThan(strong.score);
    expect(weak.tier).not.toBe("top_rated");
  });

  it("penalises low data confidence", () => {
    const high = computeQualityScore(signals({ dataConfidence: 1 }), weights);
    const low = computeQualityScore(signals({ dataConfidence: 0.1 }), weights);
    expect(low.score).toBeLessThan(high.score);
  });
});

describe("computePageReadiness (affiliate-aware)", () => {
  it("holds a thin page with no affiliate match", () => {
    const r = computePageReadiness({
      hasRealPhotos: false,
      reviewCount: 0,
      hasHours: false,
      serviceCount: 0,
      hasContact: true,
      credentialCount: 0,
      affiliateMatch: false,
    });
    expect(r.publishable).toBe(false);
    expect(r.missingFields).toContain("photos");
  });

  it("can publish a thinner page when a strong affiliate match exists", () => {
    // Completeness here = reviews(0.25) + hours(0.1) + contact(0.15) = 0.50,
    // which sits BETWEEN the affiliate-assisted (0.40) and standard (0.55)
    // thresholds — so the affiliate match is the deciding factor.
    const inputs = {
      hasRealPhotos: false,
      reviewCount: 5,
      hasHours: true,
      serviceCount: 0,
      hasContact: true,
      credentialCount: 0,
      affiliateMatch: true,
    };
    const withAff = computePageReadiness(inputs);
    const withoutAff = computePageReadiness({ ...inputs, affiliateMatch: false });
    expect(withAff.completenessScore).toBeCloseTo(0.5, 2);
    expect(withAff.publishable).toBe(true);
    expect(withoutAff.publishable).toBe(false);
  });
});
