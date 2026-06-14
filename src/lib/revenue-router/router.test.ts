import { describe, it, expect } from "vitest";
import { RevenueRouter } from "./router";
import type { RouterContext, Candidate } from "./types";
import type { RouterPolicy } from "@config/types";

const policy: RouterPolicy = {
  trust_floor: {
    max_featured_above_fold: 1,
    affiliate_relevance_min: 0.55,
    answer_first: true,
  },
  weights: { affiliate: 1.0, lead: 1.2, subscription: 0.8, featured: 0.9 },
  policy_version: "rules-v1-test",
};

const baseCtx: RouterContext = {
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
};

const affiliate = (ev: number, relevance: number): Candidate => ({
  rail: "affiliate",
  ref: "offer-1",
  expectedValue: ev,
  relevance,
  featured: false,
  label: "Compare cover",
});

const lead = (ev: number): Candidate => ({
  rail: "lead",
  ref: "lead-slot",
  expectedValue: ev,
  relevance: 1,
  featured: false,
  label: "Get quotes",
});

describe("RevenueRouter trust floor", () => {
  it("rejects affiliate offers below the relevance floor", () => {
    const router = new RevenueRouter(policy);
    const d = router.decide(baseCtx, [affiliate(5, 0.4)]);
    expect(d.chosen).toBeNull();
    expect(d.candidates[0].reason).toBe("affiliate_below_relevance_floor");
  });

  it("never shows a monetisation unit before the answer block", () => {
    const router = new RevenueRouter(policy);
    const d = router.decide(
      { ...baseCtx, answerAlreadyRendered: false },
      [affiliate(5, 0.9)],
    );
    expect(d.chosen).toBeNull();
    expect(d.candidates[0].reason).toBe("answer_not_yet_rendered");
  });

  it("blocks affiliate without marketing consent (PECR/GDPR)", () => {
    const router = new RevenueRouter(policy);
    const d = router.decide(
      { ...baseCtx, consent: { analytics: true, marketing: false } },
      [affiliate(5, 0.9)],
    );
    expect(d.chosen).toBeNull();
  });

  it("does not route a lead when no claimed operator can receive it", () => {
    const router = new RevenueRouter(policy);
    const d = router.decide({ ...baseCtx, hasClaimedOperators: false }, [lead(10)]);
    expect(d.chosen).toBeNull();
    expect(d.candidates[0].reason).toBe("no_operator_for_lead");
  });
});

describe("RevenueRouter expected-value maximisation", () => {
  it("prefers the higher weighted expected value among allowed candidates", () => {
    const router = new RevenueRouter(policy);
    // affiliate: 5 * 1.0 = 5 ; lead: 4 * 1.2 = 4.8 → affiliate wins
    const d = router.decide(baseCtx, [affiliate(5, 0.9), lead(4)]);
    expect(d.chosen?.rail).toBe("affiliate");
  });

  it("can legitimately choose to show nothing when all EVs are zero", () => {
    const router = new RevenueRouter(policy);
    const d = router.decide(baseCtx, [affiliate(0, 0.9)]);
    expect(d.chosen).toBeNull();
  });

  it("enforces the featured above-the-fold cap", () => {
    const router = new RevenueRouter(policy);
    const featured: Candidate = {
      rail: "featured",
      ref: "biz-1",
      expectedValue: 20,
      relevance: 1,
      featured: true,
      label: "Featured: AquaGarden",
    };
    const d = router.decide({ ...baseCtx, featuredAboveFoldCount: 1 }, [featured]);
    expect(d.chosen).toBeNull();
    expect(d.candidates[0].reason).toBe("featured_cap_reached");
  });
});
