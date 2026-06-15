// SEO/AEO research engine CLI — research -> score -> rank -> export page candidates.
// Run:  npm run seo -- --vertical gardeners --metro manchester --seeds "gardener,lawn care"
// Dry:  npm run seo -- --metro manchester --dry-run   (no keys, no network)
//
// Free by design: discovery uses Google Autocomplete (no key) + offline question
// templates; scoring uses the pure Opportunity model (the same source-of-truth
// function the etl-keywords Edge fn will use). Output is a ranked set of `page`
// candidates — exactly the rows the build's page-selection step would queue.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  computeOpportunity,
  computeMarketEntry,
} from "../../src/lib/scoring/opportunity";
import { research } from "./research";
import type { MarketContext, PageCandidate, ResearchArgs } from "./types";

const HERE = new URL(".", import.meta.url).pathname;

// Affiliate-RPM potential + supply readiness per vertical. These would come from
// the affiliate offer catalogue + golden-record density; seeded for the wedge.
const MARKET_DEFAULTS: Record<string, { affiliateRpmPotential: number; supplyReadiness: number }> = {
  gardeners: { affiliateRpmPotential: 0.6, supplyReadiness: 0.7 },
};

function parseArgs(argv: string[]): ResearchArgs {
  const args: ResearchArgs = {
    vertical: "gardeners",
    metro: "",
    seeds: [],
    limit: 50,
    dryRun: false,
    noNetwork: false,
    minScore: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--vertical":
        args.vertical = next();
        break;
      case "--metro":
        args.metro = next();
        break;
      case "--seeds":
        args.seeds = next()
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--limit":
        args.limit = Number(next()) || args.limit;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--no-network":
        args.noNetwork = true;
        break;
      case "--min-score":
        args.minScore = Number(next()) || 0;
        break;
      default:
        if (a.startsWith("--")) console.warn(`[args] unknown flag: ${a}`);
    }
  }
  return args;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Map a keyword + page type to the URL we'd publish at (matches the export). */
function pageUrl(
  pageType: PageCandidate["pageType"],
  vertical: string,
  metro: string,
  keyword: string,
): string {
  const v = slug(vertical);
  const m = slug(metro);
  switch (pageType) {
    case "location":
      return `/${v}/${m}/`;
    case "tool":
      return `/tools/${v}-cost-${m}/`;
    case "compare":
      return `/tools/${v}-vs/`;
    case "guide":
      return `/guides/${slug(keyword)}/`;
    case "profile":
      return `/${v}/${m}/${slug(keyword)}/`;
    default: {
      const _exhaustive: never = pageType;
      return _exhaustive;
    }
  }
}

function csvEscape(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: PageCandidate[]): string {
  const header = [
    "opportunity_score",
    "should_build",
    "keyword",
    "page_type",
    "url",
    "intent_stage",
    "intent_value",
    "volume",
    "competition_gap",
    "source",
  ];
  const body = rows.map((r) =>
    [
      r.opportunityScore,
      r.shouldBuild,
      r.keyword,
      r.pageType,
      r.url,
      r.intentStage,
      r.intentValue,
      r.volume,
      r.competitionGap,
      r.source,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...body].join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.metro) {
    console.error(
      'Missing --metro. Examples:\n' +
        '  npm run seo -- --vertical gardeners --metro manchester --seeds "gardener,lawn care"\n' +
        "  npm run seo -- --metro manchester --dry-run   (no keys, no network)",
    );
    process.exit(1);
  }
  if (args.seeds.length === 0) args.seeds = [args.vertical.replace(/s$/, "")];

  const market: MarketContext = {
    vertical: args.vertical,
    metro: args.metro,
    ...(MARKET_DEFAULTS[args.vertical] ?? {
      affiliateRpmPotential: 0.4,
      supplyReadiness: 0.5,
    }),
  };

  console.log(
    `\nSEO/AEO research\n  vertical=${args.vertical} metro=${args.metro} ` +
      `seeds=[${args.seeds.join(", ")}] dryRun=${args.dryRun} noNetwork=${args.noNetwork}\n`,
  );

  // 1) Research (free signals)
  console.log("1/3 Researching keywords…");
  const keywords = await research(args);
  console.log(`     ${keywords.length} candidate keywords`);

  // 2) Score with the profit-aware Opportunity model
  console.log("2/3 Scoring opportunities (profit-aware)…");
  const candidates: PageCandidate[] = keywords.map((k) => {
    const result = computeOpportunity({
      volume: k.volume,
      intentStage: k.intentStage,
      intentValue: k.intentValue,
      competitionGap: k.competitionGap,
      affiliateRpmPotential: market.affiliateRpmPotential,
      supplyReadiness: market.supplyReadiness,
    });
    return {
      keyword: k.keyword,
      source: k.source,
      pageType: k.pageType,
      url: pageUrl(k.pageType, args.vertical, args.metro, k.keyword),
      intentStage: k.intentStage,
      intentValue: k.intentValue,
      volume: k.volume,
      competitionGap: k.competitionGap,
      opportunityScore: result.score,
      shouldBuild: result.shouldBuild,
    };
  });

  // Market-entry score: can this vertical×metro be entered (affiliate-funded)?
  const market_entry = computeMarketEntry({
    vertical: args.vertical,
    metro: args.metro,
    keywords: keywords.map((k) => ({
      volume: k.volume,
      intentStage: k.intentStage,
      intentValue: k.intentValue,
      competitionGap: k.competitionGap,
      affiliateRpmPotential: market.affiliateRpmPotential,
      supplyReadiness: market.supplyReadiness,
    })),
  });

  const ranked = candidates
    .filter((c) => c.opportunityScore >= args.minScore)
    .sort((a, b) => b.opportunityScore - a.opportunityScore);

  // 3) Output
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(HERE, "out", stamp);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "page-candidates.csv"), toCsv(ranked), "utf8");
  writeFileSync(
    join(outDir, "page-candidates.json"),
    JSON.stringify({ market, market_entry, candidates: ranked }, null, 2),
    "utf8",
  );

  const buildable = ranked.filter((c) => c.shouldBuild);
  console.log(`\n3/3 Done. ${ranked.length} candidates written to:\n  ${outDir}`);
  console.log(
    `\nMarket entry: ${args.vertical} × ${args.metro}\n` +
      `  entry score: ${market_entry.entryScore}  ` +
      `buildable: ${market_entry.buildableKeywords}/${market_entry.totalKeywords}  ` +
      `affiliate-fundable: ${market_entry.affiliateFundable ? "yes" : "no"}`,
  );
  console.log(
    `\nTop page candidates (highest opportunity):` +
      buildable
        .slice(0, 8)
        .map(
          (c) =>
            `\n  • ${c.opportunityScore.toFixed(3)}  ${c.pageType.padEnd(8)} ${c.url}\n      ↳ "${c.keyword}"`,
        )
        .join(""),
  );
  console.log("");
}

main().catch((e) => {
  console.error("\n[seo] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
