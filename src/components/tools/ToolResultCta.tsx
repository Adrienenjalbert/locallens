"use client";

import { MonetisationSlot } from "@/components/monetisation/MonetisationSlot";
import type { AffiliateUnitData } from "@/components/monetisation/AffiliateUnit";
import type { Candidate, RouterContext } from "@/lib/revenue-router";
import { withBasePath } from "@/lib/paths";

// The demo affiliate catalogue + resolver live here (a client module) so the
// server-rendered tool views can drop in this CTA without passing a function
// prop across the server/client boundary (which is not serialisable).
const AFFILIATE_DATA: Record<string, AffiliateUnitData> = {
  "offer-liability": {
    offerId: "offer-liability",
    title: "Public liability cover for garden work",
    description: "Compare insurance before you book or quote a job.",
    ctaLabel: "Compare cover",
    href: withBasePath("/r/offer-liability"),
    disclosureRequired: true,
    relAttribute: "sponsored nofollow",
  },
};

/**
 * Client island that renders the ending tool CTA via the RevenueRouter's
 * "tool-result-cta" slot. The router decides affiliate vs lead vs nothing; trust
 * floor + disclosure are enforced inside MonetisationSlot.
 */
export function ToolResultCta({
  context,
  policy,
  candidates,
  keywords,
}: {
  context: Omit<RouterContext, "slot">;
  policy: React.ComponentProps<typeof MonetisationSlot>["policy"];
  candidates: Candidate[];
  keywords?: string[];
}) {
  return (
    <MonetisationSlot
      slot="tool-result-cta"
      context={context}
      policy={policy}
      candidates={candidates}
      fetchLive
      keywords={keywords}
      resolveAffiliate={(ref) => AFFILIATE_DATA[ref]}
    />
  );
}
