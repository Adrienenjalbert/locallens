import { cn } from "@/lib/utils";

function band(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: "Top rated", cls: "bg-success text-white" };
  if (score >= 70)
    return { label: "Verified", cls: "bg-primary text-primary-foreground" };
  if (score >= 50) return { label: "Rising", cls: "bg-warning text-white" };
  return { label: "Listed", cls: "bg-muted text-muted-foreground" };
}

/** Explainable 0–100 Quality Score with colour band + accessible tooltip. */
export function QualityScoreBadge({ score }: { score: number }) {
  const { label, cls } = band(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        cls,
      )}
      title={`LocalLens Quality Score ${score}/100 — ${label}. Based on real reviews, portfolio, verification, completeness and data confidence.`}
    >
      <span className="tabular-nums">{Math.round(score)}</span>
      <span className="opacity-90">{label}</span>
    </span>
  );
}
