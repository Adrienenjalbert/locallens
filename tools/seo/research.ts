// Free keyword/question research — the cost-effective core. Two free signals:
//
//  1. Google Autocomplete (the public suggest endpoint) — no key, no cost. This
//     is the same data "People Also Search" surfaces and is the best free way to
//     find the long-tail, question-shaped queries AI answer engines extract.
//  2. Offline question templates ("People Also Ask"-style) — deterministic
//     expansion of each seed into the question forms (how much, best, near me,
//     vs, cost) that map to our location/tool/guide/compare page types.
//
// No paid API. Volume + competition are HEURISTIC estimates (clearly flagged);
// when you later wire Google Search Console / Keyword Planner, swap the
// `estimateVolume`/`estimateCompetition` calls for real data — the scoring math
// downstream doesn't change. Everything is --no-network and --dry-run safe.

import type { IntentStage, IntentValue } from "../../src/lib/scoring/opportunity";
import type { KeywordCandidate, ResearchArgs } from "./types";
import { sampleKeywords } from "./sample-data";

const SUGGEST_URL = "https://suggestqueries.google.com/complete/search";
const FETCH_TIMEOUT_MS = 8_000;

// Question/page-type templates. `{seed}` = a service term, `{metro}` = the town.
// Each maps a query shape to the page type + intent it implies.
interface Template {
  build: (seed: string, metro: string) => string;
  pageType: KeywordCandidate["pageType"];
  intentStage: IntentStage;
  intentValue: IntentValue;
}

const TEMPLATES: Template[] = [
  { build: (s, m) => `${s} in ${m}`, pageType: "location", intentStage: "hire-now", intentValue: "high" },
  { build: (s, m) => `${s} near me ${m}`, pageType: "location", intentStage: "hire-now", intentValue: "high" },
  { build: (s, m) => `best ${s} ${m}`, pageType: "location", intentStage: "compare", intentValue: "high" },
  { build: (s, m) => `${s} ${m} reviews`, pageType: "location", intentStage: "compare", intentValue: "medium" },
  { build: (s, m) => `how much do ${s} cost in ${m}`, pageType: "tool", intentStage: "research", intentValue: "medium" },
  { build: (s, m) => `${s} prices ${m}`, pageType: "tool", intentStage: "compare", intentValue: "high" },
  { build: (s, _m) => `${s} vs landscaper`, pageType: "compare", intentStage: "compare", intentValue: "medium" },
  { build: (s, _m) => `do i need ${s}`, pageType: "guide", intentStage: "research", intentValue: "low" },
];

function classify(keyword: string): Pick<KeywordCandidate, "pageType" | "intentStage" | "intentValue"> {
  const k = keyword.toLowerCase();
  if (/\b(cost|price|prices|how much|quote|estimate)\b/.test(k))
    return { pageType: "tool", intentStage: "research", intentValue: "medium" };
  if (/\bvs\b|compare|difference/.test(k))
    return { pageType: "compare", intentStage: "compare", intentValue: "medium" };
  if (/\bbest|top|reviews?\b/.test(k))
    return { pageType: "location", intentStage: "compare", intentValue: "high" };
  if (/\bnear me|in \w+|local\b/.test(k))
    return { pageType: "location", intentStage: "hire-now", intentValue: "high" };
  if (/\b(do i need|can i|should i|when|why|what|how)\b/.test(k))
    return { pageType: "guide", intentStage: "research", intentValue: "low" };
  return { pageType: "location", intentStage: "hire-now", intentValue: "high" };
}

/**
 * Heuristic monthly-volume estimate (clearly NOT real data). Longer, more
 * specific queries get less volume; "near me"/"cost" intents get a bump because
 * they're common local searches. Replace with GSC impressions / Keyword Planner.
 */
function estimateVolume(keyword: string): number {
  const words = keyword.trim().split(/\s+/).length;
  let base = Math.max(40, 1400 - words * 160);
  if (/near me|cost|price/.test(keyword)) base *= 1.25;
  if (/\bvs\b|do i need|licence|license/.test(keyword)) base *= 0.5;
  return Math.round(base);
}

/**
 * Heuristic competition gap in [0,1] (1 = winnable). Question/long-tail queries
 * tend to have weaker SERPs (more winnable); short head terms are locked up.
 * Replace with a real SERP/difficulty check when available.
 */
function estimateCompetition(keyword: string): number {
  const words = keyword.trim().split(/\s+/).length;
  let gap = Math.min(0.9, 0.3 + words * 0.08);
  if (/how|why|what|do i need|vs/.test(keyword)) gap = Math.min(0.9, gap + 0.1);
  if (/^best |gardeners$|plumbers$/.test(keyword)) gap = Math.max(0.2, gap - 0.15);
  return Math.round(gap * 100) / 100;
}

async function fetchAutocomplete(query: string): Promise<string[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${SUGGEST_URL}?client=firefox&hl=en&gl=gb&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LocalLensSEO/1.0)" },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    // client=firefox returns [query, [suggestions...]].
    const data = (await res.json()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1] : [];
  } catch {
    return []; // network off / blocked → degrade to offline templates only
  } finally {
    clearTimeout(timer);
  }
}

function dedupe(candidates: KeywordCandidate[]): KeywordCandidate[] {
  const seen = new Set<string>();
  const out: KeywordCandidate[] = [];
  for (const c of candidates) {
    const key = c.keyword.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** Discover + classify keyword candidates from seeds (free signals only). */
export async function research(args: ResearchArgs): Promise<KeywordCandidate[]> {
  if (args.dryRun) {
    return sampleKeywords(args.metro).slice(0, args.limit);
  }

  const candidates: KeywordCandidate[] = [];

  // 1) Offline template expansion (deterministic, always available).
  for (const seed of args.seeds) {
    for (const t of TEMPLATES) {
      const keyword = t.build(seed, args.metro).replace(/\s+/g, " ").trim();
      candidates.push({
        keyword,
        source: "seed",
        pageType: t.pageType,
        intentStage: t.intentStage,
        intentValue: t.intentValue,
        volume: estimateVolume(keyword),
        competitionGap: estimateCompetition(keyword),
      });
    }
  }

  // 2) Google Autocomplete expansion (free, network) unless disabled.
  if (!args.noNetwork) {
    for (const seed of args.seeds) {
      const probes = [
        `${seed} ${args.metro}`,
        `${seed} cost`,
        `best ${seed} ${args.metro}`,
      ];
      for (const probe of probes) {
        const suggestions = await fetchAutocomplete(probe);
        for (const s of suggestions) {
          const cls = classify(s);
          candidates.push({
            keyword: s,
            source: "autocomplete",
            ...cls,
            volume: estimateVolume(s),
            competitionGap: estimateCompetition(s),
          });
        }
        await new Promise((r) => setTimeout(r, 250)); // gentle on the endpoint
      }
    }
  }

  return dedupe(candidates).slice(0, args.limit);
}
