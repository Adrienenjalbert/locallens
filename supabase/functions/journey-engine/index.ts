// journey-engine — the scheduled lifecycle runner.
//
// On POST (run it from a cron schedule, e.g. every 5 min, or trigger manually)
// it evaluates every ENABLED journey, finds the trigger records whose steps are
// now DUE, sends each due step through its channel, and writes the outcome to
// comm_log. Idempotent: a (journey, customer, step) tuple is sent at most once,
// guarded by an existing comm_log row, so re-running the cron never double-sends.
//
// POST /functions/v1/journey-engine
//   body (all optional): { businessId?, now?, dryRun? }
//     businessId — restrict to one business (default: all with enabled journeys)
//     now        — ISO override for testing the "due" window
//     dryRun     — evaluate + log "skipped" reasoning without sending
//
// Comms providers: email = Resend (RESEND_API_KEY); sms/whatsapp = Twilio
// (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_SMS / TWILIO_FROM_WHATSAPP).
// When keys are absent we GRACEFULLY no-op (log only) so the engine — and its
// comm_log audit trail — can be exercised locally before live keys exist.

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import {
  type CommChannel,
  DEFAULT_JOURNEYS,
  type JourneyDefinition,
  type JourneyPlaceholder,
  type JourneyStep,
  type JourneyTrigger,
  renderTemplate,
} from "../_shared/journeys.ts";

type Supabase = ReturnType<typeof adminClient>;

interface Body {
  businessId?: string;
  now?: string;
  dryRun?: boolean;
}

interface SendResult {
  ok: boolean;
  provider: "resend" | "twilio" | "noop";
  detail?: string;
}

const SITE_ORIGIN = Deno.env.get("SITE_ORIGIN") ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Provider adapters. Each returns a SendResult; missing keys → graceful no-op.
// ─────────────────────────────────────────────────────────────────────────────
async function sendComm(
  channel: CommChannel,
  to: string,
  subject: string,
  body: string,
): Promise<SendResult> {
  if (!to) return { ok: false, provider: "noop", detail: "no recipient" };

  switch (channel) {
    case "email":
      return await sendEmail(to, subject, body);
    case "sms":
      return await sendTwilio(to, body, "sms");
    case "whatsapp":
      return await sendTwilio(to, body, "whatsapp");
    default: {
      const _exhaustive: never = channel;
      return { ok: false, provider: "noop", detail: `unknown channel ${_exhaustive}` };
    }
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") ?? "LocalLens <onboarding@resend.dev>";
  if (!apiKey) {
    console.log(`[journey-engine] no RESEND_API_KEY — would email ${to}: ${subject}`);
    return { ok: true, provider: "noop", detail: "RESEND_API_KEY absent; logged only" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text: body }),
    });
    if (!res.ok) {
      return { ok: false, provider: "resend", detail: `resend ${res.status}: ${await res.text()}` };
    }
    return { ok: true, provider: "resend" };
  } catch (e) {
    return { ok: false, provider: "resend", detail: e instanceof Error ? e.message : String(e) };
  }
}

