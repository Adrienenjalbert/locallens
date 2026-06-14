import { Sparkles } from "lucide-react";

/** Shown to operators: nudge toward the CRM/Growth subscription. */
export function SubscriptionNudge({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden />
        <span className="font-medium">{label}</span>
      </div>
    </div>
  );
}
