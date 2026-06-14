"use client";

import { Fragment } from "react";
import { Check } from "lucide-react";
import { LIFECYCLE_STAGES, type LifecycleStage } from "@/lib/crm/types";
import { cn } from "@/lib/utils";

// The job-lifecycle spine rendered as a horizontal stepper. Every CRM surface
// puts this at the top so the owner always sees where the current stage sits in
// the Lead → Quote → Job → Completed → Invoice → Paid flow.

const STAGE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  quote: "Quote",
  job: "Job",
  completed: "Completed",
  invoice: "Invoice",
  paid: "Paid",
};

export function LifecycleStepper({
  current,
  className,
}: {
  current: LifecycleStage;
  className?: string;
}) {
  const currentIndex = LIFECYCLE_STAGES.indexOf(current);

  return (
    <nav
      aria-label="Job lifecycle"
      className={cn(
        "flex items-center gap-1 overflow-x-auto pb-1 text-xs sm:text-sm",
        className,
      )}
    >
      <ol className="flex items-center gap-1">
        {LIFECYCLE_STAGES.map((stage, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <Fragment key={stage}>
              <li>
                <span
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 font-medium transition",
                    isCurrent && "bg-primary text-primary-foreground",
                    isDone && "bg-success/15 text-success",
                    !isCurrent && !isDone && "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold",
                      isCurrent && "bg-primary-foreground/20",
                      isDone && "bg-success/25",
                      !isCurrent && !isDone && "bg-foreground/10",
                    )}
                    aria-hidden
                  >
                    {isDone ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  {STAGE_LABELS[stage]}
                </span>
              </li>
              {index < LIFECYCLE_STAGES.length - 1 && (
                <li aria-hidden className="text-muted-foreground/50">
                  <span className="block h-px w-3 bg-border sm:w-5" />
                </li>
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
