import type { RouterPolicy } from "@config/types";
import type { Candidate, RouterContext } from "./types";

/**
 * The trust floor, enforced in code. Each constraint returns null if the
 * candidate is allowed, or a string reason if it must be rejected. The router
 * may only ever choose among candidates that pass ALL constraints — this is
 * what keeps revenue optimisation honest, structurally rather than by policy.
 */
export type Constraint = (
  candidate: Candidate,
  ctx: RouterContext,
  policy: RouterPolicy,
) => string | null;

/** #1 Ranking integrity: paid/featured units cannot exceed the above-fold cap. */
const featuredCap: Constraint = (c, ctx, policy) => {
  if (!c.featured) return null;
  if (ctx.featuredAboveFoldCount >= policy.trust_floor.max_featured_above_fold) {
    return "featured_cap_reached";
  }
  return null;
};

/** #2 Affiliate relevance + disclosure: irrelevant affiliate never renders. */
const affiliateRelevance: Constraint = (c, _ctx, policy) => {
  if (c.rail !== "affiliate") return null;
  if (c.relevance < policy.trust_floor.affiliate_relevance_min) {
    return "affiliate_below_relevance_floor";
  }
  return null;
};

/** #3 Answer-first floor: no monetisation unit before the answer/shortlist. */
const answerFirst: Constraint = (_c, ctx, policy) => {
  if (!policy.trust_floor.answer_first) return null;
  if (!ctx.answerAlreadyRendered) return "answer_not_yet_rendered";
  return null;
};

/** #4 Consent: affiliate/marketing rails require marketing consent. */
const consentGate: Constraint = (c, ctx) => {
  if (c.rail === "affiliate" && !ctx.consent.marketing) {
    return "no_marketing_consent";
  }
  return null;
};

/** #5 Lead rail only valid when a claimed operator can actually receive it. */
const leadRequiresOperator: Constraint = (c, ctx) => {
  if (c.rail === "lead" && !ctx.hasClaimedOperators) return "no_operator_for_lead";
  return null;
};

export const TRUST_FLOOR: Constraint[] = [
  featuredCap,
  affiliateRelevance,
  answerFirst,
  consentGate,
  leadRequiresOperator,
];

/** Returns the first failing reason, or null if the candidate clears the floor. */
export function checkConstraints(
  candidate: Candidate,
  ctx: RouterContext,
  policy: RouterPolicy,
  constraints: Constraint[] = TRUST_FLOOR,
): string | null {
  for (const constraint of constraints) {
    const reason = constraint(candidate, ctx, policy);
    if (reason) return reason;
  }
  return null;
}
