"use client";

import type {
  Candidate,
  RouterContext,
  RouterDecision,
  SlotName,
} from "@/lib/revenue-router";
import type { RouterPolicy } from "@config/types";
import { useRouterDecision } from "@/lib/revenue-router/useRouterDecision";
import type { ServerCandidate } from "@/lib/revenue-router/fetch-candidates";
import { AffiliateUnit, type AffiliateUnitData } from "./AffiliateUnit";
import { LeadCaptureCta } from "./LeadCaptureCta";
import { SubscriptionNudge } from "./SubscriptionNudge";

/**
 * A named, optimisable slot on a page. The page never decides what fills it —
 * it asks the RevenueRouter, renders the chosen unit, enforces trust-floor
 * visuals, and (in production) logs the decision + impression. One component,
 * fully optimisable by the CRISP-DM loop without touching page code.
 *
 * Renders immediately with static `candidates` (SSG-safe). When `fetchLive` is
 * set, it upgrades to server-built candidates (live EPC, relevance, resolved
 * affiliate click URLs) from the router-candidates Edge Function.
 */
export function MonetisationSlot({
  slot,
  context,
  policy,
  candidates,
  fetchLive = false,
  keywords,
  resolveAffiliate,
  onDecision,
}: {
  slot: SlotName;
  context: Omit<RouterContext, "slot">;
  policy: RouterPolicy;
  candidates: Candidate[];
  fetchLive?: boolean;
  keywords?: string[];
  /** Static resolver for SSG/fallback; server candidates carry their own render data. */
  resolveAffiliate?: (ref: string) => AffiliateUnitData | undefined;
  onDecision?: (decision: RouterDecision) => void;
}) {
  const { decision, serverCandidates } = useRouterDecision({
    slot,
    context,
    policy,
    fallbackCandidates: candidates,
    fetchLive,
    keywords,
  });

  onDecision?.(decision);

  const chosen = decision.chosen;
  if (!chosen) return null; // showing nothing is a valid, honest outcome

  switch (chosen.rail) {
    case "affiliate": {
      const data =
        affiliateFromServer(serverCandidates, chosen.ref, context, slot) ??
        resolveAffiliate?.(chosen.ref);
      return data ? <AffiliateUnit data={data} /> : null;
    }
    case "lead":
      return <LeadCaptureCta label={chosen.label} />;
    case "subscription":
      return <SubscriptionNudge label={chosen.label} />;
    case "featured":
      // Featured operator units render via the BusinessCard path with a
      // labelled "Featured" badge; handled by the page, not here.
      return null;
    default: {
      const _exhaustive: never = chosen.rail;
      return _exhaustive;
    }
  }
}

/** Build AffiliateUnitData from a server candidate, appending tracking context. */
function affiliateFromServer(
  serverCandidates: ServerCandidate[],
  ref: string,
  context: Omit<RouterContext, "slot">,
  _slot: SlotName,
): AffiliateUnitData | undefined {
  const sc = serverCandidates.find((c) => c.ref === ref && c.render);
  if (!sc?.render) return undefined;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const sess = context.sessionId ? `&sess=${encodeURIComponent(context.sessionId)}` : "";
  return {
    offerId: sc.render.offerId,
    title: sc.render.title,
    description: sc.render.description,
    ctaLabel: sc.render.ctaLabel,
    href: `${base}${sc.render.clickPath}${sess}`,
    disclosureRequired: sc.render.disclosureRequired,
    relAttribute: sc.render.relAttribute,
  };
}
