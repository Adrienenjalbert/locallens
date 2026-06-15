import { describe, it, expect } from "vitest";
import { BanditRouter, makeBanditRouter } from "./bandit-router";
import {
  sampleBeta,
  seededRng,
  thompsonSelect,
  statKey,
  cellKey,
  armKey,
  type ArmStats,
} from "./bandit";
import type { RouterContext, Candidate, ScoredCandidate } from "./types";
import type { RouterPolicy } from "@config/types";

const policy: RouterPolicy = {
  trust_floor: { max_featured_above_fold: 1, affiliate_relevance_min: 0.55, answer_first: true },
  weights: { affiliate: 1, lead: 1, subscription: 1, featured: 1 },
  policy_version: "bandit-v2-test",
};

const ctx: RouterContext = {
  pageType: "location",
  slot: "inline-after-shortlist",
  intentStage: "research",
  intentValue: "medium",
  device: "mobile",
  verticalSlug: "gardeners",
  geoTier: 1,
  hasClaimedOperators: true,
  consent: { analytics: true, marketing: true },
  answerAlreadyRendered: true,
  featuredAboveFoldCount: 0,
  slotIsOrganicList: false,
};

const affiliate = (relevance: number, ev: number): Candidate => ({
  rail: "affiliate",
  ref: "offer-A",
  expectedValue: ev,
  relevance,
  featured: false,
  label: "Offer A",
});
const lead = (ev: number): Candidate => ({
  rail: "lead",
  ref: "lead-slot",
  expectedValue: ev,
  relevance: 1,
  featured: false,
  label: "Get quotes",
});

describe("sampleBeta", () => {
  it("returns values in (0,1) and concentrates near the posterior mean", () => {
    const rng = seededRng(42);
    const samples = Array.from({ length: 2000 }, () => sampleBeta({ alpha: 9, beta: 1 }, rng));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(Math.min(...samples)).toBeGreaterThan(0);
    expect(Math.max(...samples)).toBeLessThan(1);
    // Beta(9,1) mean = 0.9
    expect(mean).toBeGreaterThan(0.82);
    expect(mean).toBeLessThan(0.96);
  });
});

describe("BanditRouter trust floor (unchanged)", () => {
  it("never selects an affiliate below the relevance floor (masked before sampling)", () => {
    const router = makeBanditRouter(policy, {}, 1);
    const d = router.decide(ctx, [affiliate(0.4, 5)]);
    expect(d.chosen).toBeNull();
    expect(d.candidates[0].reason).toBe("affiliate_below_relevance_floor");
  });

  it("never selects before the answer block renders", () => {
    const router = makeBanditRouter(policy, {}, 1);
    const d = router.decide({ ...ctx, answerAlreadyRendered: false }, [affiliate(0.9, 5)]);
    expect(d.chosen).toBeNull();
  });

  it("does not route a lead with no operator", () => {
    const router = makeBanditRouter(policy, {}, 1);
    const d = router.decide({ ...ctx, hasClaimedOperators: false }, [lead(5)]);
    expect(d.chosen).toBeNull();
  });
});

describe("BanditRouter determinism + exploration", () => {
  it("is deterministic given the same seed", () => {
    const stats: ArmStats = {};
    const a = makeBanditRouter(policy, stats, 7).decide(ctx, [affiliate(0.9, 1), lead(1)]);
    const b = makeBanditRouter(policy, stats, 7).decide(ctx, [affiliate(0.9, 1), lead(1)]);
    expect(a.chosen?.ref).toBe(b.chosen?.ref);
  });

  it("explores both arms from a uniform prior (does not always pick the same one)", () => {
    const picks = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const d = new BanditRouter(policy, {}, seededRng(seed)).decide(ctx, [
        affiliate(0.9, 1),
        lead(1),
      ]);
      if (d.chosen) picks.add(d.chosen.ref);
    }
    // With equal EVs and a uniform prior, both arms should get explored.
    expect(picks.size).toBe(2);
  });
});

describe("BanditRouter convergence (exploitation)", () => {
  it("strongly favours the arm with the better learned posterior", () => {
    const cell = cellKey(ctx);
    // Offer A has converted well (Beta(50,5) ~ 0.91); lead has converted poorly
    // (Beta(2,50) ~ 0.04). With equal EVs, A should win the vast majority.
    const stats: ArmStats = {
      [statKey(cell, "affiliate:offer-A")]: { alpha: 50, beta: 5 },
      [statKey(cell, "lead:lead-slot")]: { alpha: 2, beta: 50 },
    };
    let aWins = 0;
    const n = 200;
    for (let seed = 0; seed < n; seed++) {
      const d = new BanditRouter(policy, stats, seededRng(seed)).decide(ctx, [
        affiliate(0.9, 1),
        lead(1),
      ]);
      if (d.chosen?.ref === "offer-A") aWins++;
    }
    expect(aWins / n).toBeGreaterThan(0.9);
  });

  it("weights expected value: a higher-£ arm can win despite a similar conversion rate", () => {
    const cell = cellKey(ctx);
    const stats: ArmStats = {
      // Similar conversion posteriors…
      [statKey(cell, "affiliate:offer-A")]: { alpha: 20, beta: 20 },
      [statKey(cell, "lead:lead-slot")]: { alpha: 20, beta: 20 },
    };
    let leadWins = 0;
    const n = 200;
    for (let seed = 0; seed < n; seed++) {
      // …but the lead is worth 5× more per conversion.
      const d = new BanditRouter(policy, stats, seededRng(seed)).decide(ctx, [
        affiliate(0.9, 1),
        lead(5),
      ]);
      if (d.chosen?.rail === "lead") leadWins++;
    }
    expect(leadWins / n).toBeGreaterThan(0.8);
  });
});

describe("thompsonSelect mean mode (offline eval)", () => {
  it("picks the deterministic posterior-mean × EV winner with no exploration", () => {
    const cell = cellKey(ctx);
    const stats: ArmStats = {
      [statKey(cell, "affiliate:offer-A")]: { alpha: 9, beta: 1 }, // mean 0.9
      [statKey(cell, "lead:lead-slot")]: { alpha: 1, beta: 9 }, // mean 0.1
    };
    const eligible: ScoredCandidate[] = [
      { ...affiliate(0.9, 1), score: 1, allowed: true, reason: "ok" },
      { ...lead(1), score: 1, allowed: true, reason: "ok" },
    ];
    const chosen = thompsonSelect(eligible, ctx, stats, () => 0.5, "mean");
    expect(chosen?.ref).toBe("offer-A");
  });
});

describe("key helpers", () => {
  it("builds stable cell and arm keys", () => {
    expect(cellKey(ctx)).toBe("location|research|1");
    expect(armKey({ rail: "affiliate", ref: "x" })).toBe("affiliate:x");
  });
});
