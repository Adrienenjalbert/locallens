import { useMemo } from "react";
import { RevenueRouter } from "@/lib/revenue-router";
import type { Candidate, RouterContext, SlotName } from "@/lib/revenue-router";
import type { RouterPolicy } from "@config/types";
import { AffiliateUnit, type AffiliateUnitData } from "./AffiliateUnit";
import { LeadCaptureCta } from "./LeadCaptureCta";
import { SubscriptionNudge } from "./SubscriptionNudge";

/**
 * A named, optimisable slot on a page. The page never decides what fills it —
 * it asks the RevenueRouter, renders the chosen unit, enforces trust-floor
 * visuals, and logs the decision + impression. One component, fully
 * optimisable by the CRISP-DM loop without touching page code.
 */
export function MonetisationSlot({
  slot,
  context,
  policy,
  candidates,
  /** Resolver maps a chosen candidate ref → the data its unit needs to render. */
  resolveAffiliate,
  onDecision,
}: {
  slot: SlotName;
  context: Omit<RouterContext, "slot">;
  policy: RouterPolicy;
  candidates: Candidate[];
  resolveAffiliate: (ref: string) => AffiliateUnitData | undefined;
  onDecision?: (decision: ReturnType<RevenueRouter["decide"]>) => void;
}) {
  const decision = useMemo(() => {
    const router = new RevenueRouter(policy);
    const d = router.decide({ ...context, slot }, candidates);
    onDecision?.(d);
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, policy, candidates]);

  const chosen = decision.chosen;
  if (!chosen) return null; // showing nothing is a valid, honest outcome

  switch (chosen.rail) {
    case "affiliate": {
      const data = resolveAffiliate(chosen.ref);
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
