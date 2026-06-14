import { MessageSquare } from "lucide-react";

/** Routes the visitor to contact the top-ranked verified operator (a lead). */
export function LeadCaptureCta({ label }: { label: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-foreground">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-medium">{label}</span>
      </div>
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        Get free quotes from top-rated providers
      </button>
    </div>
  );
}
