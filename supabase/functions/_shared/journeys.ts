// Default lifecycle journeys + comm templates — the pre-built automation library
// operators TOGGLE on/off and tweak the wording for. They never author from
// scratch; seed-journeys upserts these per business so the CRM is "powerful by
// default". The journey-engine evaluates enabled journeys and sends due steps.
//
// Mirrors supabase/migrations/0004_crm.sql:
//   • comm_template(journey, channel, subject, body, is_default, variant)
//   • journey(trigger, enabled, steps:[{delay_min, channel, subject, body, ...}])
//
// Placeholders ({{customer_name}} etc.) are filled at send time by the engine.
// The review-request step MUST link {{profile_url}} (the public profile) because
// reviews feed the directory Quality Score — the flywheel back to the supply side.

export type CommChannel = "email" | "sms" | "whatsapp";

/** The lifecycle trigger that starts a journey. */
export type JourneyTrigger =
  | "new_lead"
  | "quote_followup"
  | "job_booked"
  | "day_before"
  | "job_completed"
  | "invoice_overdue"
  | "lapsed_reengagement";

/** A single timed touch within a journey. `delay_min` is measured from the
 *  trigger event (e.g. lead received_at, job scheduled_at, invoice due_at). */
export interface JourneyStep {
  delay_min: number;
  channel: CommChannel;
  /** Email only; ignored for sms/whatsapp. */
  subject?: string;
  body: string;
}

export interface JourneyDefinition {
  trigger: JourneyTrigger;
  /** Operator-facing label + blurb for the Settings toggle UI. */
  title: string;
  description: string;
  /** Enabled by default when seeded — operators opt out, not in. */
  enabledByDefault: boolean;
  steps: JourneyStep[];
}

/** Every placeholder the engine knows how to fill. Kept in one place so the
 *  Settings preview and the engine agree on the supported variables. */
export const JOURNEY_PLACEHOLDERS = [
  "customer_name",
  "business_name",
  "profile_url",
  "quote_url",
  "invoice_url",
  "invoice_total",
  "job_title",
  "job_date",
  "review_url",
] as const;
export type JourneyPlaceholder = (typeof JOURNEY_PLACEHOLDERS)[number];

