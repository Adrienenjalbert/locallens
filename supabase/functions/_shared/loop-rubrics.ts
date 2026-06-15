// loop-rubrics — pure rubric definitions + evaluation for the improvement-agent.
//
// One rubric per surface (the five loops in docs/02-CRISP-DM-LOOP.md). Each
// encodes: the ONE primary metric, its guardrail (the honesty constraint from
// docs/01-DATA-SCIENCE.md — RPM must not rise at the expense of qualified
// actions), the minimum exposure before we may call a result, and the
// thresholds that define "a clear win". Sensitivity marks which surfaces a
// human must approve (ranking weights, router policy) before promotion.
//
// This module is intentionally PURE: constants + pure functions, NO IO. The
// agent (index.ts) does all reads/writes and feeds aggregates into
// `evaluateVariant()` here. Keeping it pure keeps the decision logic testable
// and auditable in isolation.

/** The five improvement surfaces. `ranking` + `router` are human-gated. */
export type LoopSurface = "ranking" | "pseo" | "tool" | "router" | "comms";

/** A surface needing human approval before any promotion (trust not yet earned). */
export type Sensitivity = "auto" | "human_gated";

export interface SurfaceRubric {
  surface: LoopSurface;
  /** Human-facing label for the control tower. */
  label: string;
  /** The ONE metric a winner must move (higher is better). */
  primaryMetric: string;
  /** The metric that must NOT regress beyond `guardrailTolerance`. */
  guardrailMetric: string;
  /** Allowed fractional drop in the guardrail vs control before we reject (e.g. 0.05 = 5%). */
  guardrailTolerance: number;
  /** Sessions/exposures a variant needs before a result may be called. */
  minExposure: number;
  /** Minimum relative lift over control to count as a "clear win" (e.g. 0.05 = +5%). */
  minRelativeLift: number;
  /**
   * Sensitivity gate. `human_gated` surfaces (ranking, router) may only be
   * PROPOSED by the agent (decision_log decision='iterate' + needs-approval
   * note); they are never auto-promoted. `auto` surfaces (comms, pseo, tool)
   * promote a clear winner automatically.
   */
  sensitivity: Sensitivity;
  /** Why this surface is gated (rendered in the proposal rationale). */
  gateReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// The rubrics. Metrics + guardrails mirror the table in 02-CRISP-DM-LOOP.md.
// ─────────────────────────────────────────────────────────────────────────────
export const RUBRICS: Record<LoopSurface, SurfaceRubric> = {
  ranking: {
    surface: "ranking",
    label: "Directory ranking",
    primaryMetric: "qualified_actions_per_1k",
    guardrailMetric: "data_accuracy",
    guardrailTolerance: 0.02,
    minExposure: 2000,
    minRelativeLift: 0.05,
    sensitivity: "human_gated",
    gateReason:
      "Ranking weights shape what users trust we surface. A bad weight change quietly degrades the directory's integrity, so a human approves every promotion until trust is earned.",
  },
  pseo: {
    surface: "pseo",
    label: "pSEO + market entry",
    primaryMetric: "rpm",
    guardrailMetric: "thin_content_rate",
    guardrailTolerance: 0.05,
    minExposure: 1500,
    minRelativeLift: 0.08,
    sensitivity: "auto",
  },
  tool: {
    surface: "tool",
    label: "Tool conversion",
    primaryMetric: "completion_rate",
    guardrailMetric: "bounce_rate",
    guardrailTolerance: 0.05,
    minExposure: 1000,
    minRelativeLift: 0.05,
    sensitivity: "auto",
  },
  router: {
    surface: "router",
    label: "Monetisation routing",
    primaryMetric: "rpm",
    guardrailMetric: "qualified_actions_per_1k",
    guardrailTolerance: 0.05,
    minExposure: 2000,
    minRelativeLift: 0.05,
    sensitivity: "human_gated",
    gateReason:
      "Routing decides what monetises each session. RPM must not rise by spending the trust floor (qualified actions / disclosure), so a human approves every router-policy promotion.",
  },
  comms: {
    surface: "comms",
    label: "CRM comms",
    primaryMetric: "quote_to_won_rate",
    guardrailMetric: "unsubscribe_rate",
    guardrailTolerance: 0.03,
    minExposure: 200,
    minRelativeLift: 0.1,
    sensitivity: "auto",
  },
};

export const SURFACES: LoopSurface[] = Object.keys(RUBRICS) as LoopSurface[];

/** Observed metrics for one experiment arm. `exposure` is sessions/sends. */
export interface VariantMetrics {
  key: string;
  exposure: number;
  /** Value of the surface's primary metric (higher is better). */
  primary: number;
  /** Value of the surface's guardrail metric (interpretation below). */
  guardrail: number;
}

/** The recommendation `evaluateVariant` returns — maps onto decision_log. */
export type LoopDecision = "promoted" | "retired" | "iterate";

export interface VariantEvaluation {
  variantKey: string;
  /** What the agent recommends for this variant relative to control. */
  decision: LoopDecision;
  /**
   * True only when this is an auto-promotable clear win on an `auto` surface.
   * On `human_gated` surfaces a clear win is downgraded to `iterate` + this
   * stays false (the agent proposes, a human promotes).
   */
  autoPromote: boolean;
  /** Relative lift in the primary metric vs control (fraction). */
  relativeLift: number;
  /** True if the guardrail regressed beyond tolerance vs control. */
  guardrailBreached: boolean;
  /** True once both arms have cleared `minExposure`. */
  exposureReached: boolean;
  /** Human-readable explanation for the decision_log rationale. */
  rationale: string;
}

const isLowerBetter = (guardrailMetric: string): boolean =>
  guardrailMetric === "thin_content_rate" ||
  guardrailMetric === "bounce_rate" ||
  guardrailMetric === "unsubscribe_rate";

function relLift(variant: number, control: number): number {
  if (control <= 0) return variant > 0 ? 1 : 0;
  return (variant - control) / control;
}

/**
 * Decide a single variant against its control using the surface rubric. Pure:
 * no IO, deterministic. The agent calls this per arm and persists the result.
 *
 * Decision logic:
 *  - exposure not reached on either arm        → iterate ("keep running")
 *  - guardrail breached beyond tolerance        → retired (a win that costs trust is not a win)
 *  - primary lift ≥ minRelativeLift, no breach  → clear win:
 *        auto surface      → promoted (autoPromote = true)
 *        human_gated       → iterate  (PROPOSAL: needs human approval)
 *  - primary clearly worse (≤ -minRelativeLift) → retired
 *  - otherwise (inconclusive / flat)            → iterate
 */
export function evaluateVariant(
  rubric: SurfaceRubric,
  variant: VariantMetrics,
  control: VariantMetrics,
): VariantEvaluation {
  const exposureReached =
    variant.exposure >= rubric.minExposure && control.exposure >= rubric.minExposure;

  const relativeLift = relLift(variant.primary, control.primary);

  // Guardrail breach: for lower-is-better metrics a RISE beyond tolerance is bad;
  // for higher-is-better metrics (e.g. data_accuracy, qualified_actions) a DROP
  // beyond tolerance is bad.
  const guardrailDelta = relLift(variant.guardrail, control.guardrail);
  const guardrailBreached = isLowerBetter(rubric.guardrailMetric)
    ? guardrailDelta > rubric.guardrailTolerance
    : guardrailDelta < -rubric.guardrailTolerance;

  const base = { variantKey: variant.key, relativeLift, guardrailBreached, exposureReached };
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const metricSummary =
    `${rubric.primaryMetric} ${relativeLift >= 0 ? "+" : ""}${pct(relativeLift)} vs control; ` +
    `${rubric.guardrailMetric} ${guardrailDelta >= 0 ? "+" : ""}${pct(guardrailDelta)}`;

  if (!exposureReached) {
    return {
      ...base,
      decision: "iterate",
      autoPromote: false,
      rationale:
        `Keep running: exposure ${variant.exposure}/${control.exposure} below ` +
        `min ${rubric.minExposure}. (${metricSummary})`,
    };
  }

  if (guardrailBreached) {
    return {
      ...base,
      decision: "retired",
      autoPromote: false,
      rationale:
        `Retire: guardrail ${rubric.guardrailMetric} breached tolerance ` +
        `${pct(rubric.guardrailTolerance)}. A primary lift bought at the cost of the ` +
        `guardrail is not a win. (${metricSummary})`,
    };
  }

  if (relativeLift >= rubric.minRelativeLift) {
    if (rubric.sensitivity === "human_gated") {
      return {
        ...base,
        decision: "iterate",
        autoPromote: false,
        rationale:
          `PROPOSAL — needs human approval. Clear win on a sensitive surface ` +
          `(${rubric.label}): ${metricSummary}, guardrail healthy. The agent does NOT ` +
          `auto-promote ${rubric.surface}; a human must approve. ${rubric.gateReason ?? ""}`.trim(),
      };
    }
    return {
      ...base,
      decision: "promoted",
      autoPromote: true,
      rationale:
        `Auto-promote: clear win on ${rubric.label}. ${metricSummary}; lift ≥ ` +
        `min ${pct(rubric.minRelativeLift)} and guardrail within tolerance.`,
    };
  }

  if (relativeLift <= -rubric.minRelativeLift) {
    return {
      ...base,
      decision: "retired",
      autoPromote: false,
      rationale: `Retire: clearly underperforms control. ${metricSummary}.`,
    };
  }

  return {
    ...base,
    decision: "iterate",
    autoPromote: false,
    rationale:
      `Inconclusive: lift ${pct(relativeLift)} below the ${pct(rubric.minRelativeLift)} ` +
      `clear-win bar though exposure is reached. Keep iterating. (${metricSummary})`,
  };
}
