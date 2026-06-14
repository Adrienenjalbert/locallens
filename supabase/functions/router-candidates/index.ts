// router-candidates — server-side candidate build for the RevenueRouter.
//
// Given a page context (vertical, page type, funnel stage, geo, slot, keywords)
// this returns the Candidate[] the front-end RevenueRouter ranks. We compute,
// server-side and from trusted data:
//   • affiliate candidates: active offers matching targeting, with a keyword
//     RELEVANCE score and an EXPECTED VALUE (learned EPC, else payout proxy);
//   • a lead candidate when claimed operators can receive it;
//   • a subscription-nudge candidate for operator surfaces.
// The browser never sees offer economics it shouldn't; it only receives the
// scored candidate shells + the resolved click URL (to affiliate-redirect).
//
// Endpoint: POST /functions/v1/router-candidates
//   body: { verticalSlug, pageType, funnelStage, slot, keywords[], geoScope, hasClaimedOperators }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";

interface Body {
  verticalSlug: string;
  pageType: string;
  funnelStage: "research" | "compare" | "hire_now";
  slot: string;
  keywords?: string[];
  geoScope?: string | null;
  hasClaimedOperators?: boolean;
  sessionId?: string;
}

/** Jaccard-style keyword overlap → 0..1 relevance. Transparent + cheap (v1). */
function relevance(offerKeywords: string[], pageKeywords: string[]): number {
  if (offerKeywords.length === 0 || pageKeywords.length === 0) return 0.5;
  const a = new Set(offerKeywords.map((k) => k.toLowerCase()));
  const b = new Set(pageKeywords.map((k) => k.toLowerCase()));
  let hits = 0;
  for (const k of b) if (a.has(k)) hits++;
  return Math.min(1, 0.4 + (hits / b.size) * 0.6);
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

  const supabase = adminClient();

  const { data: vertical } = await supabase
    .from("vertical")
    .select("id")
    .eq("slug", body.verticalSlug)
    .single();

  // Active offers eligible for this slot + page type + funnel stage.
  const { data: placements } = await supabase
    .from("affiliate_placement")
    .select(
      "offer_id, slot, page_types, priority, affiliate_offer!inner(id, slug, title, description, cta_label, payout_value, epc, funnel_targets, vertical_ids, keywords, geo_scope, status, disclosure_required, rel_attribute)",
    )
    .eq("slot", body.slot)
    .eq("active", true);

  const candidates: unknown[] = [];

  for (const p of placements ?? []) {
    // deno-lint-ignore no-explicit-any
    const offer = (p as any).affiliate_offer;
    if (!offer || offer.status !== "active") continue;
    if (
      Array.isArray(p.page_types) &&
      p.page_types.length > 0 &&
      !p.page_types.includes(body.pageType)
    )
      continue;
    if (
      Array.isArray(offer.funnel_targets) &&
      offer.funnel_targets.length > 0 &&
      !offer.funnel_targets.includes(body.funnelStage)
    )
      continue;
    if (
      vertical &&
      Array.isArray(offer.vertical_ids) &&
      offer.vertical_ids.length > 0 &&
      !offer.vertical_ids.includes(vertical.id)
    )
      continue;

    const rel = relevance(offer.keywords ?? [], body.keywords ?? []);
    // Expected value per impression ≈ learned EPC (already £/click × CTR-baked)
    // or a conservative fraction of payout until enough data exists.
    const expectedValue =
      typeof offer.epc === "number" && offer.epc > 0
        ? offer.epc
        : (offer.payout_value ?? 0) * 0.02;

    candidates.push({
      rail: "affiliate",
      ref: offer.id,
      expectedValue,
      relevance: rel,
      featured: false,
      label: offer.cta_label,
      // Render data + the safe click URL (front end appends sess/dec).
      render: {
        offerId: offer.id,
        title: offer.title,
        description: offer.description,
        ctaLabel: offer.cta_label,
        clickPath: `/functions/v1/affiliate-redirect?offer=${offer.id}`,
        disclosureRequired: offer.disclosure_required,
        relAttribute: offer.rel_attribute,
      },
    });
  }

  if (body.hasClaimedOperators) {
    candidates.push({
      rail: "lead",
      ref: "lead-slot",
      // Lead EV derived from CRM outcomes (lead value × P(operator wins));
      // placeholder until the lead loop has data.
      expectedValue: body.funnelStage === "hire_now" ? 0.9 : 0.3,
      relevance: 1,
      featured: false,
      label: "Get free quotes from top-rated providers",
    });
  }

  return json({ candidates });
});
