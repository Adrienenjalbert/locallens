// Plans + entitlements — config-as-policy. The freemium gates (front end) AND
// the loop (which can tune pricing/limits) both read from here. Keeping this in
// config means the improvement-agent can promote a winning price/limit into a
// default without code changes (per the CRISP-DM loop).

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
  /** See leads in the inbox (always true — the reason to upgrade). */
  viewLeads: boolean;
  /** Max comms/quotes/invoices sends per month (Infinity = unlimited). */
  monthlySendCap: number;
  /** Automated journeys (the powerful layer). */
  automations: boolean;
  /** Stored history beyond the rolling window. */
  storedHistory: boolean;
  /** Invoicing. */
  invoicing: boolean;
  /** Managed lead acquisition / featured placement (the Growth expand). */
  managedLeads: boolean;
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    blurb: "Get listed + see the leads waiting for you.",
    highlights: ["Directory listing", "Free business tools", "See your leads"],
  },
  crm: {
    id: "crm",
    name: "CRM",
    priceMonthly: 9,
    priceAnnual: 90,
    blurb: "Run your whole day — for the price of a coffee a week.",
    highlights: [
      "Unlimited quotes, invoices & sends",
      "Automated follow-ups & reminders",
      "Scheduling + recurring jobs",
      "Full customer history",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 49,
    priceAnnual: 490,
    blurb: "Everything in CRM + we bring you more booked jobs.",
    highlights: [
      "Everything in CRM",
      "Featured & priority placement",
      "Managed lead acquisition",
      "Review generation",
    ],
  },
};

export const ENTITLEMENTS: Record<PlanId, Entitlements> = {
  free: {
    viewLeads: true, // always — leads waiting IS the upgrade reason
    monthlySendCap: 5,
    automations: false,
    storedHistory: false,
    invoicing: false,
    managedLeads: false,
  },
  crm: {
    viewLeads: true,
    monthlySendCap: Infinity,
    automations: true,
    storedHistory: true,
    invoicing: true,
    managedLeads: false,
  },
  growth: {
    viewLeads: true,
    monthlySendCap: Infinity,
    automations: true,
    storedHistory: true,
    invoicing: true,
    managedLeads: true,
  },
};

export function entitlementsFor(plan: PlanId | null | undefined): Entitlements {
  return ENTITLEMENTS[plan ?? "free"];
}
