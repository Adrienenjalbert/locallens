// Bundled sample keyword candidates so --dry-run shows the full shape of the
// output with zero keys and zero network. Modelled on the gardeners × Manchester
// wedge. Volumes/gaps are illustrative but realistic for UK local-intent terms.

import type { KeywordCandidate } from "./types";

export function sampleKeywords(metro: string): KeywordCandidate[] {
  const m = metro.toLowerCase();
  return [
    {
      keyword: `gardeners in ${m}`,
      source: "sample",
      pageType: "location",
      intentStage: "hire-now",
      intentValue: "high",
      volume: 1300,
      competitionGap: 0.45,
    },
    {
      keyword: `best gardeners ${m}`,
      source: "sample",
      pageType: "location",
      intentStage: "compare",
      intentValue: "high",
      volume: 480,
      competitionGap: 0.6,
    },
    {
      keyword: `how much do gardeners cost in ${m}`,
      source: "sample",
      pageType: "tool",
      intentStage: "research",
      intentValue: "medium",
      volume: 720,
      competitionGap: 0.75,
    },
    {
      keyword: `lawn mowing service ${m}`,
      source: "sample",
      pageType: "location",
      intentStage: "hire-now",
      intentValue: "high",
      volume: 590,
      competitionGap: 0.55,
    },
    {
      keyword: `garden clearance ${m} prices`,
      source: "sample",
      pageType: "tool",
      intentStage: "compare",
      intentValue: "high",
      volume: 320,
      competitionGap: 0.7,
    },
    {
      keyword: `do i need a licence to remove a tree ${m}`,
      source: "sample",
      pageType: "guide",
      intentStage: "research",
      intentValue: "low",
      volume: 90,
      competitionGap: 0.85,
    },
    {
      keyword: `gardener vs landscaper`,
      source: "sample",
      pageType: "compare",
      intentStage: "compare",
      intentValue: "medium",
      volume: 210,
      competitionGap: 0.8,
    },
  ];
}
