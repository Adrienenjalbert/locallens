import type { RouterPolicy } from "@config/types";
import { RevenueRouter } from "./router";
import type { Constraint } from "./constraints";
import { TRUST_FLOOR } from "./constraints";
import type { RouterContext, ScoredCandidate } from "./types";
import { thompsonSelect, type ArmStats, type Rng, seededRng } from "./bandit";

/**
 * BanditRouter — R1: the contextual-bandit policy.
 *
 * It is a drop-in for RevenueRouter: the call site (`MonetisationSlot` →
 * `useRouterDecision`) is unchanged — pages still just call `decide(...)`. The
 * ONLY behavioural change is arm selection (`selectArm`): instead of picking
 * the highest deterministic score, it Thompson-samples among the candidates the
 * TRUST FLOOR already allowed, balancing exploration with exploitation per
 * context cell.
 *
 * Crucially, the trust floor is identical and applied by the base class before
 * `selectArm` runs, so exploration can NEVER violate ranking integrity,
 * relevance, disclosure, answer-first, consent, or lead-needs-operator.
 *
 * Graceful fallback: with no learned stats for an arm, its posterior is the
 * uniform prior Beta(1,1) — so a brand-new arm still gets explored, and the
 * router behaves sensibly from cold start.
 */
export class BanditRouter extends RevenueRouter {
  constructor(
    policy: RouterPolicy,
    private readonly stats: ArmStats,
    private readonly rng: Rng = Math.random,
    constraints: Constraint[] = TRUST_FLOOR,
  ) {
    super(policy, constraints);
  }

  protected override selectArm(
    scored: ScoredCandidate[],
    ctx: RouterContext,
  ): ScoredCandidate | null {
    const eligible = this.eligible(scored);
    return thompsonSelect(eligible, ctx, this.stats, this.rng);
  }
}

/** Factory: build a BanditRouter with a deterministic seed (useful for SSR/tests). */
export function makeBanditRouter(
  policy: RouterPolicy,
  stats: ArmStats,
  seed?: number,
): BanditRouter {
  return new BanditRouter(
    policy,
    stats,
    seed === undefined ? Math.random : seededRng(seed),
  );
}
