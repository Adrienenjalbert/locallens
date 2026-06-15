// stripe-webhook — turns Stripe lifecycle events into our subscription state +
// the unified revenue spine.
//
// We verify the Stripe signature (STRIPE_WEBHOOK_SECRET), then handle:
//   • checkout.session.completed       → a new paid subscription started
//   • customer.subscription.updated    → plan/status/period changed
//   • customer.subscription.deleted    → cancelled
// On every event we upsert the `subscription` row (business_id, plan, status,
// current_period_end, provider_ref, mrr). On a NEW paid subscription we ALSO
// write a `conversion` row (rail='subscription', amount=mrr, status='approved')
// so subscription revenue flows into RPM / revenue_per_session like every other
// rail. All writes are idempotent (keyed on the Stripe subscription id).
//
// LEAD RAIL (documented, not implemented here): when the CRM marks a lead `won`,
// the analogous write is a `conversion` row with rail='lead', amount=<job value>,
// session_id=lead.session_id, status='approved', source='crm:lead_won' — same
// spine, so lead revenue lands in revenue_per_session next to subscriptions.
//
// Endpoint: POST /functions/v1/stripe-webhook  (raw body; signature in header)

import Stripe from "https://esm.sh/stripe@16?target=deno";
import { adminClient } from "../_shared/admin.ts";

type PlanId = "free" | "crm" | "growth";

function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "crm" || value === "growth";
}

// Map a Stripe subscription status onto our coarse status. Anything currently
// billing-good counts as 'active'; everything else is non-active.
function mapStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default: {
      // Exhaustiveness guard: a new Stripe status should surface here.
      return "canceled";
    }
  }
}

// Normalise the subscription's recurring price to a monthly figure (GBP units),
// so annual plans contribute their per-month value to MRR / attribution.
function monthlyRecurringRevenue(sub: Stripe.Subscription): number {
  let monthlyMinor = 0;
  for (const item of sub.items.data) {
    const price = item.price;
    const unit = price.unit_amount ?? 0;
    const qty = item.quantity ?? 1;
    const recurring = price.recurring;
    if (!recurring) continue;
    const count = recurring.interval_count ?? 1;
    let perMonth = unit * qty;
    switch (recurring.interval) {
      case "year":
        perMonth = (unit * qty) / (12 * count);
        break;
      case "month":
        perMonth = (unit * qty) / count;
        break;
      case "week":
        perMonth = (unit * qty * 52) / (12 * count);
        break;
      case "day":
        perMonth = (unit * qty * 365) / (12 * count);
        break;
    }
    monthlyMinor += perMonth;
  }
  // Stripe amounts are in minor units (pence); return major units (GBP).
  return Math.round(monthlyMinor) / 100;
}

interface SubMeta {
  businessId: string | null;
  plan: PlanId | null;
  sessionId: string | null;
}

function readMeta(sub: Stripe.Subscription): SubMeta {
  const meta = sub.metadata ?? {};
  return {
    businessId: meta.business_id ?? null,
    plan: isPlanId(meta.plan) ? meta.plan : null,
    sessionId: meta.session_id ?? null,
  };
}

// Idempotently upsert the subscription row keyed on the Stripe subscription id
// (provider_ref). Returns whether this created a brand-new row (→ first paid
// conversion should be written by the caller).
async function upsertSubscription(
  supabase: ReturnType<typeof adminClient>,
  sub: Stripe.Subscription,
): Promise<{ isNew: boolean; mrr: number; businessId: string | null }> {
  const { businessId, plan } = readMeta(sub);
  const status = mapStatus(sub.status);
  const mrr = monthlyRecurringRevenue(sub);
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  const { data: existing } = await supabase
    .from("subscription")
    .select("id")
    .eq("provider_ref", sub.id)
    .maybeSingle();

  const row = {
    business_id: businessId,
    plan: plan ?? "crm",
    status,
    current_period_end: currentPeriodEnd,
    provider_ref: sub.id,
    mrr,
  };

  if (existing) {
    await supabase.from("subscription").update(row).eq("id", existing.id);
    return { isNew: false, mrr, businessId };
  }

  await supabase.from("subscription").insert(row);
  return { isNew: true, mrr, businessId };
}

// Write the subscription-rail conversion exactly once per Stripe subscription.
async function writeSubscriptionConversion(
  supabase: ReturnType<typeof adminClient>,
  sub: Stripe.Subscription,
  mrr: number,
  businessId: string | null,
): Promise<void> {
  const { sessionId } = readMeta(sub);

  // Idempotency: one subscription conversion per Stripe subscription id (subid).
  const { data: existing } = await supabase
    .from("conversion")
    .select("id")
    .eq("rail", "subscription")
    .eq("subid", sub.id)
    .maybeSingle();
  if (existing) return;

  await supabase.from("conversion").insert({
    rail: "subscription",
    session_id: sessionId,
    ref_id: businessId,
    subid: sub.id,
    amount: mrr,
    currency: "GBP",
    status: "approved",
    source: "stripe",
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secretKey || !webhookSecret) {
    // Graceful no-op so local dev works without billing configured.
    return new Response(JSON.stringify({ error: "billing not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "missing signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    // Async variant is required on Deno (Web Crypto is async).
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = adminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subRef =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (!subRef) break;

        // Retrieve the full subscription (with items + metadata) to compute MRR.
        const sub = await stripe.subscriptions.retrieve(subRef);
        // Backfill metadata from the checkout session when present.
        sub.metadata = {
          ...sub.metadata,
          business_id:
            sub.metadata?.business_id ??
            session.metadata?.business_id ??
            session.client_reference_id ??
            "",
          plan: sub.metadata?.plan ?? session.metadata?.plan ?? "",
          session_id: sub.metadata?.session_id ?? session.metadata?.session_id ?? "",
        };

        const { isNew, mrr, businessId } = await upsertSubscription(supabase, sub);
        // A completed checkout is a NEW paid subscription → record the conversion.
        if (isNew && mapStatus(sub.status) === "active") {
          await writeSubscriptionConversion(supabase, sub, mrr, businessId);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(supabase, sub);
        break;
      }

      default:
        // Unhandled event types are acknowledged so Stripe stops retrying.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "handler error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
