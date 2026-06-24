import type { VerticalConfig } from "../types";

// The Dude brand skin — vertical-leads & sales tools for different businesses.
// Palette + type lifted from the the-dude.ai brand guidelines:
//   primary  #FF9966 coral      → 20 100% 70%
//   accent   #FFC127 gold       → 43 100% 58%
//   secondary#EDA6E6 mauve-pink → 305 65% 79%
//   dark     #1B1C1D            → 220 3% 11%   (foreground / headlines)
//   light    #F5F3EA cream      → 48 35% 94%   (muted / section backgrounds)
//   fonts    DM Serif Text (display) + DM Sans (body)
export const dude: VerticalConfig = {
  slug: "dude",
  name: "The Dude",
  theme: {
    primary: "20 100% 70%", // coral — the brand signature
    secondary: "305 65% 79%", // mauve pink
    accent: "43 100% 58%", // gold
    success: "152 55% 42%",
    warning: "43 100% 58%",
    danger: "0 72% 51%",
    background: "0 0% 100%",
    foreground: "220 3% 11%",
    card: "0 0% 100%",
    cardForeground: "220 3% 11%",
    muted: "48 35% 94%", // warm cream
    mutedForeground: "220 4% 38%",
    border: "45 14% 88%",
    ring: "20 100% 70%",
    fontSans: "DM Sans",
    fontDisplay: "DM Serif Text",
    radius: "1rem",
  },
  scoreWeights: {
    review_quality: 0.3,
    portfolio_quality: 0.15,
    verification: 0.25,
    completeness: 0.15,
    data_confidence: 0.15,
  },
  taxonomy: {
    services: ["gtm", "crm", "outreach", "enrichment", "lead-scoring"],
  },
  tools: {
    calculator: { inputs: ["team_size", "deal_value"] },
    comparator: {
      criteria: ["data_coverage", "accuracy", "integrations", "price_band"],
    },
  },
  routerPolicy: {
    trust_floor: {
      max_featured_above_fold: 1,
      affiliate_relevance_min: 0.55,
      answer_first: true,
    },
    weights: { affiliate: 0.9, lead: 1.3, subscription: 1.0, featured: 0.9 },
    policy_version: "rules-v1",
  },
};
