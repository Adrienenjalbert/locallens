"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { CommChannel } from "@/lib/crm/types";

// Automated comms & lifecycle journeys — the operator control panel.
//
// Operators TOGGLE pre-built journeys and tweak the wording; they never author
// from scratch. The default library mirrors supabase/functions/_shared/journeys.ts
// (kept in sync here so the static export has no Deno import). Enabled state +
// edited wording persist to the `journey` table via the anon `supabase` client
// (RLS scopes to the owner's business); when Supabase isn't configured we fall
// back to in-memory state so the UI is fully usable for local design work.

interface JourneyStepDef {
  delay_min: number;
  channel: CommChannel;
  subject?: string;
  body: string;
}

interface JourneyDef {
  trigger: string;
  title: string;
  description: string;
  enabledByDefault: boolean;
  steps: JourneyStepDef[];
}

const MIN = 1;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const DEFAULT_JOURNEYS: JourneyDef[] = [
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
        body: "Hi {{customer_name}},\n\nThanks for getting in touch with {{business_name}}. We've received your enquiry and will be back to you very shortly with the next steps.\n\nIf it's urgent, just reply to this message and we'll prioritise it.\n\n— The team at {{business_name}}",
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
        body: "Hi {{customer_name}},\n\nJust checking you received the quote we sent. You can view it any time here: {{quote_url}}\n\nHappy to tweak anything or answer questions — just reply.\n\n— {{business_name}}",
      },
      {
        delay_min: 5 * DAY,
        channel: "sms",
        body: "Hi {{customer_name}}, it's {{business_name}}. Still keen to help with your job — your quote is here: {{quote_url}}. Want to go ahead?",
      },
    ],
  },
  {
    trigger: "job_booked",
    title: "Booking confirmation",
    description:
      "Confirm the booking the moment a job is scheduled so the customer feels looked after.",
    enabledByDefault: true,
    steps: [
      {
        delay_min: 0,
        channel: "email",
        subject: "You're booked in — {{job_title}}",
        body: 'Hi {{customer_name}},\n\nGreat news — your job "{{job_title}}" is confirmed for {{job_date}}.\n\nWe\'ll send a reminder the day before. Need to change anything? Just reply.\n\n— {{business_name}}',
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
        body: "Reminder from {{business_name}}: we're scheduled for \"{{job_title}}\" tomorrow ({{job_date}}). Reply here if anything's changed. See you then!",
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
        body: 'Hi {{customer_name}},\n\nThanks for choosing {{business_name}} — it was a pleasure working with you on "{{job_title}}".\n\nYour invoice is ready here: {{invoice_url}} (total {{invoice_total}}).\n\n— {{business_name}}',
      },
      {
        delay_min: 2 * HOUR,
        channel: "email",
        subject: "Mind leaving us a quick review?",
        body: "Hi {{customer_name}},\n\nIf you were happy with the work, a short review would mean a lot — it helps other locals find us and keeps our profile ranking well.\n\nLeave a review here: {{profile_url}}\n\nThank you!\n— {{business_name}}",
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
        body: "Hi {{customer_name}},\n\nJust a friendly nudge that your invoice (total {{invoice_total}}) is now due. You can pay securely here: {{invoice_url}}\n\nIf you've already paid, please ignore this.\n\n— {{business_name}}",
      },
      {
        delay_min: 7 * DAY,
        channel: "email",
        subject: "Invoice still outstanding — {{business_name}}",
        body: "Hi {{customer_name}},\n\nYour invoice for {{invoice_total}} is still showing as unpaid. Pay here when you get a moment: {{invoice_url}}\n\nAny issues with payment, just reply and we'll sort it.\n\n— {{business_name}}",
      },
      {
        delay_min: 14 * DAY,
        channel: "sms",
        body: "Hi {{customer_name}}, {{business_name}} here. Your invoice ({{invoice_total}}) is now 14 days overdue. Please settle it here: {{invoice_url}}. Thanks.",
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
        body: "Hi {{customer_name}},\n\nIt's been a while! If anything needs doing, we'd be glad to help again. Reply to this message or view our services here: {{profile_url}}\n\n— {{business_name}}",
      },
    ],
  },
];

// Sample values used only for the live preview so operators see real-looking copy.
const PREVIEW_VARS: Record<string, string> = {
  customer_name: "Sam Patel",
  business_name: "Green & Tidy Gardens",
  profile_url: "https://locallens.example/business/green-and-tidy",
  quote_url: "https://locallens.example/quote/abc123",
  invoice_url: "https://locallens.example/invoice/inv789",
  invoice_total: "£240",
  job_title: "Spring garden tidy",
  job_date: "Sat 21 Jun",
  review_url: "https://locallens.example/business/green-and-tidy#reviews",
};

