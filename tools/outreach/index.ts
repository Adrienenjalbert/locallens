// Outreach engine CLI — discover -> audit -> personalise -> export.
// Run:  npm run outreach -- --town "Edinburgh" --query "landscaping" --limit 25
// Dry:  npm run outreach -- --town "Edinburgh" --dry-run
//
// Cost-effective by design: Apify is the only paid call; auditing is free HTTP;
// the LLM runs on free tiers (Groq -> Gemini) with a template fallback.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { audit, topIssues } from "./audit";
import { discover } from "./discover";
import { generateMessage } from "./llm";
import type { OutreachRecord, Prospect, SenderInfo } from "./types";

const HERE = new URL(".", import.meta.url).pathname;

// --- Minimal .env.outreach loader (no dependency) ---
function loadEnv(): void {
  const path = join(HERE, ".env.outreach");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^["']|["']$/g, "");
    if (v && !process.env[k]) process.env[k] = v;
  }
}

interface Args {
  town: string;
  query: string;
  limit: number;
  country: string;
  dryRun: boolean;
  noLlm: boolean;
  minScore: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    town: "",
    query: "landscaping",
    limit: 25,
    country: "gb",
    dryRun: false,
    noLlm: false,
    minScore: 0,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--town":
        args.town = next();
        break;
      case "--query":
        args.query = next();
        break;
      case "--limit":
        args.limit = Number(next()) || args.limit;
        break;
      case "--country":
        args.country = next();
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--no-llm":
        args.noLlm = true;
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function csvEscape(v: unknown): string {
  const s = v === undefined || v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(records: OutreachRecord[]): string {
  const header = [
    "name",
    "town",
    "website",
    "phone",
    "email",
    "rating",
    "reviewCount",
    "audit_score",
    "top_issues",
    "message_source",
    "message",
  ];
  const rows = records.map((r) =>
    [
      r.prospect.name,
      r.prospect.town,
      r.prospect.website ?? "",
      r.prospect.phone ?? "",
      r.prospect.email ?? "",
      r.prospect.rating ?? "",
      r.prospect.reviewCount ?? "",
      r.audit.score,
      r.topIssues.map((i) => i.label).join(" | "),
      r.messageSource,
      r.message ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

function senderFromEnv(): SenderInfo {
  return {
    name: process.env.SENDER_NAME || "Adrien",
    business: process.env.SENDER_BUSINESS || "BetterClick",
    proofUrl: process.env.SENDER_PROOF_URL || "https://thorburnlandscape.co.uk",
  };
}

async function main(): Promise<void> {
  loadEnv();
  const args = parseArgs(process.argv.slice(2));

  if (!args.town) {
    console.error(
      'Missing --town. Example:\n  npm run outreach -- --town "Edinburgh" --query "garden maintenance" --limit 25\n  (add --dry-run to try with sample data, no keys needed)',
    );
    process.exit(1);
  }

  const sender = senderFromEnv();
  console.log(
    `\nOutreach engine\n  town=${args.town} query="${args.query}" limit=${args.limit} ` +
      `dryRun=${args.dryRun} noLlm=${args.noLlm}\n`,
  );

  // 1) Discover
  console.log("1/3 Discovering prospects…");
  const prospects: Prospect[] = await discover({
    town: args.town,
    query: args.query,
    limit: args.limit,
    country: args.country,
    dryRun: args.dryRun,
  });
  console.log(`     found ${prospects.length} businesses`);

  // 2) Audit (free) + 3) Generate (free LLM), sequentially to respect rate limits.
  const records: OutreachRecord[] = [];
  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    process.stdout.write(`2/3 Auditing ${i + 1}/${prospects.length}: ${p.name}… `);
    const auditResult = await audit(p);
    const top = topIssues(auditResult, 3);
    console.log(`score=${auditResult.score} issues=${auditResult.issues.length}`);

    // Skip prospects that are already great (high score = little headroom).
    if (args.minScore > 0 && auditResult.score >= args.minScore) {
      records.push({
        prospect: p,
        audit: auditResult,
        topIssues: top,
        messageSource: "skipped-above-min-score",
      });
      continue;
    }

    const gen = await generateMessage(p, top, sender, args.noLlm || args.dryRun);
    records.push({
      prospect: p,
      audit: auditResult,
      topIssues: top,
      message: gen.message,
      messageSource: gen.source,
    });

    if (!args.noLlm && !args.dryRun) await sleep(800); // gentle on free tiers
  }

  // Sort best prospects first (lowest score = most improvement headroom).
  records.sort((a, b) => a.audit.score - b.audit.score);

  // 4) Output
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = join(HERE, "out", stamp);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "prospects.csv"), toCsv(records), "utf8");
  writeFileSync(
    join(outDir, "prospects.json"),
    JSON.stringify(records, null, 2),
    "utf8",
  );

  console.log(`\n3/3 Done. ${records.length} records written to:\n  ${outDir}`);
  const actionable = records.filter((r) => r.messageSource !== "skipped-above-min-score");
  console.log(
    `\nTop prospects (most improvement headroom):` +
      actionable
        .slice(0, 5)
        .map(
          (r) =>
            `\n  • ${r.prospect.name} (score ${r.audit.score}) — ${r.topIssues
              .map((i) => i.label)
              .join(", ")}`,
        )
        .join(""),
  );
  console.log("");
}

main().catch((e) => {
  console.error("\n[outreach] fatal:", e instanceof Error ? e.message : e);
  process.exit(1);
});
