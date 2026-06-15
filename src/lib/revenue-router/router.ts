import type { RouterPolicy, RevenueRail } from "@config/types";
import type {
  Candidate,
  RouterContext,
  RouterDecision,
  ScoredCandidate,
} from "./types";
import { checkConstraints, TRUST_FLOOR, type Constraint } from "./constraints";

/**
 * RevenueRouter — the central decision of the whole engine.
 *
 * Given a slot + context + the candidate monetisation units that could fill it,
 * choose the expected-value-maximising option that clears the trust floor.
 *
 * v1 (this file) is a transparent, deterministic RULES policy: score =
 * expectedValue × rail-weight, masked by hard constraints. It is fully
 * explainable (every candidate carries a reason) and safe.
 *
 * v2 swaps `selectArm` for a contextual bandit (Thompson sampling) per
 * (pageType × intent × geoTier) cell WITHOUT changing the call site or the
 * trust floor — pages always just ask `decide(...)`.
 */
export class RevenueRouter {
  constructor(
    private readonly policy: RouterPolicy,
    private readonly constraints: Constraint[] = TRUST_FLOOR,
  ) {}

  private railWeight(rail: RevenueRail): number {
    return this.policy.weights[rail] ?? 1;
  }

  /** Score + constraint-check every candidate, then pick the best allowed one. */
  decide(ctx: RouterContext, candidates: Candidate[]): RouterDecision {
    const scored: ScoredCandidate[] = candidates.map((c) => {
      const failReason = checkConstraints(c, ctx, this.policy, this.constraints);
      const score = c.expectedValue * this.railWeight(c.rail);
      return {
        ...c,
        score,
        allowed: failReason === null,
        reason: failReason ?? "ok",
      };
    });

    const chosen = this.selectArm(scored, ctx);

    return {
      slot: ctx.slot,
      chosen,
      candidates: scored,
      policyVersion: this.policy.policy_version,
    };
  }

  /**
   * v1 arm selection: highest score among allowed candidates. Showing NOTHING
   * is a legitimate, often-correct outcome (no candidate clears the floor, or
   * all expected values are ~0). The BanditRouter overrides this for
   * exploration; `ctx` is passed so a contextual policy can pick the right cell.
   */
  protected selectArm(
    scored: ScoredCandidate[],
    _ctx: RouterContext,
  ): ScoredCandidate | null {
    const allowed = scored
      .filter((c) => c.allowed && c.score > 0)
      .sort((a, b) => b.score - a.score);
    return allowed[0] ?? null;
  }

  /** Candidates allowed by the trust floor with positive score (shared helper). */
  protected eligible(scored: ScoredCandidate[]): ScoredCandidate[] {
    return scored.filter((c) => c.allowed && c.score > 0);
  }
}