function renderPreview(text: string): string {
  return text.replace(
    /\{\{\s*([a-z_]+)\s*\}\}/g,
    (_m, key: string) => PREVIEW_VARS[key] ?? "",
  );
}

function formatDelay(min: number): string {
  if (min <= 0) return "Immediately";
  if (min < 60) return `${min} min later`;
  if (min < 1440) {
    const h = Math.round(min / 60);
    return `${h} hour${h === 1 ? "" : "s"} later`;
  }
  const d = Math.round(min / 1440);
  return `${d} day${d === 1 ? "" : "s"} later`;
}

const CHANNEL_TONE: Record<CommChannel, "primary" | "success" | "warning"> = {
  email: "primary",
  sms: "success",
  whatsapp: "warning",
};

function channelLabel(channel: CommChannel): string {
  switch (channel) {
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "whatsapp":
      return "WhatsApp";
    default: {
      const _exhaustive: never = channel;
      return _exhaustive;
    }
  }
}

interface JourneyState {
  enabled: boolean;
  steps: JourneyStepDef[];
  /** journey.id once known, so we update instead of insert. */
  rowId: string | null;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function initialState(): Record<string, JourneyState> {
  const out: Record<string, JourneyState> = {};
  for (const j of DEFAULT_JOURNEYS) {
    out[j.trigger] = {
      enabled: j.enabledByDefault,
      steps: j.steps.map((s) => ({ ...s })),
      rowId: null,
    };
  }
  return out;
}

export default function SettingsPage() {
  const [state, setState] = useState<Record<string, JourneyState>>(initialState);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(supabase));
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const persistent = Boolean(supabase);

