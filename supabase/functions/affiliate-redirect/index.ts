// affiliate-redirect — the safe click-resolution endpoint.
//
// The static site links affiliate units to THIS function (e.g.
//   https://<project>.functions.supabase.co/affiliate-redirect?offer=<id>&dec=<decisionId>&sess=<sessionId>
// ) rather than to a raw affiliate URL. On click we:
//   1. look up the active offer (server-side; URL never exposed in page source),
//   2. mint a tracking subid,
//   3. record a `touch` (kind=click) tied to the session + router decision,
//   4. 302-redirect to the partner deep-link with the subid embedded.
// The partner later fires a postback (see affiliate-postback) carrying the same
// subid, which we match to write a `conversion`. This keeps attribution
// server-side (PECR-friendly), hides affiliate URLs, and lets us pause dead
// offers instantly.

import { adminClient, mintSubid } from "../_shared/admin.ts";
import { handlePreflight, corsHeaders, json } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  const url = new URL(req.url);
  const offerId = url.searchParams.get("offer");
  const decisionId = url.searchParams.get("dec");
  const sessionId = url.searchParams.get("sess");
  if (!offerId) return json({ error: "missing offer" }, 400);

  const supabase = adminClient();

  const { data: offer, error } = await supabase
    .from("affiliate_offer")
    .select("id, landing_template, status, rel_attribute")
    .eq("id", offerId)
    .single();

  if (error || !offer) return json({ error: "offer not found" }, 404);
  if (offer.status !== "active") return json({ error: "offer inactive" }, 410);

  const subid = mintSubid();

  // Record the click on the unified attribution spine.
  await supabase.from("touch").insert({
    session_id: sessionId,
    decision_id: decisionId,
    rail: "affiliate",
    ref_id: offer.id,
    kind: "click",
    subid,
  });

  // Build the partner deep-link with our tracking subid.
  const destination = offer.landing_template.replace("{subid}", subid);

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: destination },
  });
});