async function sendTwilio(
  to: string,
  body: string,
  mode: "sms" | "whatsapp",
): Promise<SendResult> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromSms = Deno.env.get("TWILIO_FROM_SMS");
  const fromWa = Deno.env.get("TWILIO_FROM_WHATSAPP");
  const from = mode === "whatsapp" ? fromWa : fromSms;

  if (!sid || !token || !from) {
    console.log(`[journey-engine] no TWILIO_* — would ${mode} ${to}: ${body.slice(0, 60)}…`);
    return { ok: true, provider: "noop", detail: "TWILIO_* absent; logged only" };
  }

  const toAddr = mode === "whatsapp" ? `whatsapp:${to}` : to;
  const fromAddr = mode === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;

  try {
    const form = new URLSearchParams({ To: toAddr, From: fromAddr, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );
    if (!res.ok) {
      return { ok: false, provider: "twilio", detail: `twilio ${res.status}: ${await res.text()}` };
    }
    return { ok: true, provider: "twilio" };
  } catch (e) {
    return { ok: false, provider: "twilio", detail: e instanceof Error ? e.message : String(e) };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trigger sourcing. Each journey maps to a set of (record → due steps). We keep
// the queries defensive: if a table/column is missing locally the journey simply
// yields no work rather than throwing.
// ─────────────────────────────────────────────────────────────────────────────

interface DueItem {
  businessId: string;
  customerId: string | null;
  /** Stable key for the triggering record — used for idempotency + audit. */
  anchorId: string;
  channel: CommChannel;
  to: string;
  subject: string;
  body: string;
  /** Index of the step within the journey (idempotency dimension). */
  stepIndex: number;
}

type ProfileLookup = (businessId: string) => Promise<BusinessCtx>;

interface BusinessCtx {
  business_name: string;
  profile_url: string;
  slug: string | null;
}

function publicProfileUrl(slug: string | null, businessId: string): string {
  const base = SITE_ORIGIN || "";
  const path = slug ? `/business/${slug}` : `/business/${businessId}`;
  return `${base}${path}`;
}

function minutesSince(iso: string | null, now: number): number {
  if (!iso) return -Infinity;
  return (now - new Date(iso).getTime()) / 60_000;
}

function minutesUntil(iso: string | null, now: number): number {
  if (!iso) return Infinity;
  return (new Date(iso).getTime() - now) / 60_000;
}

/** A step is "due" when its delay window has opened within the last `WINDOW_MIN`
 *  minutes of cron cadence. Idempotency (comm_log) prevents re-sends, so a
 *  generous window only ever helps catch up after downtime. */
const WINDOW_MIN = 24 * 60;

function stepDueByElapsed(step: JourneyStep, elapsedMin: number): boolean {
  return elapsedMin >= step.delay_min && elapsedMin < step.delay_min + WINDOW_MIN;
}

function pickRecipient(channel: CommChannel, email: string | null, phone: string | null): string {
  return channel === "email" ? (email ?? "") : (phone ?? "");
}

async function collectDueItems(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  switch (journey.trigger) {
    case "new_lead":
      return await fromLeads(supabase, journey, businessId, now, getCtx);
    case "quote_followup":
      return await fromQuotes(supabase, journey, businessId, now, getCtx);
    case "job_booked":
      return await fromJobs(supabase, journey, businessId, now, getCtx, "booked");
    case "day_before":
      return await fromJobsDayBefore(supabase, journey, businessId, now, getCtx);
    case "job_completed":
      return await fromJobs(supabase, journey, businessId, now, getCtx, "completed");
    case "invoice_overdue":
      return await fromInvoices(supabase, journey, businessId, now, getCtx);
    case "lapsed_reengagement":
      return await fromLapsed(supabase, journey, businessId, now, getCtx);
    default: {
      const _exhaustive: never = journey.trigger;
      console.warn(`[journey-engine] unhandled trigger ${_exhaustive}`);
      return [];
    }
  }
}

// deno-lint-ignore no-explicit-any
function applyBusinessFilter<T>(query: any, businessId: string | undefined): T {
  return businessId ? query.eq("business_id", businessId) : query;
}

async function customerById(
  supabase: Supabase,
  cache: Map<string, { name: string; email: string | null; phone: string | null }>,
  customerId: string | null,
): Promise<{ name: string; email: string | null; phone: string | null } | null> {
  if (!customerId) return null;
  const hit = cache.get(customerId);
  if (hit) return hit;
  const { data } = await supabase
    .from("customer")
    .select("name, email, phone")
    .eq("id", customerId)
    .single();
  if (!data) return null;
  const row = { name: data.name, email: data.email, phone: data.phone };
  cache.set(customerId, row);
  return row;
}

function renderStep(
  step: JourneyStep,
  vars: Partial<Record<JourneyPlaceholder, string | number | null | undefined>>,
): { subject: string; body: string } {
  return {
    subject: renderTemplate(step.subject ?? "", vars),
    body: renderTemplate(step.body, vars),
  };
}

async function fromLeads(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("lead")
      .select("id, business_id, contact_name, contact_email, contact_phone, received_at")
      .order("received_at", { ascending: false })
      .limit(500),
    businessId,
  );
  const items: DueItem[] = [];
  for (const lead of data ?? []) {
    const elapsed = minutesSince(lead.received_at, now);
    const ctx = await getCtx(lead.business_id);
    journey.steps.forEach((step, i) => {
      if (!stepDueByElapsed(step, elapsed)) return;
      const to = pickRecipient(step.channel, lead.contact_email, lead.contact_phone);
      const { subject, body } = renderStep(step, {
        customer_name: lead.contact_name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
      });
      items.push({
        businessId: lead.business_id,
        customerId: null,
        anchorId: lead.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

async function fromQuotes(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("quote")
      .select("id, business_id, customer_id, status, sent_at, public_token")
      .in("status", ["sent", "viewed"])
      .limit(500),
    businessId,
  );
  const cache = new Map<string, { name: string; email: string | null; phone: string | null }>();
  const items: DueItem[] = [];
  for (const quote of data ?? []) {
    const elapsed = minutesSince(quote.sent_at, now);
    const customer = await customerById(supabase, cache, quote.customer_id);
    const ctx = await getCtx(quote.business_id);
    journey.steps.forEach((step, i) => {
      if (!stepDueByElapsed(step, elapsed)) return;
      const to = pickRecipient(step.channel, customer?.email ?? null, customer?.phone ?? null);
      const { subject, body } = renderStep(step, {
        customer_name: customer?.name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
        quote_url: quote.public_token
          ? `${SITE_ORIGIN}/quote/${quote.public_token}`
          : ctx.profile_url,
      });
      items.push({
        businessId: quote.business_id,
        customerId: quote.customer_id,
        anchorId: quote.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

async function fromJobs(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
  status: "booked" | "completed",
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("job")
      .select("id, business_id, customer_id, title, status, scheduled_at, completed_at")
      .eq("status", status)
      .limit(500),
    businessId,
  );
  const cache = new Map<string, { name: string; email: string | null; phone: string | null }>();
  const items: DueItem[] = [];
  for (const jobRow of data ?? []) {
    const anchor = status === "completed" ? jobRow.completed_at : jobRow.scheduled_at;
    const elapsed = minutesSince(anchor, now);
    const customer = await customerById(supabase, cache, jobRow.customer_id);
    const ctx = await getCtx(jobRow.business_id);
    journey.steps.forEach((step, i) => {
      if (!stepDueByElapsed(step, elapsed)) return;
      const to = pickRecipient(step.channel, customer?.email ?? null, customer?.phone ?? null);
      const { subject, body } = renderStep(step, {
        customer_name: customer?.name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
        job_title: jobRow.title ?? "your job",
        job_date: anchor ? new Date(anchor).toLocaleDateString("en-GB") : "",
        invoice_url: ctx.profile_url,
        invoice_total: "",
      });
      items.push({
        businessId: jobRow.business_id,
        customerId: jobRow.customer_id,
        anchorId: jobRow.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

async function fromJobsDayBefore(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("job")
      .select("id, business_id, customer_id, title, status, scheduled_at")
      .eq("status", "booked")
      .not("scheduled_at", "is", null)
      .limit(500),
    businessId,
  );
  const cache = new Map<string, { name: string; email: string | null; phone: string | null }>();
  const items: DueItem[] = [];
  for (const jobRow of data ?? []) {
    // "Day before" = the appointment is ~24h out (within the cron window).
    const untilMin = minutesUntil(jobRow.scheduled_at, now);
    if (untilMin > 24 * 60 || untilMin <= 24 * 60 - WINDOW_MIN) continue;
    const customer = await customerById(supabase, cache, jobRow.customer_id);
    const ctx = await getCtx(jobRow.business_id);
    journey.steps.forEach((step, i) => {
      const to = pickRecipient(step.channel, customer?.email ?? null, customer?.phone ?? null);
      const { subject, body } = renderStep(step, {
        customer_name: customer?.name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
        job_title: jobRow.title ?? "your job",
        job_date: jobRow.scheduled_at
          ? new Date(jobRow.scheduled_at).toLocaleDateString("en-GB")
          : "",
      });
      items.push({
        businessId: jobRow.business_id,
        customerId: jobRow.customer_id,
        anchorId: jobRow.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

async function fromInvoices(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("invoice")
      .select("id, business_id, customer_id, total, status, due_at, public_token")
      .in("status", ["sent", "overdue"])
      .not("due_at", "is", null)
      .limit(500),
    businessId,
  );
  const cache = new Map<string, { name: string; email: string | null; phone: string | null }>();
  const items: DueItem[] = [];
  for (const inv of data ?? []) {
    // delay_min is measured from the due date for overdue reminders.
    const elapsed = minutesSince(inv.due_at, now);
    if (elapsed < 0) continue;
    const customer = await customerById(supabase, cache, inv.customer_id);
    const ctx = await getCtx(inv.business_id);
    const total = typeof inv.total === "number"
      ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(inv.total)
      : "";
    journey.steps.forEach((step, i) => {
      if (!stepDueByElapsed(step, elapsed)) return;
      const to = pickRecipient(step.channel, customer?.email ?? null, customer?.phone ?? null);
      const { subject, body } = renderStep(step, {
        customer_name: customer?.name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
        invoice_total: total,
        invoice_url: inv.public_token
          ? `${SITE_ORIGIN}/invoice/${inv.public_token}`
          : ctx.profile_url,
      });
      items.push({
        businessId: inv.business_id,
        customerId: inv.customer_id,
        anchorId: inv.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

async function fromLapsed(
  supabase: Supabase,
  journey: JourneyDefinition,
  businessId: string | undefined,
  now: number,
  getCtx: ProfileLookup,
): Promise<DueItem[]> {
  const { data } = await applyBusinessFilter(
    supabase
      .from("customer")
      .select("id, business_id, name, email, phone, status, created_at")
      .eq("status", "lapsed")
      .limit(500),
    businessId,
  );
  const items: DueItem[] = [];
  for (const cust of data ?? []) {
    // Re-engagement fires once the customer is flagged lapsed; anchor on created_at
    // as a stable reference (a real impl would track last_job_at).
    const elapsed = minutesSince(cust.created_at, now);
    const ctx = await getCtx(cust.business_id);
    journey.steps.forEach((step, i) => {
      if (!stepDueByElapsed(step, elapsed)) return;
      const to = pickRecipient(step.channel, cust.email, cust.phone);
      const { subject, body } = renderStep(step, {
        customer_name: cust.name ?? "there",
        business_name: ctx.business_name,
        profile_url: ctx.profile_url,
      });
      items.push({
        businessId: cust.business_id,
        customerId: cust.id,
        anchorId: cust.id,
        channel: step.channel,
        to,
        subject,
        body,
        stepIndex: i,
      });
    });
  }
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency: a step is identified in comm_log via outcome.anchor_id +
// outcome.step_index + journey. We pre-load already-sent keys per business so the
// hot loop is a cheap Set lookup rather than a query per item.
// ─────────────────────────────────────────────────────────────────────────────
function sentKey(journey: JourneyTrigger, anchorId: string, stepIndex: number): string {
  return `${journey}::${anchorId}::${stepIndex}`;
}

async function loadAlreadySent(
  supabase: Supabase,
  businessId: string | undefined,
): Promise<Set<string>> {
  const sent = new Set<string>();
  const base = supabase
    .from("comm_log")
    .select("journey, outcome")
    .not("outcome", "is", null)
    .order("sent_at", { ascending: false })
    .limit(5000);
  const { data } = await applyBusinessFilter<{ then: unknown }>(base, businessId) as unknown as {
    data: Array<{ journey: string | null; outcome: Record<string, unknown> | null }> | null;
  };
  for (const row of data ?? []) {
    const anchorId = row.outcome?.anchor_id;
    const stepIndex = row.outcome?.step_index;
    if (row.journey && typeof anchorId === "string" && typeof stepIndex === "number") {
      sent.add(sentKey(row.journey as JourneyTrigger, anchorId, stepIndex));
    }
  }
  return sent;
}

// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const now = body.now ? new Date(body.now).getTime() : Date.now();
  if (Number.isNaN(now)) return json({ error: "invalid now" }, 400);
  const dryRun = Boolean(body.dryRun);

  const supabase = adminClient();

  // Which journeys are enabled? journey.trigger holds the trigger key; rows with
  // business_id = null are vertical/global defaults applying to every business.
  const enabledQuery = supabase
    .from("journey")
    .select("id, business_id, trigger, enabled")
    .eq("enabled", true);
  const { data: enabledRows } = body.businessId
    ? await enabledQuery.or(`business_id.eq.${body.businessId},business_id.is.null`)
    : await enabledQuery;

  // If the journey table hasn't been seeded yet, fall back to the default library
  // so a fresh business still gets sensible automation out of the box.
  const enabledTriggers: Set<JourneyTrigger> = (enabledRows && enabledRows.length > 0)
    ? new Set(enabledRows.map((r) => r.trigger as JourneyTrigger))
    : new Set(DEFAULT_JOURNEYS.filter((j) => j.enabledByDefault).map((j) => j.trigger));

  // Per-business profile context cache (business_name + public profile URL).
  const ctxCache = new Map<string, BusinessCtx>();
  const getCtx: ProfileLookup = async (bizId: string) => {
    const hit = ctxCache.get(bizId);
    if (hit) return hit;
    const { data } = await supabase
      .from("business")
      .select("id, name, slug")
      .eq("id", bizId)
      .single();
    const ctx: BusinessCtx = {
      business_name: data?.name ?? "your provider",
      slug: data?.slug ?? null,
      profile_url: publicProfileUrl(data?.slug ?? null, bizId),
    };
    ctxCache.set(bizId, ctx);
    return ctx;
  };

  const alreadySent = await loadAlreadySent(supabase, body.businessId);

  let evaluated = 0;
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const journey of DEFAULT_JOURNEYS) {
    if (!enabledTriggers.has(journey.trigger)) continue;

    let due: DueItem[] = [];
    try {
      due = await collectDueItems(supabase, journey, body.businessId, now, getCtx);
    } catch (e) {
      errors.push(`${journey.trigger}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    for (const item of due) {
      evaluated++;
      const key = sentKey(journey.trigger, item.anchorId, item.stepIndex);
      if (alreadySent.has(key)) {
        skipped++;
        continue;
      }
      // Reserve the key now so concurrent invocations in the same run don't
      // duplicate (cheap in-process guard alongside the comm_log guard).
      alreadySent.add(key);

      if (!item.to) {
        skipped++;
        await writeLog(supabase, item, journey.trigger, "skipped", {
          reason: "no recipient for channel",
        });
        continue;
      }

      if (dryRun) {
        skipped++;
        continue;
      }

      const result = await sendComm(item.channel, item.to, item.subject, item.body);
      const status = result.ok ? (result.provider === "noop" ? "queued" : "sent") : "bounced";
      if (result.ok) sent++;
      else errors.push(`${journey.trigger}/${item.anchorId}: ${result.detail ?? "send failed"}`);

      await writeLog(supabase, item, journey.trigger, status, {
        provider: result.provider,
        detail: result.detail ?? null,
      });
    }
  }

  return json({
    ok: errors.length === 0,
    dryRun,
    enabled: [...enabledTriggers],
    evaluated,
    sent,
    skipped,
    errors,
  });
});

async function writeLog(
  supabase: Supabase,
  item: DueItem,
  journey: JourneyTrigger,
  status: string,
  extra: Record<string, unknown>,
): Promise<void> {
  // outcome carries the idempotency dimensions (anchor_id + step_index) plus the
  // rendered recipient/channel for the audit trail the Settings UI surfaces.
  const { error } = await supabase.from("comm_log").insert({
    business_id: item.businessId,
    customer_id: item.customerId,
    journey,
    channel: item.channel,
    status,
    outcome: {
      anchor_id: item.anchorId,
      step_index: item.stepIndex,
      to: item.to,
      subject: item.subject || null,
      ...extra,
    },
  });
  if (error) console.error(`[journey-engine] comm_log insert failed: ${error.message}`);
}
