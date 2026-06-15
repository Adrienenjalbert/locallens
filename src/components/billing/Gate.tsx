"use client";

import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useEntitlements } from "@/lib/billing/useEntitlements";
import type { Entitlements } from "@config/plans";
import { UpgradeNudge } from "@/components/billing/UpgradeNudge";

// The boolean entitlements the UI can gate behind. Derived from Entitlements so
// `feature` always maps onto a real entitlement key (never a hardcoded limit),
// and the union breaks the build if those keys are renamed in config/plans.ts.
type BooleanEntitlementKey = {
  [K in keyof Entitlements]: Entitlements[K] extends boolean ? K : never;
}[keyof Entitlements];

export type GateFeature = Extract<
  BooleanEntitlementKey,
  | "reviewAutomation"
  | "aiReviewReplies"
  | "automations"
  | "invoicing"
  | "storedHistory"
  | "managedLeads"
>;

// Human-readable reason for the locked state, shown via the UpgradeNudge.
const GATE_REASON: Record<GateFeature, string> = {
  reviewAutomation: "Put your reviews on autopilot — ask every customer automatically",
  aiReviewReplies: "Reply to every review with AI-drafted responses",
  automations: "Turn on automated follow-ups & reminders",
  invoicing: "Send invoices and get paid faster",
  storedHistory: "Unlock your full customer history",
  managedLeads: "Get more booked jobs with priority placement",
};

/** Boolean: is the current plan entitled to `feature`? Reads ENTITLEMENTS. */
export function useGate(feature: GateFeature): boolean {
  const { entitlements } = useEntitlements();
  return entitlements[feature];
}

// Renders children when the current plan is entitled to `feature`; otherwise a
// compact locked state with an UpgradeNudge pointing at /pricing. While the
// plan is resolving we render nothing gated (conservative) to avoid a flash.
export function Gate({
  feature,
  children,
  reason,
}: {
  feature: GateFeature;
  children: ReactNode;
  /** Override the default upgrade reason copy. */
  reason?: string;
}) {
  const { entitlements, loading } = useEntitlements();

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="sr-only">
        Checking your plan…
      </div>
    );
  }

  if (entitlements[feature]) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed bg-muted/30 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
        This is a paid feature
      </p>
      <UpgradeNudge reason={reason ?? GATE_REASON[feature]} cta="Upgrade" />
    </div>
  );
}
