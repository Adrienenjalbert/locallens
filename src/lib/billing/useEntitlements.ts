"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { entitlementsFor, type Entitlements, type PlanId } from "@config/plans";

// Resolves the current business's plan → entitlements, for freemium gating.
// Reads the `subscription` row under RLS; defaults to the free plan (so gates
// are conservative) when there's no backend or no active subscription.
export function useEntitlements(): {
  plan: PlanId;
  entitlements: Entitlements;
  loading: boolean;
} {
  const [plan, setPlan] = useState<PlanId>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    supabase
      .from("subscription")
      .select("plan, status")
      .eq("status", "active")
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const p = (data?.plan as PlanId) ?? "free";
        setPlan(p);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { plan, entitlements: entitlementsFor(plan), loading };
}
