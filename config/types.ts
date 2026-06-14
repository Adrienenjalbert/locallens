// Vertical configuration contract. A new vertical launches by adding one of
// these objects — no feature code. Mirrors the jsonb columns on `vertical`.

export type FunnelStage = "research" | "compare" | "hire_now";
export type RevenueRail = "affiliate" | "lead" | "subscription" | "featured";
export type SlotName =
  | "hero-cta"
  | "inline-after-shortlist"
  | "sidebar"
  | "tool-result-cta"
  | "sticky-mobile";

export interface ThemeTokens {
  /** HSL channel triples, e.g. "152 60% 36%", consumed as CSS variables. */
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  ring: string;
  fontSans: string;
  fontDisplay: string;
  radius: string;
}

export interface ScoreWeights {
  review_quality: number;
  portfolio_quality: number;
  verification: number;
  completeness: number;
  data_confidence: number;
}

/** The trust floor — hard constraints the RevenueRouter may never violate. */
export interface TrustFloor {
  /** Max paid/featured units allowed above the fold. */
  max_featured_above_fold: number;
  /** Minimum relevance an affiliate offer needs to be eligible (0..1). */
  affiliate_relevance_min: number;
  /** The answer/shortlist must precede any monetisation unit. */
  answer_first: boolean;
}

/** RevenueRouter policy: rail weights + the trust floor + a version tag. */
export interface RouterPolicy {
  trust_floor: TrustFloor;
  /** Multipliers applied to each rail's expected value (tunable by the loop). */
  weights: Partial<Record<RevenueRail, number>>;
  policy_version: string;
}

export interface ToolConfig {
  calculator?: { inputs: string[] };
  comparator?: { criteria: string[] };
}

export interface VerticalConfig {
  slug: string;
  name: string;
  theme: ThemeTokens;
  scoreWeights: ScoreWeights;
  taxonomy: { services: string[] };
  tools: ToolConfig;
  routerPolicy: RouterPolicy;
}
