// affiliate-postback — server-to-server conversion webhook.
//
// Affiliate networks (Awin/Impact/CJ/PartnerStack) fire a postback when a
// conversion is validated, carrying the subid we minted at click time plus the
// amount + status. We:
//   1. verify the request (per-network shared secret / signature),
//   2. match the subid back to its `touch`,
//   3. write a normalised `conversion` row (GBP), idempotently.
// This is the moment £ enters the system; the RevenueRouter loop reads it
// (via the revenue_per_session view) to learn EPC and optimise routing.
//
// Endpoint: POST /functions/v1/affiliate-postback/:network
//   body: { subid, amount, currency, status, transaction_id }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";

interface PostbackBody {
  subid: string;
  amount: number;
  currency?: string;
  status?: "pending" | "approved" | "rejected" | "paid";
  transaction_id?: string;
}

// Per-network shared secrets live in Edge-function secrets, e.g.
// `supabase secrets set POSTBACK_SECRET_AWIN=...`.
function verify(network: string, req: Request): boolean {
  const expected = Deno.env.get(`POSTBACK_SECRET_${network.toUpperCase()}`);
  if (!expected) return false;
  const provided =
    req.headers.get("x-postback-secret") ??
    new URL(req.url).searchParams.get("secret");
  return provided === expected;
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const url = new URL(req.url);
  const network = url.pathname.split("/").pop() ?? "unknown";

  if (!verify(network, req)) return json({ error: "unauthorized" }, 401);

  let body: PostbackBody;
  try {
    body = (await req.json()) as PostbackBody;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.subid || typeof body.amount !== "number") {
    return json({ error: "missing subid or amount" }, 400);
  }

  const supabase = adminClient();

  // Match the click that produced this conversion.
  const { data: touch } = await supabase
    .from("touch")
    .select("id, session_id, ref_id")
    .eq("subid", body.subid)
    .eq("rail", "affiliate")
    .maybeSingle();

  if (!touch) return json({ error: "subid not matched" }, 404);

  // Idempotency: one conversion per (subid, transaction_id).
  const { data: existing } = await supabase
    .from("conversion")
    .select("id")
    .eq("subid", body.subid)
    .maybeSingle();
  if (existing) return json({ ok: true, deduped: true });

  const { error } = await supabase.from("conversion").insert({
    rail: "affiliate",
    touch_id: touch.id,
    session_id: touch.session_id,
    ref_id: touch.ref_id,
    subid: body.subid,
    amount: body.amount,
    currency: body.currency ?? "GBP",
    status: body.status ?? "pending",
    source: `postback:${network}`,
  });

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
