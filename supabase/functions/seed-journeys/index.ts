// seed-journeys — bootstrap a business with the default automation library.
//
// Operators never author journeys from scratch. When a business is claimed (or a
// vertical is onboarded) call this once to upsert the default comm_templates +
// journey rows so the CRM ships "powerful by default": instant lead replies,
// quote follow-ups, booking confirmations, reminders, review requests, overdue
// chasing and win-back — all toggleable from Settings.
//
// POST /functions/v1/seed-journeys
//   body: { businessId, verticalId? }
//
// Idempotent: re-running won't duplicate. We key templates on
// (business_id, journey, channel, body-hash-ish via subject) and journeys on
// (business_id, trigger), updating in place rather than inserting twice.

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import {
  DEFAULT_JOURNEYS,
  type JourneyTrigger,
} from "../_shared/journeys.ts";

type Supabase = ReturnType<typeof adminClient>;

interface Body {
  businessId: string;
  verticalId?: string | null;
}

interface SeededTemplate {
  id: string;
  journey: JourneyTrigger;
  channel: string;
  step_index: number;
}

/** Upsert one comm_template row, matching an existing default for this business
 *  by (journey, channel, variant-as-step-index) so re-seeding stays idempotent. */
async function upsertTemplate(
  supabase: Supabase,
  businessId: string,
  verticalId: string | null,
  journey: JourneyTrigger,
  channel: string,
  stepIndex: number,
  subject: string | null,
  bodyText: string,
): Promise<string | null> {
  // We stash the step index in `variant` so a journey with multiple steps on the
  // same channel (e.g. invoice_overdue email at 3d and 7d) gets distinct rows.
  const variant = `step_${stepIndex}`;

  const { data: existing } = await supabase
    .from("comm_template")
    .select("id")
    .eq("business_id", businessId)
    .eq("journey", journey)
    .eq("channel", channel)
    .eq("variant", variant)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("comm_template")
      .update({ subject, body: bodyText, vertical_id: verticalId, is_default: true })
      .eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("comm_template")
    .insert({
      business_id: businessId,
      vertical_id: verticalId,
      journey,
      channel,
      subject,
      body: bodyText,
      is_default: true,
      variant,
    })
    .select("id")
    .single();

  if (error) {
    console.error(`[seed-journeys] template insert failed (${journey}/${channel}): ${error.message}`);
    return null;
  }
  return inserted?.id ?? null;
}

/** Upsert the journey row for a trigger with its ordered steps referencing the
 *  freshly-seeded template ids. */
async function upsertJourney(
  supabase: Supabase,
  businessId: string,
  trigger: JourneyTrigger,
  enabled: boolean,
  steps: Array<{ delay_min: number; channel: string; template_id: string | null }>,
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("journey")
    .select("id, enabled")
    .eq("business_id", businessId)
    .eq("trigger", trigger)
    .maybeSingle();

  if (existing?.id) {
    // Preserve the operator's on/off choice on re-seed; only refresh the steps.
    await supabase.from("journey").update({ steps }).eq("id", existing.id);
    return existing.id;
  }

  const { data: inserted, error } = await supabase
    .from("journey")
    .insert({ business_id: businessId, trigger, enabled, steps })
    .select("id")
    .single();

  if (error) {
    console.error(`[seed-journeys] journey insert failed (${trigger}): ${error.message}`);
    return null;
  }
  return inserted?.id ?? null;
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
  if (!body.businessId) return json({ error: "businessId required" }, 400);

  const verticalId = body.verticalId ?? null;
  const supabase = adminClient();

  const seededTemplates: SeededTemplate[] = [];
  const seededJourneys: Array<{ trigger: JourneyTrigger; id: string | null; steps: number }> = [];

  for (const journey of DEFAULT_JOURNEYS) {
    const steps: Array<{ delay_min: number; channel: string; template_id: string | null }> = [];

    for (let i = 0; i < journey.steps.length; i++) {
      const step = journey.steps[i];
      const templateId = await upsertTemplate(
        supabase,
        body.businessId,
        verticalId,
        journey.trigger,
        step.channel,
        i,
        step.subject ?? null,
        step.body,
      );
      if (templateId) {
        seededTemplates.push({
          id: templateId,
          journey: journey.trigger,
          channel: step.channel,
          step_index: i,
        });
      }
      steps.push({ delay_min: step.delay_min, channel: step.channel, template_id: templateId });
    }

    const journeyId = await upsertJourney(
      supabase,
      body.businessId,
      journey.trigger,
      journey.enabledByDefault,
      steps,
    );
    seededJourneys.push({ trigger: journey.trigger, id: journeyId, steps: steps.length });
  }

  return json({
    ok: true,
    businessId: body.businessId,
    verticalId,
    templates: seededTemplates.length,
    journeys: seededJourneys,
  });
});