  // Hydrate enabled state + edited steps from the journey table when available.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("journey")
        .select("id, trigger, enabled, steps");
      if (cancelled) return;
      if (!error && data) {
        setState((prev) => {
          const next = { ...prev };
          for (const row of data as Array<{
            id: string;
            trigger: string;
            enabled: boolean;
            steps: JourneyStepDef[] | null;
          }>) {
            const base = next[row.trigger];
            if (!base) continue;
            next[row.trigger] = {
              enabled: row.enabled,
              steps:
                Array.isArray(row.steps) && row.steps.length > 0
                  ? row.steps.map((s) => ({ ...s }))
                  : base.steps,
              rowId: row.id,
            };
          }
          return next;
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setStatus = useCallback((trigger: string, status: SaveStatus) => {
    setSaveStatus((prev) => ({ ...prev, [trigger]: status }));
  }, []);

  const persist = useCallback(
    async (trigger: string, patch: Pick<JourneyState, "enabled" | "steps" | "rowId">) => {
      if (!supabase) return;
      setStatus(trigger, "saving");
      try {
        if (patch.rowId) {
          const { error } = await supabase
            .from("journey")
            .update({ enabled: patch.enabled, steps: patch.steps })
            .eq("id", patch.rowId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("journey")
            .insert({ trigger, enabled: patch.enabled, steps: patch.steps })
            .select("id")
            .single();
          if (error) throw error;
          if (data?.id) {
            setState((prev) => ({
              ...prev,
              [trigger]: { ...prev[trigger], rowId: data.id },
            }));
          }
        }
        setStatus(trigger, "saved");
        setTimeout(() => setStatus(trigger, "idle"), 1800);
      } catch {
        setStatus(trigger, "error");
      }
    },
    [setStatus],
  );

  const toggle = useCallback(
    (trigger: string) => {
      setState((prev) => {
        const current = prev[trigger];
        const updated = { ...current, enabled: !current.enabled };
        const next = { ...prev, [trigger]: updated };
        void persist(trigger, updated);
        return next;
      });
    },
    [persist],
  );

  const editStep = useCallback(
    (trigger: string, stepIndex: number, field: "subject" | "body", value: string) => {
      setState((prev) => {
        const current = prev[trigger];
        const steps = current.steps.map((s, i) =>
          i === stepIndex ? { ...s, [field]: value } : s,
        );
        return { ...prev, [trigger]: { ...current, steps } };
      });
    },
    [],
  );

  const saveWording = useCallback(
    (trigger: string) => {
      const current = state[trigger];
      void persist(trigger, current);
    },
    [persist, state],
  );

  const enabledCount = useMemo(
    () => Object.values(state).filter((s) => s.enabled).length,
    [state],
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Automated messages
        </h1>
        <p className="mt-1 text-muted-foreground">
          Pre-built journeys keep customers in the loop automatically — instant replies,
          follow-ups, reminders and review requests. Turn the ones you want on, and tweak
          the wording to sound like you.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="primary">{enabledCount} active</Badge>
          {!persistent && (
            <Badge tone="warning">Preview mode — changes won&apos;t be saved</Badge>
          )}
          {loading && (
            <span className="text-muted-foreground">Loading your settings…</span>
          )}
        </div>
      </header>

      <div className="space-y-3">
        {DEFAULT_JOURNEYS.map((journey) => {
          const js = state[journey.trigger];
          const isOpen = expanded === journey.trigger;
          const status = saveStatus[journey.trigger] ?? "idle";
          return (
            <JourneyCard
              key={journey.trigger}
              journey={journey}
              enabled={js.enabled}
              steps={js.steps}
              isOpen={isOpen}
              status={status}
              persistent={persistent}
              onToggle={() => toggle(journey.trigger)}
              onExpand={() => setExpanded(isOpen ? null : journey.trigger)}
              onEditStep={(i, field, value) => editStep(journey.trigger, i, field, value)}
              onSave={() => saveWording(journey.trigger)}
            />
          );
        })}
      </div>
    </div>
  );
}

function JourneyCard({
  journey,
  enabled,
  steps,
  isOpen,
  status,
  persistent,
  onToggle,
  onExpand,
  onEditStep,
  onSave,
}: {
  journey: JourneyDef;
  enabled: boolean;
  steps: JourneyStepDef[];
  isOpen: boolean;
  status: SaveStatus;
  persistent: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onEditStep: (stepIndex: number, field: "subject" | "body", value: string) => void;
  onSave: () => void;
}) {
  const panelId = useId();
  return (
    <Card className={cn(!enabled && "opacity-75")}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold text-foreground">
              {journey.title}
            </h2>
            {steps.map((s, i) => (
              <Badge key={i} tone={CHANNEL_TONE[s.channel]}>
                {channelLabel(s.channel)}
              </Badge>
            ))}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{journey.description}</p>
        </div>
        <Toggle
          checked={enabled}
          onChange={onToggle}
          label={`Turn ${journey.title} ${enabled ? "off" : "on"}`}
        />
      </CardHeader>
      <CardBody className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpand}
            aria-expanded={isOpen}
            aria-controls={panelId}
          >
            {isOpen ? "Hide wording" : "Edit wording"}
          </Button>
          {status === "saving" && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {status === "saved" && <span className="text-xs text-success">Saved</span>}
          {status === "error" && (
            <span className="text-xs text-danger">Couldn&apos;t save — try again</span>
          )}
        </div>

        {isOpen && (
          <div id={panelId} className="space-y-4 border-t pt-4">
            {steps.map((step, i) => (
              <StepEditor
                key={i}
                step={step}
                index={i}
                onEdit={(field, value) => onEditStep(i, field, value)}
              />
            ))}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onSave} disabled={!persistent}>
                Save wording
              </Button>
              {!persistent && (
                <span className="text-xs text-muted-foreground">
                  Connect your account to save edits.
                </span>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StepEditor({
  step,
  index,
  onEdit,
}: {
  step: JourneyStepDef;
  index: number;
  onEdit: (field: "subject" | "body", value: string) => void;
}) {
  const subjectId = useId();
  const bodyId = useId();
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge tone={CHANNEL_TONE[step.channel]}>{channelLabel(step.channel)}</Badge>
        <span className="text-xs font-medium text-muted-foreground">
          Step {index + 1} · {formatDelay(step.delay_min)}
        </span>
      </div>

      {step.channel === "email" && (
        <div className="mb-2">
          <label
            htmlFor={subjectId}
            className="mb-1 block text-xs font-medium text-foreground"
          >
            Subject
          </label>
          <input
            id={subjectId}
            value={step.subject ?? ""}
            onChange={(e) => onEdit("subject", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      <div>
        <label
          htmlFor={bodyId}
          className="mb-1 block text-xs font-medium text-foreground"
        >
          Message
        </label>
        <textarea
          id={bodyId}
          value={step.body}
          onChange={(e) => onEdit("body", e.target.value)}
          rows={step.channel === "email" ? 6 : 3}
          className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Use placeholders like {"{{customer_name}}"}, {"{{business_name}}"} and{" "}
          {"{{profile_url}}"} — we fill them in automatically.
        </p>
      </div>

      <Preview
        subject={step.channel === "email" ? step.subject : undefined}
        body={step.body}
      />
    </div>
  );
}

function Preview({ subject, body }: { subject?: string; body: string }) {
  return (
    <div className="mt-3 rounded-md border border-dashed bg-background p-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preview
      </p>
      {subject !== undefined && (
        <p className="text-sm font-medium text-foreground">{renderPreview(subject)}</p>
      )}
      <p className="whitespace-pre-line text-sm text-muted-foreground">
        {renderPreview(body)}
      </p>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