const MIN = 1;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// ─────────────────────────────────────────────────────────────────────────────
// The default library. Order here is the order shown in Settings.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULT_JOURNEYS: JourneyDefinition[] = [
  {
    trigger: "new_lead",
    title: "Instant lead reply (speed-to-lead)",
    description:
      "Auto-reply the moment an enquiry lands — being first to respond is the single biggest win-rate lever.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 0,
        channel: "email",
        subject: "Thanks for your enquiry — {{business_name}}",
        body:
          "Hi {{customer_name}},\n\n" +
          "Thanks for getting in touch with {{business_name}}. We've received your enquiry and will be back to you very shortly with the next steps.\n\n" +
          "If it's urgent, just reply to this message and we'll prioritise it.\n\n" +
          "— The team at {{business_name}}",
      },
    ],
  },
  {
    trigger: "quote_followup",
    title: "Quote follow-up",
    description:
      "Nudge customers who've been sent a quote but haven't replied — gentle reminders at 48 hours and 5 days.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 2 * DAY,
        channel: "email",
        subject: "Did you get our quote, {{customer_name}}?",
        body:
          "Hi {{customer_name}},\n\n" +
          "Just checking you received the quote we sent. You can view it any time here: {{quote_url}}\n\n" +
          "Happy to tweak anything or answer questions — just reply.\n\n" +
          "— {{business_name}}",
      },
      {
        delay_min: 5 * DAY,
        channel: "sms",
        body:
          "Hi {{customer_name}}, it's {{business_name}}. Still keen to help with your job — your quote is here: {{quote_url}}. Want to go ahead?",
      },
    ],
  },
  {
    trigger: "job_booked",
    title: "Booking confirmation",
    description: "Confirm the booking the moment a job is scheduled so the customer feels looked after.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 0,
        channel: "email",
        subject: "You're booked in — {{job_title}}",
        body:
          "Hi {{customer_name}},\n\n" +
          "Great news — your job \"{{job_title}}\" is confirmed for {{job_date}}.\n\n" +
          "We'll send a reminder the day before. Need to change anything? Just reply.\n\n" +
          "— {{business_name}}",
      },
    ],
  },
  {
    trigger: "day_before",
    title: "Day-before reminder",
    description: "A short SMS the day before the appointment cuts no-shows.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 0,
        channel: "sms",
        body:
          "Reminder from {{business_name}}: we're scheduled for \"{{job_title}}\" tomorrow ({{job_date}}). Reply here if anything's changed. See you then!",
      },
    ],
  },
  {
    trigger: "job_completed",
    title: "Thank-you, invoice & review request",
    description:
      "After a completed job: say thanks, send the invoice, and ask for a review on your public profile — reviews lift your Quality Score and ranking.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 0,
        channel: "email",
        subject: "Thank you from {{business_name}}",
        body:
          "Hi {{customer_name}},\n\n" +
          "Thanks for choosing {{business_name}} — it was a pleasure working with you on \"{{job_title}}\".\n\n" +
          "Your invoice is ready here: {{invoice_url}} (total {{invoice_total}}).\n\n" +
          "— {{business_name}}",
      },
      {
        delay_min: 2 * HOUR,
        channel: "email",
        subject: "Mind leaving us a quick review?",
        body:
          "Hi {{customer_name}},\n\n" +
          "If you were happy with the work, a short review would mean a lot — it helps other locals find us and keeps our profile ranking well.\n\n" +
          "Leave a review here: {{profile_url}}\n\n" +
          "Thank you!\n— {{business_name}}",
      },
    ],
  },
  {
    trigger: "invoice_overdue",
    title: "Overdue invoice reminders",
    description: "Polite, escalating payment reminders at 3, 7 and 14 days past due.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 3 * DAY,
        channel: "email",
        subject: "A quick reminder about your invoice",
        body:
          "Hi {{customer_name}},\n\n" +
          "Just a friendly nudge that your invoice (total {{invoice_total}}) is now due. You can pay securely here: {{invoice_url}}\n\n" +
          "If you've already paid, please ignore this.\n\n" +
          "— {{business_name}}",
      },
      {
        delay_min: 7 * DAY,
        channel: "email",
        subject: "Invoice still outstanding — {{business_name}}",
        body:
          "Hi {{customer_name}},\n\n" +
          "Your invoice for {{invoice_total}} is still showing as unpaid. Pay here when you get a moment: {{invoice_url}}\n\n" +
          "Any issues with payment, just reply and we'll sort it.\n\n" +
          "— {{business_name}}",
      },
      {
        delay_min: 14 * DAY,
        channel: "sms",
        body:
          "Hi {{customer_name}}, {{business_name}} here. Your invoice ({{invoice_total}}) is now 14 days overdue. Please settle it here: {{invoice_url}}. Thanks.",
      },
    ],
  },
  {
    trigger: "lapsed_reengagement",
    title: "Win back lapsed customers",
    description:
      "Reach out to customers you haven't seen in a while — recurring work is the cheapest revenue you have.",
    enabledByDefault: false,
    steps: [
      {
        delay_min: 0,
        channel: "email",
        subject: "We'd love to see you again, {{customer_name}}",
        body:
          "Hi {{customer_name}},\n\n" +
          "It's been a while! If anything needs doing, we'd be glad to help again. Reply to this message or view our services here: {{profile_url}}\n\n" +
          "— {{business_name}}",
      },
    ],
  },
];

/** Flat list of comm_template rows derived from the journey library. One row per
 *  step, so operators can A/B individual touches later via the `variant` column. */
export interface DefaultTemplate {
  journey: JourneyTrigger;
  channel: CommChannel;
  subject: string | null;
  body: string;
  is_default: true;
}

export function defaultTemplates(): DefaultTemplate[] {
  const out: DefaultTemplate[] = [];
  for (const j of DEFAULT_JOURNEYS) {
    for (const step of j.steps) {
      out.push({
        journey: j.trigger,
        channel: step.channel,
        subject: step.subject ?? null,
        body: step.body,
        is_default: true,
      });
    }
  }
  return out;
}

/** Fill {{placeholders}} from a context bag. Unknown/empty values collapse to ""
 *  so a half-populated record never leaks a raw "{{token}}" into a customer's inbox. */
export function renderTemplate(
  text: string,
  vars: Partial<Record<JourneyPlaceholder, string | number | null | undefined>>,
): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, key: string) => {
    const value = vars[key as JourneyPlaceholder];
    return value === null || value === undefined ? "" : String(value);
  });
}
