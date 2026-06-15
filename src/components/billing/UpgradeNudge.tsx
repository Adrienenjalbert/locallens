"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// A small, inline upgrade nudge surfaced at high-intent moments (e.g. "3 leads
// waiting — upgrade to reply instantly"). It never blocks the underlying value
// (users always SEE their leads); it points at the reason to upgrade and routes
// to /pricing. Token-driven so it re-skins per vertical.
export function UpgradeNudge({
  reason,
  cta = "See plans",
  className,
}: {
  reason: string;
  cta?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-md border border-primary/30 bg-primary/5 px-3.5 py-2.5",
        className,
      )}
    >
      <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0">{reason}</span>
      </p>
      <Link
        href="/pricing"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {cta}
      </Link>
    </div>
  );
}
