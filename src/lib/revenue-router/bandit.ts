import type { RouterContext, ScoredCandidate } from "./types";

// ── Contextual bandit for the RevenueRouter (R1) ──────────────────────────
// Beta-Bernoulli Thompson sampling per context CELL × arm. An arm is a
// (rail, ref) monetisation option. For each cell we keep a Beta(α, β) posterior
// over the arm's conversion probability; we sample θ ~ Beta and rank arms by
// θ × expectedValue (Thompson sampling for *revenue*, not just conversion).
//
// The trust floor is unchanged: only candidates the floor allows are passed in,
// so exploration happens strictly INSIDE the floor.

/** Per-arm posterior: Beta(alpha, beta). Start at (1,1) = uniform prior. */
export interface ArmStat {
  alpha: number; // 1 + successes (conversions)
  beta: number; // 1 + failures (impressions without conversion)
}

/** Map keyed by `${cellKey}::${armKey}` → posterior. */
export type ArmStats = Record<string, ArmStat>;

export type Rng = () => number; // returns [0,1)

/** The context cell the bandit indexes on. Coarse enough to gather signal. */
export function cellKey(
  ctx: Pick<RouterContext, "pageType" | "intentStage" | "geoTier">,
): string {
  return `${ctx.pageType}|${ctx.intentStage}|${ctx.geoTier ?? 1}`;
}

export function armKey(c: Pick<ScoredCandidate, "rail" | "ref">): string {
  return `${c.rail}:${c.ref}`;
}

export function statKey(cell: string, arm: string): string {
  return `${cell}::${arm}`;
}

const PRIOR: ArmStat = { alpha: 1, beta: 1 };

export function getStat(stats: ArmStats, cell: string, arm: string): ArmStat {
  return stats[statKey(cell, arm)] ?? PRIOR;
}

// ── Beta sampling ─────────────────────────────────────────────────────────
// Sample from Beta(α, β) via two Gamma draws: X~Gamma(α), Y~Gamma(β),
// Beta = X/(X+Y). Marsaglia–Tsang for Gamma(k≥1); boost for k<1.
function sampleGamma(k: number, rng: Rng): number {
  if (k < 1) {
    // Johnk/boost: Gamma(k) = Gamma(k+1) * U^(1/k)
    const u = Math.max(rng(), 1e-12);
    return sampleGamma(k + 1, rng) * Math.pow(u, 1 / k);
  }
  const d = k - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const x = normal(rng);
    const v0 = 1 + c * x;
    if (v0 <= 0) continue;
    const v = v0 * v0 * v0;
    const u = Math.max(rng(), 1e-12);
    if (Math.log(u) < 0.5 * x * x + d - d * v + d * Math.log(v)) {
      return d * v;
    }
  }
}

/** Standard normal via Box–Muller. */
function normal(rng: Rng): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function sampleBeta(stat: ArmStat, rng: Rng): number {
  const x = sampleGamma(stat.alpha, rng);
  const y = sampleGamma(stat.beta, rng);
  return x + y === 0 ? 0.5 : x / (x + y);
}

/** A deterministic, seedable RNG (mulberry32) for reproducible tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Thompson-sample the best arm among eligible candidates for a cell.
 * Returns the chosen candidate (by sampled θ × expectedValue) or null if none.
 * `posteriorMean` mode (no exploration) is available for offline evaluation.
 */
export function thompsonSelect(
  eligible: ScoredCandidate[],
  ctx: RouterContext,
  stats: ArmStats,
  rng: Rng,
  mode: "sample" | "mean" = "sample",
): ScoredCandidate | null {
  if (eligible.length === 0) return null;
  const cell = cellKey(ctx);
  let best: ScoredCandidate | null = null;
  let bestVal = -Infinity;
  for (const cand of eligible) {
    const stat = getStat(stats, cell, armKey(cand));
    const theta =
      mode === "mean" ? stat.alpha / (stat.alpha + stat.beta) : sampleBeta(stat, rng);
    // Maximise expected REVENUE: P(convert) × value-per-conversion proxy.
    // expectedValue already encodes the per-impression £ proxy, so we blend the
    // learned conversion signal with it to rank by learned expected revenue.
    const value = theta * cand.expectedValue;
    if (value > bestVal) {
      bestVal = value;
      best = cand;
    }
  }
  return best;
}
