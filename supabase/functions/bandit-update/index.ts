// bandit-update — refresh the RevenueRouter bandit posteriors (R1).
//
// Reads recent router_decision rows (each carries the cell context + the chosen
// arm) as IMPRESSIONS, and conversion rows as SUCCESSES, then bumps the
// Beta(alpha, beta) posterior per (cell × arm) via the bump_arm_stat RPC.
// Scheduled (e.g. hourly/daily). Idempotent within a window via a watermark.
//
// POST /functions/v1/bandit-update   body: { sinceHours?: number }
//
// The cell/arm keys MUST match the front-end bandit:
//   cell = "{page_type}|{intent_stage}|{geo_tier}"   arm = "{rail}:{ref}"

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";

interface Body {
  sinceHours?: number;
}

function cellKeyFrom(context: Record<string, unknown> | null): string | null {
  if (!context) return null;
  const pageType = context.pageType ?? context.page_type;
  const intent = context.intentStage ?? context.intent_stage;
  const geo = context.geoTier ?? context.geo_tier ?? 1;
  if (!pageType || !intent) return null;
  return `${pageType}|${intent}|${geo}`;
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    /* empty body is fine */
  }
  const sinceHours = body.sinceHours ?? 24;
  const since = new Date(Date.now() - sinceHours * 3_600_000).toISOString();

  const supabase = adminClient();

  // 1. Impressions: each router_decision for an affiliate/lead/etc arm.
  const { data: decisions, error: dErr } = await supabase
    .from("router_decision")
    .select("id, page_type, context, chosen_rail, chosen_ref, created_at")
    .gte("created_at", since)
    .not("chosen_rail", "is", null);
  if (dErr) return json({ error: dErr.message }, 500);

  // Tally impressions per (cell, arm) and remember decision→(cell,arm) for joins.
  const impressions = new Map<string, { cell: string; arm: string; count: number }>();
  const decisionKey = new Map<string, { cell: string; arm: string }>();
  for (const d of decisions ?? []) {
    const cell = cellKeyFrom(d.context as Record<string, unknown> | null) ?? `${d.page_type}|?|1`;
    const arm = `${d.chosen_rail}:${d.chosen_ref ?? "none"}`;
    const k = `${cell}::${arm}`;
    const entry = impressions.get(k) ?? { cell, arm, count: 0 };
    entry.count += 1;
    impressions.set(k, entry);
    decisionKey.set(d.id, { cell, arm });
  }

  // 2. Conversions in the window, matched to their decision's (cell, arm).
  const { data: conversions, error: cErr } = await supabase
    .from("conversion")
    .select("id, session_id, touch_id, occurred_at")
    .gte("occurred_at", since)
    .in("status", ["approved", "paid"]);
  if (cErr) return json({ error: cErr.message }, 500);

  // Resolve conversion → decision via touch.decision_id.
  const touchIds = (conversions ?? []).map((c) => c.touch_id).filter(Boolean) as string[];
  const touchToDecision = new Map<string, string>();
  if (touchIds.length > 0) {
    const { data: touches } = await supabase
      .from("touch")
      .select("id, decision_id")
      .in("id", touchIds);
    for (const t of touches ?? []) {
      if (t.decision_id) touchToDecision.set(t.id, t.decision_id);
    }
  }

  const successes = new Map<string, number>(); // key cell::arm
  for (const c of conversions ?? []) {
    const decId = c.touch_id ? touchToDecision.get(c.touch_id) : undefined;
    const ck = decId ? decisionKey.get(decId) : undefined;
    if (!ck) continue;
    const k = `${ck.cell}::${ck.arm}`;
    successes.set(k, (successes.get(k) ?? 0) + 1);
  }

  // 3. Bump posteriors per (cell, arm).
  let updated = 0;
  for (const [k, imp] of impressions) {
    const conv = successes.get(k) ?? 0;
    const { error } = await supabase.rpc("bump_arm_stat", {
      p_cell: imp.cell,
      p_arm: imp.arm,
      p_impressions: imp.count,
      p_conversions: conv,
    });
    if (!error) updated++;
  }

  return json({
    ok: true,
    window_hours: sinceHours,
    cells_arms_updated: updated,
    impressions: impressions.size,
    conversions: conversions?.length ?? 0,
  });
});
