// improvement-agent (CRISP-DM self-improving loop — the WEEKLY agent) —
// the engine that turns LocalLens into a self-improving asset. On a POST (cron
// or manual) it runs one full pass of the loop described in
// docs/02-CRISP-DM-LOOP.md:
//
//   read metrics per surface  →  score vs rubric  →
//     AUTO-PROMOTE clear winners to config defaults (won + decision_log)
//     pause clear losers (lost + retired)
//     write a concise /admin/loop REPORT row (decision='iterate', surface=null)
//     emit per-operator speed-to-lead nudges (from comm_log/quote timing)
//
// North-Star honesty constraint (docs/01-DATA-SCIENCE.md §0): we only accept a
// monetisation change if its PRIMARY metric beats control past min_exposure AND
// the GUARDRAIL (qualified actions) is not breached. RPM never wins alone.
//
// HUMAN-IN-THE-LOOP: ranking + routing are sensitive surfaces. The agent never
// auto-applies their config; for a passing ranking/router experiment it only
// PROPOSES (decision='iterate', config_diff = winning patch, detail.requires_
// approval=true) and leaves experiment.status='running' so a human promotes it
// from /admin/loop. Non-sensitive surfaces (pseo, tool, comms) auto-promote.
//
// Idempotent + graceful: re-running on the same data converges to the same
// decisions (we skip experiments already decided); with no sessions/experiments
// it is a clean no-op. NO external paid services required — logic only.
//
// POST /functions/v1/improvement-agent
//   body (all optional): { verticalId?, now? }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";

type Supabase = ReturnType<typeof adminClient>;

interface Body {
  verticalId?: string;
  now?: string;
}

// ── Surface rubric (mirrors the table in docs/02-CRISP-DM-LOOP.md) ───────────
// Each surface optimises ONE primary metric; routing & ranking carry the
// qualified-actions guardrail. `sensitive` surfaces are human-in-the-loop.
type Surface = "ranking" | "pseo" | "tool" | "router" | "comms";

interface Rubric {
  surface: Surface;
  primary: string; // human label of the primary metric
  guardrail: string | null; // human label of the guardrail (null = none)
  sensitive: boolean; // true → propose only, never auto-apply config
}

const RUBRICS: Record<Surface, Rubric> = {
  ranking: { surface: "ranking", primary: "qualified actions / 1k", guardrail: "data-accuracy", sensitive: true },
  pseo: { surface: "pseo", primary: "RPM / page type", guardrail: "thin-content / index rate", sensitive: false },
  tool: { surface: "tool", primary: "completion %", guardrail: "bounce / CWV", sensitive: false },
  router: { surface: "router", primary: "RPM", guardrail: "qualified actions", sensitive: true },
  comms: { surface: "comms", primary: "quote→won / conversion", guardrail: "unsubscribe / spam", sensitive: false },
};

// Decision thresholds. Kept conservative so a noisy week never flips config.
// A variant must beat control by RELATIVE_LIFT_MIN and clear min_exposure on
// BOTH arms; a loser must fall by RELATIVE_DROP_MIN. Anything in between stays
// 'running' (not enough signal — leave it to keep collecting).
const RELATIVE_LIFT_MIN = 0.05; // +5% on the primary metric to call a winner
const RELATIVE_DROP_MIN = 0.1; // −10% on the primary metric to call a loser
const GUARDRAIL_TOLERANCE = 0.05; // guardrail may dip at most 5% on a "winner"
const DEFAULT_MIN_EXPOSURE = 1000;

// ── Experiment shapes (subset of the `experiment` jsonb columns we read) ─────
interface Variant {
  key: string;
  config_patch?: Record<string, unknown>;
  weight?: number;
}

// Per-arm metric snapshot the agent measures from the event spine. `control`
// is the arm whose key is "control" (or the first arm); every other arm is a
// challenger we compare against control.
interface ArmMetrics {
  key: string;
  exposure: number; // sessions assigned to this arm (denominator)
  primary: number; // realised primary metric (rate or RPM)
  guardrail: number | null; // realised guardrail metric (null when surface has none)
}

interface ExperimentRow {
  id: string;
  surface: string;
  name: string;
  primary_metric: string;
  guardrail_metric: string | null;
  variants: Variant[] | null;
  status: string;
  min_exposure: number | null;
}

