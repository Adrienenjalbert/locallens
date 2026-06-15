// Shared types for the free-tool SEO/AEO research engine.
// Mirrors the cost model of tools/outreach: everything degrades gracefully and
// runs in --dry-run with zero keys. The only optional paid/keyed inputs are
// Google Search Console (free, OAuth) and keyword-volume providers; without them
// the engine uses free signals (autocomplete + heuristic volume) + sample data.

import type {
  IntentStage,
  IntentValue,
} from "../../src/lib/scoring/opportunity";

/** A raw keyword/question candidate discovered during research. */
export interface KeywordCandidate {
  /** The query string, e.g. "gardeners in leeds" or "how much do gardeners cost". */
  keyword: string;
  /** Where it came from (for provenance + dedup). */
  source: "seed" | "autocomplete" | "paa" | "gsc" | "sample";
  /** The page type this query maps to. */
  pageType: "location" | "tool" | "guide" | "compare" | "profile";
  intentStage: IntentStage;
  intentValue: IntentValue;
  /** Monthly volume estimate (GSC impressions, planner, or heuristic). */
  volume: number;
  /** [0,1] how winnable the SERP looks (1 = wide open). */
  competitionGap: number;
}

/** Per-vertical×metro market context used to fill the profit-aware factors. */
export interface MarketContext {
  vertical: string;
  metro: string;
  /** [0,1] affiliate-RPM potential for this vertical (from the offer catalogue). */
  affiliateRpmPotential: number;
  /** [0,1] supply readiness — how much confident operator/review data we hold. */
  supplyReadiness: number;
}

/** A scored, build-ready page candidate (a future `page` table row). */
export interface PageCandidate {
  keyword: string;
  source: KeywordCandidate["source"];
  pageType: KeywordCandidate["pageType"];
  /** Site-relative URL we would publish at (trailing slash, matches the export). */
  url: string;
  intentStage: IntentStage;
  intentValue: IntentValue;
  volume: number;
  competitionGap: number;
  opportunityScore: number;
  shouldBuild: boolean;
}

export interface ResearchArgs {
  vertical: string;
  metro: string;
  /** Seed terms to expand (e.g. ["gardener", "lawn care"]). */
  seeds: string[];
  limit: number;
  dryRun: boolean;
  /** Skip the autocomplete network calls (pure-offline expansion only). */
  noNetwork: boolean;
  /** Only output candidates at/above this opportunity score. */
  minScore: number;
}
