// stripe-checkout — creates a Stripe Checkout Session for a paid plan.
//
// The static site can't run server code, so the browser POSTs here; we create
// the session server-side (secret key never reaches the browser) and return the
// hosted Checkout URL for the client to redirect to.
//
// Endpoint: POST /functions/v1/stripe-checkout
//   body: { businessId, plan: 'crm'|'growth', interval: 'monthly'|'annual',
//           successUrl, cancelUrl }
//   → { url }   (or a clear JSON error)
//
// Price ids are resolved from Edge-function secrets per plan × interval, e.g.
//   supabase secrets set STRIPE_PRICE_CRM_MONTHLY=price_... STRIPE_PRICE_CRM_ANNUAL=price_...
// Gracefully no-ops with a clear error when STRIPE_SECRET_KEY is absent so the
// rest of local dev (UI, claim flow) works without billing configured.

import Stripe from "https://esm.sh/stripe@16?target=deno";
import { handlePreflight, json } from "../_shared/cors.ts";

type Plan = "crm" | "growth";
type Interval = "monthly" | "annual";

interface CheckoutBody {
  businessId?: string;
  plan?: Plan;
  interval?: Interval;
  successUrl?: string;
  cancelUrl?: string;
}

function isPlan(value: unknown): value is Plan {
  return value === "crm" || value === "growth";
}

function isInterval(value: unknown): value is Interval {
  return value === "monthly" || value === "annual";
}

// Map plan × interval → the env var holding the Stripe price id.
function priceEnvKey(plan: Plan, interval: Interval): string {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${interval.toUpperCase()}`;
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) {
    // Graceful no-op: billing isn't wired up in this environment yet.
    return json({ error: "billing not configured" }, 503);
  }

  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (!body.businessId) return json({ error: "missing businessId" }, 400);
  if (!isPlan(body.plan)) return json({ error: "invalid plan" }, 400);
  if (!isInterval(body.interval)) return json({ error: "invalid interval" }, 400);
  if (!body.successUrl || !body.cancelUrl) {
    return json({ error: "missing successUrl or cancelUrl" }, 400);
  }

  const priceId = Deno.env.get(priceEnvKey(body.plan, body.interval));
  if (!priceId) {
    return json(
      { error: `no price configured for ${body.plan}/${body.interval}` },
      503,
    );
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: "2024-06-20",
    httpClient: Stripe.createFetchHttpClient(),
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      // Carry our identifiers through to the webhook so it can attribute the
      // subscription to the business + plan without an extra lookup.
      client_reference_id: body.businessId,
      subscription_data: {
        metadata: {
          business_id: body.businessId,
          plan: body.plan,
          interval: body.interval,
        },
      },
      metadata: {
        business_id: body.businessId,
        plan: body.plan,
        interval: body.interval,
      },
    });

    if (!session.url) return json({ error: "no checkout url returned" }, 502);
    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    return json({ error: message }, 502);
  }
});