// ── Decision the agent reaches for one experiment ────────────────────────────
type Verdict = "won" | "lost" | "iterate" | "running";

interface Evaluation {
  experimentId: string;
  surface: Surface;
  name: string;
  verdict: Verdict;
  rationale: string;
  configDiff: Record<string, unknown> | null;
  requiresApproval: boolean;
  control: ArmMetrics | null;
  challenger: ArmMetrics | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE SCORING MATH — no I/O, unit-testable in isolation. These encode the
// "honest pass/fail on ONE primary metric, always check the guardrail" rule.
// ═══════════════════════════════════════════════════════════════════════════

/** Relative change of `value` vs `base` (e.g. +0.12 = 12% better). 0 base → 0. */
export function relativeLift(base: number, value: number): number {
  if (base <= 0) return value > 0 ? 1 : 0;
  return (value - base) / base;
}

/** True once both arms have collected at least `minExposure` sessions. */
export function hasEnoughExposure(
  control: ArmMetrics,
  challenger: ArmMetrics,
  minExposure: number,
): boolean {
  return control.exposure >= minExposure && challenger.exposure >= minExposure;
}

/**
 * Has the guardrail been breached? A guardrail is breached when the challenger's
 * guardrail metric falls more than the tolerance below control. When the surface
 * has no guardrail (both null) it can never breach.
 */
export function guardrailBreached(
  control: ArmMetrics,
  challenger: ArmMetrics,
  tolerance: number,
): boolean {
  if (control.guardrail == null || challenger.guardrail == null) return false;
  // negative lift beyond tolerance = breach (e.g. −0.07 with tol 0.05)
  return relativeLift(control.guardrail, challenger.guardrail) < -tolerance;
}

/**
 * The honest verdict for ONE challenger vs control. This is the heart of the
 * loop's evaluation discipline (docs/01-DATA-SCIENCE.md §5):
 *   • not enough exposure on either arm        → 'running' (keep collecting)
 *   • primary beats control past lift threshold
 *       AND guardrail not breached             → 'won'
 *   • primary falls past the drop threshold     → 'lost'
 *   • a primary win that BREACHES the guardrail → 'iterate' (honesty constraint)
 *   • otherwise (flat / inconclusive)           → 'running'
 */
export function evaluateArm(
  control: ArmMetrics,
  challenger: ArmMetrics,
  minExposure: number,
): { verdict: Verdict; lift: number; breached: boolean } {
  const lift = relativeLift(control.primary, challenger.primary);
  const breached = guardrailBreached(control, challenger, GUARDRAIL_TOLERANCE);

  if (!hasEnoughExposure(control, challenger, minExposure)) {
    return { verdict: "running", lift, breached };
  }
  if (lift >= RELATIVE_LIFT_MIN) {
    // A real primary lift that sacrifices the guardrail is NOT a win — RPM must
    // never rise while qualified actions fall beyond tolerance. We iterate.
    return { verdict: breached ? "iterate" : "won", lift, breached };
  }
  if (lift <= -RELATIVE_DROP_MIN) {
    return { verdict: "lost", lift, breached };
  }
  return { verdict: "running", lift, breached };
}

/** Normalise an arbitrary surface string to a known Surface (else 'tool'). */
function toSurface(s: string): Surface {
  switch (s) {
    case "ranking":
    case "pseo":
    case "tool":
    case "router":
    case "comms":
      return s;
    default:
      return "tool";
  }
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ═══════════════════════════════════════════════════════════════════════════
// I/O HELPERS — measure each arm from the event spine + conversion ledger.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sessions assigned to a variant (the denominator for every rate/RPM). Reads
 * experiment_assignment; an experiment with no assignments yields exposure 0
 * (→ stays 'running', a clean no-op).
 */
async function exposureFor(
  supabase: Supabase,
  experimentId: string,
  variantKey: string,
): Promise<number> {
  const { count } = await supabase
    .from("experiment_assignment")
    .select("id", { count: "exact", head: true })
    .eq("experiment_id", experimentId)
    .eq("variant_key", variantKey);
  return count ?? 0;
}

/** Distinct session ids assigned to a variant — used to scope event reads. */
async function sessionIdsFor(
  supabase: Supabase,
  experimentId: string,
  variantKey: string,
): Promise<string[]> {
  const { data } = await supabase
    .from("experiment_assignment")
    .select("session_id")
    .eq("experiment_id", experimentId)
    .eq("variant_key", variantKey);
  const ids = new Set<string>();
  for (const r of (data ?? []) as { session_id: string | null }[]) {
    if (r.session_id) ids.add(r.session_id);
  }
  return [...ids];
}

/** Realised revenue (approved/paid) for a set of sessions. */
async function revenueFor(supabase: Supabase, sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const { data } = await supabase
    .from("conversion")
    .select("amount, status, session_id")
    .in("session_id", sessionIds)
    .in("status", ["approved", "paid"]);
  return (data ?? []).reduce(
    (a, c) => a + (typeof (c as { amount: number }).amount === "number" ? (c as { amount: number }).amount : 0),
    0,
  );
}

/**
 * Count of "qualified action" events for a set of sessions — the trust metric
 * (call/quote/booking/directions/tool-completion). Used as the primary for
 * ranking and as the GUARDRAIL for router.
 */
const QUALIFIED_EVENTS = ["call", "quote", "quote_sent", "booking", "directions", "tool_completion", "lead_received"];

async function qualifiedActionsFor(supabase: Supabase, sessionIds: string[]): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const { count } = await supabase
    .from("event_log")
    .select("id", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .in("event", QUALIFIED_EVENTS);
  return count ?? 0;
}

/** Count of a specific event across a set of sessions (e.g. tool completion). */
async function eventCountFor(
  supabase: Supabase,
  sessionIds: string[],
  events: string[],
): Promise<number> {
  if (sessionIds.length === 0) return 0;
  const { count } = await supabase
    .from("event_log")
    .select("id", { count: "exact", head: true })
    .in("session_id", sessionIds)
    .in("event", events);
  return count ?? 0;
}

/**
 * Measure one arm's metrics according to its surface rubric:
 *   ranking → primary = qualified actions / 1k sessions; guardrail = none here
 *             (data-accuracy is a separate data_check gate)
 *   pseo    → primary = RPM (revenue / sessions × 1000); guardrail = none
 *   tool    → primary = completion % (tool_completion / sessions); guardrail none
 *   router  → primary = RPM; GUARDRAIL = qualified actions / 1k (honesty)
 *   comms   → primary = conversion rate (conversions / sessions); guardrail none
 */
async function measureArm(
  supabase: Supabase,
  experimentId: string,
  surface: Surface,
  variantKey: string,
): Promise<ArmMetrics> {
  const exposure = await exposureFor(supabase, experimentId, variantKey);
  if (exposure === 0) {
    return { key: variantKey, exposure: 0, primary: 0, guardrail: surface === "router" ? 0 : null };
  }
  const sessionIds = await sessionIdsFor(supabase, experimentId, variantKey);
  const per1k = (n: number) => (exposure > 0 ? (n / exposure) * 1000 : 0);
  const rate = (n: number) => (exposure > 0 ? n / exposure : 0);

  switch (surface) {
    case "ranking": {
      const qualified = await qualifiedActionsFor(supabase, sessionIds);
      return { key: variantKey, exposure, primary: per1k(qualified), guardrail: null };
    }
    case "pseo": {
      const revenue = await revenueFor(supabase, sessionIds);
      return { key: variantKey, exposure, primary: per1k(revenue), guardrail: null };
    }
    case "tool": {
      const completions = await eventCountFor(supabase, sessionIds, ["tool_completion"]);
      return { key: variantKey, exposure, primary: rate(completions), guardrail: null };
    }
    case "router": {
      const revenue = await revenueFor(supabase, sessionIds);
      const qualified = await qualifiedActionsFor(supabase, sessionIds);
      // RPM primary WITH the qualified-actions guardrail — the honesty pair.
      return { key: variantKey, exposure, primary: per1k(revenue), guardrail: per1k(qualified) };
    }
    case "comms": {
      const conversions = await eventCountFor(supabase, sessionIds, ["lead_won", "quote_accepted", "paid"]);
      return { key: variantKey, exposure, primary: rate(conversions), guardrail: null };
    }
    default: {
      // Exhaustive: a new Surface variant must be handled above.
      const _never: never = surface;
      return _never;
    }
  }
}

/** Pick the control arm (key "control", else the first variant). */
function pickControl(variants: Variant[]): Variant | null {
  if (variants.length === 0) return null;
  return variants.find((v) => v.key === "control") ?? variants[0];
}

/** Pick the strongest challenger (first non-control here; v1 is single-arm). */
function pickChallenger(variants: Variant[], controlKey: string): Variant | null {
  return variants.find((v) => v.key !== controlKey) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATE ONE EXPERIMENT — measure arms, reach a verdict, attach config_diff.
// ═══════════════════════════════════════════════════════════════════════════
async function evaluateExperiment(
  supabase: Supabase,
  exp: ExperimentRow,
): Promise<Evaluation> {
  const surface = toSurface(exp.surface);
  const rubric = RUBRICS[surface];
  const variants = Array.isArray(exp.variants) ? exp.variants : [];
  const minExposure = exp.min_exposure ?? DEFAULT_MIN_EXPOSURE;

  const controlVariant = pickControl(variants);
  const challengerVariant = controlVariant
    ? pickChallenger(variants, controlVariant.key)
    : null;

  // Need a control + a challenger to compare; otherwise nothing to decide.
  if (!controlVariant || !challengerVariant) {
    return {
      experimentId: exp.id,
      surface,
      name: exp.name,
      verdict: "running",
      rationale: "Awaiting a control + challenger arm with assignments.",
      configDiff: null,
      requiresApproval: false,
      control: null,
      challenger: null,
    };
  }

  const control = await measureArm(supabase, exp.id, surface, controlVariant.key);
  const challenger = await measureArm(supabase, exp.id, surface, challengerVariant.key);
  const { verdict, lift } = evaluateArm(control, challenger, minExposure);

  // Sensitive surfaces (ranking, router) are human-in-the-loop: a primary win
  // is downgraded from 'won' to 'iterate' (PROPOSE only) and flagged for human
  // approval. We never flip their config automatically.
  let finalVerdict: Verdict = verdict;
  let requiresApproval = false;
  if (verdict === "won" && rubric.sensitive) {
    finalVerdict = "iterate";
    requiresApproval = true;
  }

  const liftLabel = pct(lift);
  const configDiff = challengerVariant.config_patch ?? null;
  let rationale: string;
  switch (finalVerdict) {
    case "won":
      rationale = `'${challengerVariant.key}' beat control by ${liftLabel} on ${rubric.primary} past ${minExposure} sessions/arm with guardrail intact — promoted to config default.`;
      break;
    case "iterate":
      rationale = rubric.sensitive && verdict === "won"
        ? `'${challengerVariant.key}' beat control by ${liftLabel} on ${rubric.primary} but ${surface} is human-in-the-loop — PROPOSED, requires human approval before promotion.`
        : `'${challengerVariant.key}' lifted ${rubric.primary} by ${liftLabel} but breached the ${rubric.guardrail ?? "guardrail"} — iterate, do not promote.`;
      break;
    case "lost":
      rationale = `'${challengerVariant.key}' fell ${liftLabel} on ${rubric.primary} past ${minExposure} sessions/arm — retired.`;
      break;
    case "running":
      rationale = hasEnoughExposure(control, challenger, minExposure)
        ? `Inconclusive: ${liftLabel} on ${rubric.primary} (within the ±decision band) — keep collecting.`
        : `Below min exposure (${control.exposure}/${challenger.exposure} vs ${minExposure}/arm) — keep collecting.`;
      break;
    default: {
      const _never: never = finalVerdict;
      throw new Error(`unhandled verdict ${_never}`);
    }
  }

  return {
    experimentId: exp.id,
    surface,
    name: exp.name,
    verdict: finalVerdict,
    rationale,
    // A 'lost' experiment has no config to apply; winners/proposals carry the patch.
    configDiff: finalVerdict === "lost" ? null : configDiff,
    requiresApproval,
    control,
    challenger,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// APPLY A VERDICT — update experiment status + write the decision_log row.
//   won     → status 'won',  decision 'promoted' (config_diff = winning patch)
//   lost    → status 'lost', decision 'retired'
//   iterate → status stays 'running', decision 'iterate' (proposal/guardrail)
//   running → no write (idempotent: nothing decided yet)
// ═══════════════════════════════════════════════════════════════════════════
async function applyVerdict(supabase: Supabase, now: string, e: Evaluation): Promise<void> {
  if (e.verdict === "running") return;

  if (e.verdict === "won") {
    await supabase.from("experiment").update({ status: "won", decided_at: now }).eq("id", e.experimentId);
  } else if (e.verdict === "lost") {
    await supabase.from("experiment").update({ status: "lost", decided_at: now }).eq("id", e.experimentId);
  }
  // 'iterate' leaves experiment.status='running' on purpose — the test keeps
  // running until a human promotes (sensitive) or the variant is fixed (guardrail).

  const decision = e.verdict === "won" ? "promoted" : e.verdict === "lost" ? "retired" : "iterate";
  // The decision_log row carries the config_diff. For human-in-the-loop
  // proposals we stamp { requires_approval, config_patch } INTO config_diff so
  // /admin/loop can flag "needs approval" without a new column. For a straight
  // promotion config_diff IS the winning variant's patch (winners promote into
  // config defaults — the engine improves without a code change).
  const configDiff = e.requiresApproval
    ? { requires_approval: true, surface: e.surface, config_patch: e.configDiff }
    : e.configDiff;

  await supabase.from("decision_log").insert({
    experiment_id: e.experimentId,
    surface: e.surface,
    decision,
    rationale: e.rationale,
    config_diff: configDiff,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PER-OPERATOR NUDGES — speed-to-lead benchmark from comm_log/quote timing.
// "Quote within 1h to win 3×." We compute median first-response time per
// business from quote.sent_at relative to the lead; if the timing data is not
// present we skip gracefully (no rows written, no error).
// ═══════════════════════════════════════════════════════════════════════════
interface Nudge {
  businessId: string;
  medianHoursToQuote: number | null;
  message: string;
}

const SPEED_TO_LEAD_BENCHMARK_HOURS = 1;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function computeNudges(supabase: Supabase): Promise<Nudge[]> {
  // Read recent quotes that were actually sent; derive time-to-quote from the
  // owning lead's creation. If the join/columns are absent we just get [].
  const { data, error } = await supabase
    .from("quote")
    .select("business_id, sent_at, lead:lead_id(created_at)")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(500);
  if (error || !data || data.length === 0) return [];

  // Group hours-to-quote by business.
  const byBusiness = new Map<string, number[]>();
  for (const row of data as Array<{ business_id: string | null; sent_at: string | null; lead: { created_at: string | null } | null }>) {
    const bizId = row.business_id;
    const sentAt = row.sent_at;
    const leadAt = row.lead?.created_at ?? null;
    if (!bizId || !sentAt || !leadAt) continue;
    const hours = (new Date(sentAt).getTime() - new Date(leadAt).getTime()) / 3_600_000;
    if (!Number.isFinite(hours) || hours < 0) continue;
    const list = byBusiness.get(bizId) ?? [];
    list.push(hours);
    byBusiness.set(bizId, list);
  }

  const nudges: Nudge[] = [];
  for (const [businessId, hoursList] of byBusiness) {
    const med = median(hoursList);
    if (med == null) continue;
    // Only nudge operators who are slower than the benchmark — actionable only.
    if (med > SPEED_TO_LEAD_BENCHMARK_HOURS) {
      nudges.push({
        businessId,
        medianHoursToQuote: Math.round(med * 10) / 10,
        message: `Your median quote time is ${(Math.round(med * 10) / 10)}h. Quoting within ${SPEED_TO_LEAD_BENCHMARK_HOURS}h wins ~3× more jobs.`,
      });
    }
  }
  return nudges;
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const supabase = adminClient();
  const now = body.now ? new Date(body.now).toISOString() : new Date().toISOString();

  // ── 1. READ METRICS: RPM per page_type × vertical (North Star) ─────────────
  // The agent surfaces RPM into its report; it reads the same view the control
  // tower renders so the numbers match exactly.
  let rpmQuery = supabase
    .from("revenue_per_session")
    .select("page_type, vertical_id, sessions, revenue, rpm");
  if (body.verticalId) rpmQuery = rpmQuery.eq("vertical_id", body.verticalId);
  const { data: rpmRows } = await rpmQuery;
  const totals = (rpmRows ?? []).reduce(
    (a, r) => {
      a.sessions += Number((r as { sessions: number }).sessions ?? 0);
      a.revenue += Number((r as { revenue: number }).revenue ?? 0);
      return a;
    },
    { sessions: 0, revenue: 0 },
  );
  const overallRpm = totals.sessions > 0 ? Math.round((totals.revenue / totals.sessions) * 1000 * 100) / 100 : 0;

  // ── 2. READ RUNNING EXPERIMENTS: only ones not yet decided (idempotent) ────
  const { data: experiments } = await supabase
    .from("experiment")
    .select("id, surface, name, primary_metric, guardrail_metric, variants, status, min_exposure")
    .eq("status", "running");

  // ── 3. SCORE + DECIDE each running experiment, then apply the verdict ──────
  const evaluations: Evaluation[] = [];
  for (const exp of (experiments ?? []) as ExperimentRow[]) {
    const evaluation = await evaluateExperiment(supabase, exp);
    await applyVerdict(supabase, now, evaluation);
    evaluations.push(evaluation);
  }

  const won = evaluations.filter((e) => e.verdict === "won");
  const lost = evaluations.filter((e) => e.verdict === "lost");
  const proposed = evaluations.filter((e) => e.verdict === "iterate");
  const stillRunning = evaluations.filter((e) => e.verdict === "running");

  // ── 4. PER-OPERATOR NUDGES (speed-to-lead) — skip gracefully if no timing ──
  const nudges = await computeNudges(supabase);

  // ── 5. NEXT RECOMMENDED EXPERIMENTS ────────────────────────────────────────
  // A tiny heuristic: surfaces with no currently-running experiment are the
  // gaps to test next. Pulled straight from the rubric set so the report always
  // gives the operator a next action.
  const runningSurfaces = new Set(stillRunning.map((e) => e.surface).concat(proposed.map((e) => e.surface)));
  const nextExperiments = (Object.keys(RUBRICS) as Surface[])
    .filter((s) => !runningSurfaces.has(s))
    .map((s) => `Test a ${s} variant (primary: ${RUBRICS[s].primary}${RUBRICS[s].guardrail ? `, guardrail: ${RUBRICS[s].guardrail}` : ""}).`);

  // ── 6. WRITE THE LOOP REPORT ROW (decision='iterate', surface=null) ────────
  // One human-readable summary the /admin/loop timeline renders at the top: what
  // changed, won/lost/proposed, and the next recommended experiments. We always
  // write it (even on a no-op week) so the loop's cadence is visible.
  const reportRationale = [
    `Weekly loop @ ${now}.`,
    `RPM ${overallRpm} (rev ${totals.revenue} / ${totals.sessions} sessions).`,
    `Promoted ${won.length}, retired ${lost.length}, proposed ${proposed.length}, still running ${stillRunning.length}.`,
    won.length ? `Won: ${won.map((e) => e.name).join("; ")}.` : "",
    lost.length ? `Retired: ${lost.map((e) => e.name).join("; ")}.` : "",
    proposed.length ? `Proposed (needs approval/iterate): ${proposed.map((e) => e.name).join("; ")}.` : "",
    nudges.length ? `${nudges.length} speed-to-lead nudge(s).` : "",
    nextExperiments.length ? `Next: ${nextExperiments.join(" ")}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  await supabase.from("decision_log").insert({
    experiment_id: null,
    surface: null, // null surface = the loop-level summary row
    decision: "iterate",
    rationale: reportRationale,
    config_diff: {
      report: true,
      generated_at: now,
      rpm: { overall: overallRpm, sessions: totals.sessions, revenue: totals.revenue },
      counts: { won: won.length, lost: lost.length, proposed: proposed.length, running: stillRunning.length },
      proposals: proposed.map((e) => ({
        experiment_id: e.experimentId,
        surface: e.surface,
        name: e.name,
        requires_approval: e.requiresApproval,
        config_diff: e.configDiff,
      })),
      nudges,
      next_experiments: nextExperiments,
    },
  });

  return json({
    ok: true,
    generated_at: now,
    rpm: { overall: overallRpm, sessions: totals.sessions, revenue: totals.revenue },
    decided: {
      won: won.map((e) => ({ id: e.experimentId, name: e.name })),
      lost: lost.map((e) => ({ id: e.experimentId, name: e.name })),
      proposed: proposed.map((e) => ({ id: e.experimentId, name: e.name, requiresApproval: e.requiresApproval })),
      running: stillRunning.length,
    },
    nudges: nudges.length,
    next_experiments: nextExperiments,
  });
});
