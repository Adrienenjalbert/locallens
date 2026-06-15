// Plans + entitlements — config-as-policy. The freemium gates (front end) AND
// the loop (which can tune pricing/limits) both read from here. Keeping this in
// config means the improvement-agent can promote a winning price/limit into a
// default without code changes (per the CRISP-DM loop).
//
// The UK wedge is "Reviews on Autopilot" (docs/02-BUSINESS-PLAN-UK-GTM.md): a
// pure-software, near-zero-marginal-cost product (~£1–£3/client/mo to run), so
// the paid fee stays low (£12) and honest while margin is healthy from client
// #1. The paid land tier keeps the id `crm` (Stripe + persisted rows depend on
// it) but is messaged as "Pro" — automated review requests + AI replies + light
// CRM. Managed ads is deliberately NOT a tier (rejected as the wedge — too high
// a cost barrier for us and the customer); it may return later as an add-on.

export type PlanId = "free" | "crm" | "growth";

export interface PlanDef {
  id: PlanId;
  name: string;
  /** Indicative monthly price in GBP (validated in the research loop). */
  priceMonthly: number;
  priceAnnual: number;
  /** Stripe price ids (set per-environment; empty in dev). */
  stripePriceMonthly?: string;
  stripePriceAnnual?: string;
  blurb: string;
  highlights: string[];
}

/** Boolean/numeric capabilities the UI gates on. */
export interface Entitlements {
  /** See leads + reviews waiting in the inbox (always true — the upgrade hook). */
  viewLeads: boolean;
  /** Max review/comms/quote/invoice sends per month (Infinity = unlimited). */
  monthlySendCap: number;
  /** Automated review requests + follow-ups (the core of the wedge). */
  reviewAutomation: boolean;
  /** AI-drafted review replies. */
  aiReviewReplies: boolean;
  /** Automated lifecycle journeys (the powerful layer). */
  automations: boolean;
  /** Stored history beyond the rolling window. */
  storedHistory: boolean;
  /** Invoicing. */
  invoicing: boolean;
  /** Directory priority placement / lead boosts (the Growth expand). */
  managedLeads: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    blurb: "Get listed, check your reputation, and see the leads waiting.",
    highlights: [
      "Directory listing",
      "Free reputation check",
      "Manual review-request link",
      "See your leads & reviews",
    ],
  },
  crm: {
    id: "crm",
    name: "Pro",
    priceMonthly: 12,
    priceAnnual: 120,
    blurb: "Reviews on autopilot — finish a job, tap once, the reviews roll in.",
    highlights: [
      "Automated review requests + follow-ups",
      "AI-drafted review replies",
      "Review monitoring & reputation score",
      "Light CRM (customers, jobs) + unlimited sends",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 29,
    priceAnnual: 290,
    blurb: "Everything in Pro + more visibility and more booked jobs.",
    highlights: [
      "Everything in Pro",
      "Multi-channel (WhatsApp + SMS + email)",
      "Priority placement in the directory",
      "Lead boosts + review widget for your site",
    ],
  },
};

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    viewLeads: true, // always — leads + reviews waiting IS the upgrade reason
    monthlySendCap: 5,
    reviewAutomation: false, // free = manual review link only
    aiReviewReplies: false,
    automations: false,
    storedHistory: false,
    invoicing: false,
    managedLeads: false,
  },
  crm: {
    viewLeads: true,
    monthlySendCap: Infinity,
    reviewAutomation: true, // the wedge: automated requests + follow-ups
    aiReviewReplies: true,
    automations: true,
    storedHistory: true,
    invoicing: true,
    managedLeads: false,
  },
  growth: {
    viewLeads: true,
    monthlySendCap: Infinity,
    reviewAutomation: true,
    aiReviewReplies: true,
    automations: true,
    storedHistory: true,
    invoicing: true,
    managedLeads: true,
  },
};

export function entitlementsFor(plan: PlanId | null | undefined): Entitlements {
  return ENTITLEMENTS[plan ?? "free"];
}
