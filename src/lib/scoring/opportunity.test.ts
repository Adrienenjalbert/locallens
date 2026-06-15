import { describe, it, expect } from "vitest";
import {
  computeOpportunity,
  computeMarketEntry,
  normaliseVolume,
  intentWeight,
  BUILD_THRESHOLD,
  type OpportunityInputs,
} from "./opportunity";

function inputs(overrides: Partial<OpportunityInputs> = {}): OpportunityInputs {
  return {
    volume: 800,
    intentStage: "hire-now",
    intentValue: "high",
    competitionGap: 0.7,
    affiliateRpmPotential: 0.6,
    supplyReadiness: 0.8,
    ...overrides,
  };
}

describe("normaliseVolume", () => {
  it("is 0 for no volume and saturates toward 1", () => {
    expect(normaliseVolume(0)).toBe(0);
    expect(normaliseVolume(500)).toBeCloseTo(0.5, 5);
    expect(normaliseVolume(100_000)).toBeGreaterThan(0.99);
  });

  it("is monotonic in volume", () => {
    expect(normaliseVolume(2000)).toBeGreaterThan(normaliseVolume(500));
  });
});

describe("intentWeight", () => {
  it("peaks at hire-now × high and is normalised to 1", () => {
    expect(intentWeight("hire-now", "high")).toBeCloseTo(1, 5);
  });

  it("ranks hire-now above research and high above low", () => {
    expect(intentWeight("hire-now", "high")).toBeGreaterThan(
      intentWeight("compare", "high"),
    );
    expect(intentWeight("compare", "high")).toBeGreaterThan(
      intentWeight("compare", "low"),
    );
  });
});

describe("computeOpportunity", () => {
  it("returns a score in [0,1] with an auditable breakdown", () => {
    const r = computeOpportunity(inputs());
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
    expect(r.breakdown.volume.factor).toBeCloseTo(normaliseVolume(800), 5);
    expect(r.breakdown.competitionGap.factor).toBe(0.7);
  });

  it("is multiplicative: a zero on any axis zeroes the score", () => {
    expect(computeOpportunity(inputs({ volume: 0 })).score).toBe(0);
    expect(computeOpportunity(inputs({ competitionGap: 0 })).score).toBe(0);
    expect(computeOpportunity(inputs({ affiliateRpmPotential: 0 })).score).toBe(0);
    expect(computeOpportunity(inputs({ supplyReadiness: 0 })).score).toBe(0);
  });

  it("clamps out-of-range factors to [0,1]", () => {
    const high = computeOpportunity(inputs({ competitionGap: 5 }));
    const ok = computeOpportunity(inputs({ competitionGap: 1 }));
    expect(high.score).toBeCloseTo(ok.score, 5);
  });

  it("flags shouldBuild against the threshold", () => {
    const strong = computeOpportunity(inputs());
    expect(strong.shouldBuild).toBe(strong.score >= BUILD_THRESHOLD);
    const weak = computeOpportunity(
      inputs({ volume: 20, competitionGap: 0.1, affiliateRpmPotential: 0.1 }),
    );
    expect(weak.shouldBuild).toBe(false);
  });

  it("rewards a thin-supply page when affiliate potential is high (cold-start unlock)", () => {
    const thinSupply = inputs({ supplyReadiness: 0.3, affiliateRpmPotential: 0.9 });
    const thinSupplyNoAffiliate = inputs({ supplyReadiness: 0.3, affiliateRpmPotential: 0.05 });
    expect(computeOpportunity(thinSupply).score).toBeGreaterThan(
      computeOpportunity(thinSupplyNoAffiliate).score,
    );
  });
});

describe("computeMarketEntry", () => {
  it("aggregates keyword opportunities into an entry score", () => {
    const r = computeMarketEntry({
      vertical: "gardeners",
      metro: "manchester",
      keywords: [inputs(), inputs({ intentStage: "research", intentValue: "low" })],
    });
    expect(r.entryScore).toBeGreaterThan(0);
    expect(r.totalKeywords).toBe(2);
    expect(r.buildableKeywords).toBeGreaterThanOrEqual(0);
  });

  it("marks a market affiliate-fundable when affiliate potential carries it without supply", () => {
    const r = computeMarketEntry({
      vertical: "gardeners",
      metro: "leeds",
      keywords: [
        inputs({ supplyReadiness: 0, affiliateRpmPotential: 0.9, competitionGap: 0.8 }),
      ],
    });
    expect(r.entryScore).toBe(0); // no supply → zero actual opportunity
    expect(r.affiliateFundable).toBe(true); // but affiliate alone would carry it
  });
});
