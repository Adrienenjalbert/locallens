// etl-keywords (Stage: Opportunity / Market-Entry) — for each keyword in a
// vertical, compute the PROFIT-AWARE opportunity score and queue the pages worth
// building. This is the live-loop counterpart of the `tools/seo/` research CLI:
// the CLI explores candidates off-platform; this function scores the persisted
// `keyword` rows and writes `keyword.opportunity_score`, then queues `page`
// rows for buildable candidates (status='queued', noindex=true until readiness
// promotes them). The CRISP-DM pSEO + market-entry surface reads from here.
//
//   opportunity = volume × intent × competition_gap × affiliate_rpm_potential × supply_readiness
//
// POST /functions/v1/etl-keywords
//   body: { verticalId }
//
// The two profit-aware factors are derived per vertical (not stored per keyword):
//   • affiliate_rpm_potential ← active affiliate offers' EPC for the vertical
//   • supply_readiness        ← density of published businesses (confident data)

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import {
  computeOpportunity,
  type IntentStage,
  type IntentValue,
} from "../_shared/scoring.ts";

interface Body {
  verticalId: string;
}

// DB enums use underscores (funnel_stage = research|compare|hire_now); the model
// uses the hyphenated form. Map at the boundary so the math stays identical to
// the Node source of truth.
function toIntentStage(funnel: string | null): IntentStage {
  switch (funnel) {
    case "hire_now":
      return "hire-now";
    case "compare":
      return "compare";
    default:
      return "research";
  }
}

function toIntentValue(intent: string | null): IntentValue {
  return intent === "high" || intent === "low" ? intent : "medium";
}

/** Map an `intent_value` keyword to the page type we'd publish for it. */
function pageTypeFor(funnel: string | null): string {
  return funnel === "research" ? "guide" : "location";
}

/**
 * Affiliate-RPM potential in [0,1] from active offers for this vertical. EPC is
 * £/click; we saturate so ~£0.50 EPC ≈ 0.5 and high-EPC offers approach 1. With
 * no active offers we still allow a small floor so demand isn't fully zeroed.
 */
function affiliatePotential(epcs: number[]): number {
  if (epcs.length === 0) return 0.15;
  const bestEpc = Math.max(...epcs);
  return Math.min(1, bestEpc / (bestEpc + 0.5));
}

/**
 * Supply readiness in [0,1] from published-business density. More confident
 * golden records = more useful pages. ~10 published businesses ≈ 0.5.
 */
function supplyReadiness(publishedCount: number): number {
  if (publishedCount <= 0) return 0;
  return publishedCount / (publishedCount + 10);
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.verticalId) return json({ error: "verticalId required" }, 400);

  const supabase = adminClient();

  // Derive the per-vertical profit-aware factors once.
  const { data: offers } = await supabase
    .from("affiliate_offer")
    .select("epc, vertical_ids, status")
    .eq("status", "active");
  const epcs = (offers ?? [])
    .filter(
      (o) =>
        !Array.isArray(o.vertical_ids) ||
        o.vertical_ids.length === 0 ||
        o.vertical_ids.includes(body.verticalId),
    )
    .map((o) => Number(o.epc ?? 0))
    .filter((x) => x > 0);
  const affiliateRpmPotential = affiliatePotential(epcs);

  const { count: publishedCount } = await supabase
    .from("business")
    .select("id", { count: "exact", head: true })
    .eq("vertical_id", body.verticalId)
    .eq("status", "published");
  const supply = supplyReadiness(publishedCount ?? 0);

  const { data: keywords, error } = await supabase
    .from("keyword")
    .select("id, query, volume, intent, funnel, competition, page_id")
    .eq("vertical_id", body.verticalId);
  if (error) return json({ error: error.message }, 500);

  let scored = 0;
  let buildable = 0;
  let queued = 0;

  for (const k of keywords ?? []) {
    // competition_gap = how winnable (1 - competition); default to a mid gap
    // when competition is unknown (still gated by the build threshold).
    const competitionGap =
      k.competition == null ? 0.5 : Math.max(0, Math.min(1, 1 - Number(k.competition)));

    const result = computeOpportunity({
      volume: Number(k.volume ?? 0),
      intentStage: toIntentStage(k.funnel),
      intentValue: toIntentValue(k.intent),
      competitionGap,
      affiliateRpmPotential,
      supplyReadiness: supply,
    });

    // numeric(6,2) column → round to 2dp at the write site (the pure score is 3dp).
    const stored = Math.round(result.score * 100) / 100;
    await supabase
      .from("keyword")
      .update({ opportunity_score: stored })
      .eq("id", k.id);
    scored++;

    if (!result.shouldBuild) continue;
    buildable++;

    // Queue a page row for buildable candidates that don't already have one.
    // Readiness (etl-score) promotes status/noindex later; we queue safe.
    if (k.page_id) continue;
    const pageType = pageTypeFor(k.funnel);
    const url = `/${pageType}/${k.query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}/`;

    const { data: page } = await supabase
      .from("page")
      .upsert(
        {
          type: pageType,
          url,
          vertical_id: body.verticalId,
          status: "queued",
          noindex: true,
          funnel: k.funnel ?? "research",
        },
        { onConflict: "url", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    if (page?.id) {
      await supabase.from("keyword").update({ page_id: page.id }).eq("id", k.id);
      queued++;
    }
  }

  return json({
    ok: true,
    verticalId: body.verticalId,
    factors: { affiliateRpmPotential, supplyReadiness: supply, publishedCount: publishedCount ?? 0 },
    scored,
    buildable,
    queued,
  });
});
