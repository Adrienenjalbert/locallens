import type { VerticalConfig } from "../types";

// The wedge: gardeners in one UK metro. Re-skin + re-tune by copying this file.
export const gardeners: VerticalConfig = {
  slug: "gardeners",
  name: "Gardeners",
  theme: {
    primary: "152 55% 34%", // garden green
    secondary: "30 40% 96%",
    accent: "84 60% 45%",
    success: "142 71% 38%",
    warning: "38 92% 50%",
    danger: "0 72% 51%",
    background: "60 33% 99%",
    foreground: "150 12% 14%",
    card: "0 0% 100%",
    cardForeground: "150 12% 14%",
    muted: "150 12% 96%",
    mutedForeground: "150 6% 42%",
    border: "150 12% 88%",
    ring: "152 55% 34%",
    fontSans: "Inter",
    fontDisplay: "Fraunces",
    radius: "0.75rem",
  },
  scoreWeights: {
    review_quality: 0.35,
    portfolio_quality: 0.25, // higher for visual verticals
    verification: 0.2,
    completeness: 0.1,
    data_confidence: 0.1,
  },
  taxonomy: {
    services: [
      "lawn-care",
      "hedge-trimming",
      "garden-clearance",
      "landscaping",
      "tree-surgery",
    ],
  },
  tools: {
    calculator: { inputs: ["garden_size", "scope"] },
    comparator: {
      criteria: ["quality_score", "rating", "portfolio", "response", "price_band"],
    },
  },
  routerPolicy: {
    trust_floor: {
      max_featured_above_fold: 1,
      affiliate_relevance_min: 0.55,
      answer_first: true,
    },
    weights: { affiliate: 1.0, lead: 1.2, subscription: 0.8, featured: 0.9 },
    policy_version: "rules-v1",
  },
};
