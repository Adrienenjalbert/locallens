import type { FunnelStage, RevenueRail, SlotName, RouterPolicy } from "@config/types";

export type { FunnelStage, RevenueRail, SlotName, RouterPolicy };

/** What the router knows about the current visitor + page when filling a slot. */
export interface RouterContext {
  sessionId?: string;
  pageType: string; // location | profile | best-of | tool | guide | compare
  slot: SlotName;
  intentStage: FunnelStage;
  intentValue: "low" | "medium" | "high";
  device: "mobile" | "desktop";
  verticalSlug: string;
  geoTier?: number; // 1 = dense supply/demand, higher = sparse
  /** Does this page have any published, claimed operators able to receive a lead? */
  hasClaimedOperators: boolean;
  /** Consent state — gates personalised/affiliate behaviour (PECR/GDPR). */
  consent: { analytics: boolean; marketing: boolean };
  /** Whether the answer-first block already rendered before this slot. */
  answerAlreadyRendered: boolean;
  /** How many featured/paid units already rendered above the fold on this page. */
  featuredAboveFoldCount: number;
}

/** A monetisation option competing to fill a slot. */
export interface Candidate {
  rail: RevenueRail;
  ref: string; // offer id | business id | "lead-slot" | "crm-nudge"
  /** Expected revenue per impression for this candidate, in GBP. */
  expectedValue: number;
  /** 0..1 relevance to the page intent (affiliate offers especially). */
  relevance: number;
  /** Is this an above-the-fold / featured unit (counts against the cap)? */
  featured: boolean;
  /** Human-readable label for the unit. */
  label: string;
}

/** Per-candidate evaluation, kept for the decision log (auditable + trains bandit). */
export interface ScoredCandidate extends Candidate {
  /** expectedValue × rail weight. */
  score: number;
  allowed: boolean;
  reason: string;
}

export interface RouterDecision {
  slot: SlotName;
  chosen: ScoredCandidate | null; // null = show nothing (legitimate, often correct)
  candidates: ScoredCandidate[];
  policyVersion: string;
}
