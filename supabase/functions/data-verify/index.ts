// data-verify (Constant verification — DATA gate) — scheduled sampling QA over
// the golden `business` records. For a sample it runs four logic-only checks and
// writes one `data_check` row per (target, check_type):
//
//   accuracy     — phone present + E.164 shape, postcode present + UK shape
//   freshness    — last_verified_at within the SLA (soft-flag up to 2× SLA)
//   completeness — joins page_readiness: is the page publishable?
//   provenance   — at least one field_provenance row exists for the business
//
// On a hard accuracy/freshness FAIL it acts CONSERVATIVELY: nudge
// business.data_confidence down a little and, only if confidence is now very
// low, hold the business (status='held') and set its pages to noindex. It never
// deletes or republishes — promotion stays with etl-score.
//
// Runs logic-only: NO external paid services required. Wire it to a cron
// schedule (e.g. daily) or trigger manually.
//
// POST /functions/v1/data-verify
//   body (all optional): { verticalId?, sampleSize?, freshnessSlaDays?, now? }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import {
  type CheckStatus,
  checkPhoneE164,
  checkPostcode,
  freshnessStatus,
} from "../_shared/verify-rules.ts";

type Supabase = ReturnType<typeof adminClient>;

interface Body {
  verticalId?: string;
  sampleSize?: number;
  freshnessSlaDays?: number;
  now?: string;
}

interface BusinessSample {
  id: string;
  status: string | null;
  phone: string | null;
  postcode: string | null;
  data_confidence: number | null;
  last_verified_at: string | null;
}

interface CheckResult {
  target: string;
  check_type: "accuracy" | "freshness" | "completeness" | "provenance";
  status: CheckStatus;
  detail: Record<string, unknown>;
}

const DEFAULT_SAMPLE = 50;
const DEFAULT_SLA_DAYS = 90;
// Conservative nudge: how far we drop confidence on a hard data fail, and the
// floor below which we actually hold the record + noindex its pages.
const CONFIDENCE_PENALTY = 0.1;
const HOLD_CONFIDENCE_FLOOR = 0.2;

/** accuracy: phone E.164 shape + UK postcode shape both present and valid. */
function accuracyCheck(b: BusinessSample): CheckResult {
  const phoneOk = checkPhoneE164(b.phone);
  const postcodeOk = checkPostcode(b.postcode);
  const status: CheckStatus = phoneOk && postcodeOk ? "pass" : !phoneOk && !postcodeOk ? "fail" : "flag";
  return {
    target: b.id,
    check_type: "accuracy",
    status,
    detail: { phoneOk, postcodeOk, phone: b.phone, postcode: b.postcode },
  };
}

/** freshness: age of last_verified_at against the SLA. */
function freshnessCheck(b: BusinessSample, slaDays: number, now: number): CheckResult {
  const status = freshnessStatus(b.last_verified_at, slaDays, now);
  return {
    target: b.id,
    check_type: "freshness",
    status,
    detail: { lastVerifiedAt: b.last_verified_at, slaDays },
  };
}

/** completeness: is the latest page_readiness publishable? */
async function completenessCheck(supabase: Supabase, b: BusinessSample): Promise<CheckResult> {
  const { data } = await supabase
    .from("page_readiness")
    .select("completeness_score, publishable, missing_fields, checked_at")
    .eq("business_id", b.id)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // No readiness row yet → flag (can't confirm completeness), don't fail.
  const status: CheckStatus = data == null ? "flag" : data.publishable ? "pass" : "fail";
  return {
    target: b.id,
    check_type: "completeness",
    status,
    detail: {
      completenessScore: data?.completeness_score ?? null,
      publishable: data?.publishable ?? null,
      missingFields: data?.missing_fields ?? [],
    },
  };
}

/** provenance: at least one field_provenance row exists for the business. */
async function provenanceCheck(supabase: Supabase, b: BusinessSample): Promise<CheckResult> {
  const { count } = await supabase
    .from("field_provenance")
    .select("id", { count: "exact", head: true })
    .eq("business_id", b.id);
  const n = count ?? 0;
  return {
    target: b.id,
    check_type: "provenance",
    status: n > 0 ? "pass" : "fail",
    detail: { provenanceRows: n },
  };
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body = {};
  try {
    // Body is optional for a scheduled run; tolerate an empty/absent body.
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const supabase = adminClient();
  const sampleSize = Math.max(1, Math.min(500, body.sampleSize ?? DEFAULT_SAMPLE));
  const slaDays = body.freshnessSlaDays ?? DEFAULT_SLA_DAYS;
  const now = body.now ? new Date(body.now).getTime() : Date.now();

  // Sample golden records. We verify published + held alike so held records can
  // recover and published ones can be caught regressing.
  let query = supabase
    .from("business")
    .select("id, status, phone, postcode, data_confidence, last_verified_at")
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .limit(sampleSize);
  if (body.verticalId) query = query.eq("vertical_id", body.verticalId);

  const { data: sample, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const results: CheckResult[] = [];
  const tallies = { pass: 0, fail: 0, flag: 0 };
  let held = 0;
  let confidenceLowered = 0;

  for (const b of (sample ?? []) as BusinessSample[]) {
    const checks: CheckResult[] = [
      accuracyCheck(b),
      freshnessCheck(b, slaDays, now),
      await completenessCheck(supabase, b),
      await provenanceCheck(supabase, b),
    ];
    results.push(...checks);
    for (const c of checks) tallies[c.status]++;

    // A hard accuracy or freshness fail erodes trust in the record.
    const hardFail = checks.some(
      (c) => (c.check_type === "accuracy" || c.check_type === "freshness") && c.status === "fail",
    );
    if (hardFail) {
      const current = b.data_confidence ?? 0;
      const next = Math.max(0, Math.round((current - CONFIDENCE_PENALTY) * 1000) / 1000);
      const update: Record<string, unknown> = { data_confidence: next };
      // Only hold (and noindex pages) when confidence has fallen very low —
      // conservative so a single stale check never pulls a good page.
      if (next <= HOLD_CONFIDENCE_FLOOR) {
        update.status = "held";
        held++;
        await supabase
          .from("page")
          .update({ status: "noindex", noindex: true })
          .eq("business_id", b.id);
      }
      await supabase.from("business").update(update).eq("id", b.id);
      confidenceLowered++;
    }
  }

  // Persist the audit trail (one row per check) so /admin/data can render it.
  if (results.length > 0) {
    await supabase.from("data_check").insert(
      results.map((r) => ({
        target: r.target,
        check_type: r.check_type,
        status: r.status,
        detail: r.detail,
      })),
    );
  }

  return json({
    ok: true,
    sampled: sample?.length ?? 0,
    checks: results.length,
    tallies,
    confidenceLowered,
    held,
  });
});
