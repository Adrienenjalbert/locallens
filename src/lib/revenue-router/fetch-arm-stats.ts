import { supabase } from "@/lib/supabase";
import { statKey, type ArmStats } from "./bandit";
import type { RouterContext } from "./types";
import { cellKey } from "./bandit";

// Loads the bandit posteriors for a given context cell from the public-read
// `arm_stat` table. Returns {} when no backend / no rows — the BanditRouter
// then uses the uniform Beta(1,1) prior per arm (cold-start = pure exploration),
// so it degrades gracefully and never blocks rendering.
export async function fetchArmStats(
  ctx: Pick<RouterContext, "pageType" | "intentStage" | "geoTier">,
): Promise<ArmStats> {
  if (!supabase) return {};
  const cell = cellKey(ctx);
  const { data, error } = await supabase
    .from("arm_stat")
    .select("cell_key, arm_key, alpha, beta")
    .eq("cell_key", cell);
  if (error || !data) return {};
  const stats: ArmStats = {};
  for (const row of data) {
    stats[statKey(row.cell_key, row.arm_key)] = {
      alpha: Number(row.alpha),
      beta: Number(row.beta),
    };
  }
  return stats;
}
