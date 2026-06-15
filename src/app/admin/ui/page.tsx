"use client";

import { useEffect, useMemo, useState } from "react";
import { admin, type UiSnapshotRow } from "@/lib/admin/repo";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// /admin/ui — UI VERIFICATION release gate. Per-deploy + scheduled screenshots
// across page-types × devices from the ui-verify function (visual-regression
// diff, "looks great?" rubric, CWV, WCAG). A broken/critical regression blocks
// release; thin/ugly routes to the enrichment queue. Reads are RLS-gated;
// without a backend admin.uiSnapshots() returns [] and we render a graceful
// empty state. No extra shell — the /admin layout provides AdminShell.

type StatusFilter = "all" | "broken" | "changed" | "ok";

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "muted"> = {
  ok: "success",
  changed: "warning",
  broken: "danger",
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "broken", label: "Broken" },
  { key: "changed", label: "Changed" },
  { key: "ok", label: "OK" },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

function issuesCount(issues: unknown): number {
  return Array.isArray(issues) ? issues.length : 0;
}

export default function AdminUiPage() {
  const [rows, setRows] = useState<UiSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;
    admin
      .uiSnapshots()
      .then((data) => {
        if (active) setRows(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(() => {
    const c = { ok: 0, changed: 0, broken: 0 };
    for (const r of rows) {
      if (r.diff_status === "ok" || r.diff_status === "changed" || r.diff_status === "broken") {
        c[r.diff_status]++;
      }
    }
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.diff_status === filter)),
    [rows, filter],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">UI verification</h1>
        <p className="text-sm text-muted-foreground">
          Per-deploy and scheduled screenshots across page-types × devices. A broken (critical)
          visual regression blocks release; a thin or ugly route is routed to the enrichment queue.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="OK" value={counts.ok} tone="success" />
        <SummaryCard label="Changed" value={counts.changed} tone="warning" />
        <SummaryCard label="Broken" value={counts.broken} tone="danger" hint="blocks release" />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by diff status">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading snapshots…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No UI snapshots yet" : "Nothing matches this filter"}
          description={
            rows.length === 0
              ? "The ui-verify function writes screenshot/visual-regression results here."
              : "Try a different status filter."
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {visible.length} snapshot{visible.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">Page type</th>
                  <th scope="col" className="px-4 py-2 font-medium">Device</th>
                  <th scope="col" className="px-4 py-2 font-medium">Diff</th>
                  <th scope="col" className="px-4 py-2 font-medium">Issues</th>
                  <th scope="col" className="px-4 py-2 font-medium">Captured</th>
                  <th scope="col" className="px-4 py-2 font-medium">Screenshot</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const issues = issuesCount(r.issues);
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{r.page_type ?? "—"}</td>
                      <td className="px-4 py-2 capitalize">{r.device ?? "—"}</td>
                      <td className="px-4 py-2">
                        <Badge
                          tone={STATUS_TONE[r.diff_status ?? ""] ?? "muted"}
                          className="capitalize"
                        >
                          {r.diff_status ?? "unknown"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">{issues}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatWhen(r.captured_at)}</td>
                      <td className="px-4 py-2">
                        {r.screenshot_url ? (
                          <a
                            href={r.screenshot_url}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            view
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger";
  hint?: string;
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardBody>
    </Card>
  );
}
