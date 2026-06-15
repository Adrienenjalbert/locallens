"use client";

import { useEffect, useMemo, useState } from "react";
import { RevenueRouter } from "./router";
import { BanditRouter } from "./bandit-router";
import type { ArmStats } from "./bandit";
import { fetchArmStats } from "./fetch-arm-stats";
import type { Candidate, RouterContext, RouterDecision, SlotName } from "./types";
import type { RouterPolicy } from "@config/types";
import { fetchCandidates, type ServerCandidate } from "./fetch-candidates";

function isBanditPolicy(policy: RouterPolicy): boolean {
  return policy.policy_version.startsWith("bandit");
}

interface Options {
  slot: SlotName;
  context: Omit<RouterContext, "slot">;
  policy: RouterPolicy;
  /** Static fallback candidates (used for SSG + when no backend configured). */
  fallbackCandidates: Candidate[];
  /** When true, fetch live candidates from the router-candidates Edge Function. */
  fetchLive?: boolean;
  /** Page keyword set for affiliate relevance matching server-side. */
  keywords?: string[];
}

/**
 * Runs the RevenueRouter for a slot. Renders immediately with static fallback
 * candidates (good for the statically-exported page + zero-flash), then — if
 * `fetchLive` — upgrades to server-built candidates (live EPC + relevance +
 * resolved click URLs) once they arrive. The trust floor applies either way.
 */
export function useRouterDecision({
  slot,
  context,
  policy,
  fallbackCandidates,
  fetchLive = false,
  keywords,
}: Options): { decision: RouterDecision; serverCandidates: ServerCandidate[] } {
  const [serverCandidates, setServerCandidates] = useState<ServerCandidate[]>([]);
  // Bandit posteriors load client-side AFTER first paint. The first
  // (SSG/hydration) render always uses the deterministic rules router so server
  // and client markup match; once stats arrive we switch to Thompson sampling.
  const [armStats, setArmStats] = useState<ArmStats | null>(null);

  useEffect(() => {
    if (!isBanditPolicy(policy)) return;
    let cancelled = false;
    fetchArmStats({
      pageType: context.pageType,
      intentStage: context.intentStage,
      geoTier: context.geoTier,
    })
      .then((s) => {
        if (!cancelled) setArmStats(s);
      })
      .catch(() => {
        /* fall back to rules router on failure */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policy.policy_version, context.pageType, context.intentStage, context.geoTier]);

  useEffect(() => {
    if (!fetchLive) return;
    let cancelled = false;
    fetchCandidates({
      verticalSlug: context.verticalSlug,
      pageType: context.pageType,
      funnelStage: context.intentStage,
      slot,
      keywords,
      hasClaimedOperators: context.hasClaimedOperators,
      sessionId: context.sessionId,
    })
      .then((c) => {
        if (!cancelled && c.length > 0) setServerCandidates(c);
      })
      .catch(() => {
        /* keep fallback on failure — honest, never crashes the page */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLive, slot, context.verticalSlug, context.pageType, context.intentStage]);

  const decision = useMemo(() => {
    const candidates = serverCandidates.length > 0 ? serverCandidates : fallbackCandidates;
    // Use the bandit only once posteriors have loaded (client-only). Until then,
    // and whenever the policy isn't a bandit, use the deterministic rules router
    // — identical trust floor, SSG-safe, no hydration mismatch.
    const router =
      isBanditPolicy(policy) && armStats !== null
        ? new BanditRouter(policy, armStats)
        : new RevenueRouter(policy);
    return router.decide({ ...context, slot }, candidates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, policy, serverCandidates, fallbackCandidates, armStats]);

  return { decision, serverCandidates };
}
