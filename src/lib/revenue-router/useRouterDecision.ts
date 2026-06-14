"use client";

import { useEffect, useMemo, useState } from "react";
import { RevenueRouter } from "./router";
import type { Candidate, RouterContext, RouterDecision, SlotName } from "./types";
import type { RouterPolicy } from "@config/types";
import { fetchCandidates, type ServerCandidate } from "./fetch-candidates";

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
    return new RevenueRouter(policy).decide({ ...context, slot }, candidates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot, policy, serverCandidates, fallbackCandidates]);

  return { decision, serverCandidates };
}
