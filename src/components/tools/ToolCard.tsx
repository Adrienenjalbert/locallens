import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { type ToolDefinition, toolPath } from "@/lib/tools/registry";

/**
 * A single tool tile for the hub + category grids. Links to the tool page; the
 * whole card is the click target. Server-rendered (no client JS) so the listing
 * stays fully crawlable.
 */
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      href={toolPath(tool.slug)}
      className="group flex flex-col rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
    >
      <h3 className="font-display text-base font-semibold text-foreground">
        {tool.name}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {tool.description.replace(/\s*Free, no signup\.$/, "")}
      </p>
      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
        Open tool
        <ArrowRight
          className="h-4 w-4 transition group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
