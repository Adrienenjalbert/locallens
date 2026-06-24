"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Sparkles, Users } from "lucide-react";
import { PLANS, type PlanDef, type PlanId } from "@config/plans";
import { useAuth } from "@/lib/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui/primitives";
import { cn, formatGBP } from "@/lib/utils";

type Interval = "monthly" | "annual";
// The paid plans the checkout function accepts. `free` is self-serve (sign up),
// not a Stripe Checkout.
type PaidPlan = Extract<PlanId, "crm" | "growth">;

const PLAN_ORDER: PlanId[] = ["free", "crm", "growth"];
const HIGHLIGHTED: PlanId = "crm"; // the everyday-value plan we steer toward

function isPaid(id: PlanId): id is PaidPlan {
  return id === "crm" || id === "growth";
}

function monthlyEquivalent(plan: PlanDef): number {
  // Annual is billed once; show the per-month equivalent so savings are obvious.
  return Math.round((plan.priceAnnual / 12) * 100) / 100;
}

function annualSavingPct(plan: PlanDef): number {
  if (plan.priceMonthly <= 0) return 0;
  const yearlyIfMonthly = plan.priceMonthly * 12;
  return Math.round((1 - plan.priceAnnual / yearlyIfMonthly) * 100);
}

export function PricingView() {
  const router = useRouter();
  const { user } = useAuth();
  const [interval, setInterval] = useState<Interval>("monthly");
  const [pendingPlan, setPendingPlan] = useState<PaidPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(plan: PaidPlan) {
    setError(null);

    // Must be signed in (and Supabase configured) to start checkout — otherwise
    // route to /claim to sign in first, preserving the plan + interval intent.
    if (!user || !supabase) {
      router.push(`/claim?next=pricing&plan=${plan}&interval=${interval}`);
      return;
    }

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) {
      setError("Billing isn’t configured yet. Please try again later.");
      return;
    }

    setPendingPlan(plan);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const origin = window.location.origin;
      const res = await fetch(`${base}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          businessId: user.id,
          plan,
          interval,
          successUrl: `${origin}/app?subscribed=${plan}`,
          cancelUrl: `${origin}/pricing`,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn’t start checkout. Please try again.");
        setPendingPlan(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn’t reach billing. Please check your connection and retry.");
      setPendingPlan(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Simple, honest pricing
        </span>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          Win more work, run your day in one place
        </h1>
        <p className="mx-auto max-w-prose text-muted-foreground">
          Start free and see every lead waiting for you. Upgrade when you’re ready to
          reply instantly, automate follow-ups and get paid faster.
        </p>
      </header>

      <IntervalToggle interval={interval} onChange={setInterval} />

      {error ? (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section aria-label="Plans" className="grid gap-5 md:grid-cols-3 md:items-start">
        {PLAN_ORDER.map((id) => (
          <PlanCard
            key={id}
            plan={PLANS[id]}
            interval={interval}
            highlighted={id === HIGHLIGHTED}
            pending={pendingPlan === id}
            disabled={pendingPlan !== null}
            onSubscribe={() => {
              if (isPaid(id)) {
                void subscribe(id);
              } else {
                router.push("/claim");
              }
            }}
          />
        ))}
      </section>

      <ReferAPeer />
    </main>
  );
}

function IntervalToggle({
  interval,
  onChange,
}: {
  interval: Interval;
  onChange: (next: Interval) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Billing interval"
      className="mx-auto flex w-fit items-center gap-1 rounded-full border bg-muted/40 p-1"
    >
      {(["monthly", "annual"] as const).map((value) => {
        const active = interval === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === "monthly" ? "Monthly" : "Annual"}
            {value === "annual" ? (
              <span className="ml-1.5 text-xs opacity-90">save ~17%</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function PlanCard({
  plan,
  interval,
  highlighted,
  pending,
  disabled,
  onSubscribe,
}: {
  plan: PlanDef;
  interval: Interval;
  highlighted: boolean;
  pending: boolean;
  disabled: boolean;
  onSubscribe: () => void;
}) {
  const free = plan.priceMonthly <= 0;
  const perMonth = interval === "monthly" ? plan.priceMonthly : monthlyEquivalent(plan);
  const saving = annualSavingPct(plan);

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        highlighted && "border-primary shadow-sm ring-1 ring-primary/20",
      )}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">
            {plan.name}
          </h2>
          {highlighted ? <Badge tone="primary">Most popular</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{plan.blurb}</p>
      </CardHeader>
      <CardBody className="flex flex-1 flex-col gap-5">
        <div>
          <p className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold text-foreground">
              {free ? "Free" : formatGBP(perMonth)}
            </span>
            {!free ? <span className="text-sm text-muted-foreground">/mo</span> : null}
          </p>
          {!free && interval === "annual" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Billed {formatGBP(plan.priceAnnual)}/yr
              {saving > 0 ? ` — save ${saving}%` : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              {free ? "No card needed" : "Billed monthly, cancel anytime"}
            </p>
          )}
        </div>

        <ul className="flex-1 space-y-2.5" aria-label={`${plan.name} highlights`}>
          {plan.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>

        <Button
          variant={highlighted ? "primary" : free ? "secondary" : "secondary"}
          className="w-full"
          disabled={disabled}
          onClick={onSubscribe}
        >
          {pending
            ? "Starting checkout…"
            : free
              ? "Get started free"
              : `Subscribe to ${plan.name}`}
        </Button>
      </CardBody>
    </Card>
  );
}

// UI-only referral hook. Both the referrer and the peer get a discount. The
// link is a placeholder today; a later workstream persists the referral via
// event_log when the peer signs up.
function ReferAPeer() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const referralCode = user ? user.id.slice(0, 8) : "yourname";
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/claim?ref=${referralCode}`
      : `/claim?ref=${referralCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="refer-heading"
      className="rounded-lg border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" aria-hidden />
        <h2
          id="refer-heading"
          className="font-display text-lg font-semibold text-foreground"
        >
          Refer a peer — you both save
        </h2>
      </div>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">
        Know another local business that would benefit? Share your link. When they
        subscribe, you each get a discount on your next month.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="referral-link" className="sr-only">
          Your referral link
        </label>
        <input
          id="referral-link"
          readOnly
          value={referralLink}
          className="w-full flex-1 rounded-md border bg-background px-3 py-2 text-sm text-foreground"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="secondary" onClick={copy} className="shrink-0">
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden /> Copy link
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
