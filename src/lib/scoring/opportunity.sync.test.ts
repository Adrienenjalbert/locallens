import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeOpportunity,
  normaliseVolume,
  intentWeight,
  BUILD_THRESHOLD,
} from "./opportunity";

// Keep-in-sync guard: the Deno copy of the Opportunity model
// (supabase/functions/_shared/scoring.ts) must match the Node source of truth.
// We can't import the Deno module from Node (it uses Deno globals + esm.sh
// imports), so we (a) pin the Node algorithm with golden values, and (b) assert
// the Deno source carries the same constants/algorithm. Drift in either copy
// fails this test.

const DENO_SCORING = readFileSync(
  join(__dirname, "../../../supabase/functions/_shared/scoring.ts"),
  "utf8",
);

describe("opportunity model — golden values (Node source of truth)", () => {
  it("pins the algorithm so any Node-side drift is caught", () => {
    expect(normaliseVolume(500)).toBeCloseTo(0.5, 5);
    expect(intentWeight("hire-now", "high")).toBeCloseTo(1, 5);
    // Strong local hire-now page: 1300 vol, gap .45, affiliate .6, supply .7.
    const r = computeOpportunity({
      volume: 1300,
      intentStage: "hire-now",
      intentValue: "high",
      competitionGap: 0.45,
      affiliateRpmPotential: 0.6,
      supplyReadiness: 0.7,
    });
    expect(r.score).toBe(0.136);
    expect(BUILD_THRESHOLD).toBe(0.08);
  });
});

describe("opportunity model — Deno copy stays in sync", () => {
  it("declares the same build threshold", () => {
    expect(DENO_SCORING).toContain("BUILD_THRESHOLD = 0.08");
  });

  it("declares the same intent stage + value weights", () => {
    expect(DENO_SCORING).toContain(
      'STAGE_WEIGHT: Record<IntentStage, number> = { research: 0.4, compare: 0.7, "hire-now": 1.0 }',
    );
    expect(DENO_SCORING).toContain(
      "VALUE_WEIGHT: Record<IntentValue, number> = { low: 0.4, medium: 0.7, high: 1.0 }",
    );
  });

  it("uses the same volume half-saturation constant", () => {
    expect(DENO_SCORING).toContain("HALF_SATURATION = 500");
  });

  it("uses the same multiplicative score formula", () => {
    expect(DENO_SCORING).toContain(
      "volume * intent * competitionGap * affiliate * supply * 1000",
    );
  });
});
