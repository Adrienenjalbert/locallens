"use client";

import { useEffect, useMemo, useState } from "react";
import { admin, type ExperimentRow } from "@/lib/admin/repo";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// /admin/experiments — a focused view of every A/B test driving the loop. The
// full experiment table with expandable variants + result detail and a status
// filter (running / won / lost), mirroring the /admin/data filter pattern.
// Reads are RLS-gated; without a backend admin.experiments() returns [] and we
// render a graceful empty state. No extra shell — the /admin layout provides
// AdminShell. (Not in the AdminShell nav yet, which is harmless.)

type StatusFilter = "all" | "running" | "won" | "lost";

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "primary" | "muted"> = {
  won: "success",
  lost: "danger",
  paused: "warning",
  running: "primary",
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "running", label: "Running" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

// A variant shape we render. The `variants` jsonb is [{key, config_patch, weight}].
interface Variant {
  key?: string;
  config_patch?: unknown;
  weight?: number;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

function asVariants(value: unknown): Variant[] {
  return Array.isArray(value) ? (value as Variant[]) : [];
}

// The `experiment` row carries `variants` jsonb that the repo's ExperimentRow
// type doesn't expose; read it loosely off the row for the detail panel.
function variantsOf(row: ExperimentRow): Variant[] {
  return asVariants((row as unknown as { variants?: unknown }).variants);
}

export default function AdminExperimentsPage() {
  const [rows, setRows] = useState<ExperimentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    admin
      .experiments()
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
    const c = { running: 0, won: 0, lost: 0 };
    for (const r of rows) {
      if (r.status === "running" || r.status === "won" || r.status === "lost") c[r.status]++;
    }
    return c;
  }, [rows]);

  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">Experiments</h1>
        <p className="text-sm text-muted-foreground">
          Every config default is the champion of an ongoing test. Expand a row to inspect its
          variants and the result the improvement-agent recorded.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Running" value={counts.running} tone="primary" />
        <SummaryCard label="Won" value={counts.won} tone="success" />
        <SummaryCard label="Lost" value={counts.lost} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
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
        <p className="text-sm text-muted-foreground">Loading experiments…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No experiments yet" : "Nothing matches this filter"}
          description={
            rows.length === 0
              ? "Experiments appear here as the loop spins up A/B tests across ranking, pSEO, tools, routing and comms."
              : "Try a different status filter."
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {visible.length} experiment{visible.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">Experiment</th>
                  <th scope="col" className="px-4 py-2 font-medium">Surface</th>
                  <th scope="col" className="px-4 py-2 font-medium">Primary</th>
                  <th scope="col" className="px-4 py-2 font-medium">Guardrail</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 font-medium">Started</th>
                  <th scope="col" className="px-4 py-2 font-medium sr-only">Detail</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((e) => {
                  const isOpen = expanded === e.id;
                  const variants = variantsOf(e);
                  return (
                    <ExperimentRows
                      key={e.id}
                      row={e}
                      variants={variants}
                      isOpen={isOpen}
                      onToggle={() => setExpanded(isOpen ? null : e.id)}
                    />
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

function ExperimentRows({
  row,
  variants,
  isOpen,
  onToggle,
}: {
  row: ExperimentRow;
  variants: Variant[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b last:border-0">
        <td className="px-4 py-2">{row.name}</td>
        <td className="px-4 py-2 capitalize">{row.surface}</td>
        <td className="px-4 py-2 text-muted-foreground">{row.primary_metric}</td>
        <td className="px-4 py-2 text-muted-foreground">{row.guardrail_metric ?? "—"}</td>
        <td className="px-4 py-2">
          <Badge tone={STATUS_TONE[row.status] ?? "muted"} className="capitalize">
            {row.status}
          </Badge>
        </td>
        <td className="px-4 py-2 text-muted-foreground">{formatWhen(row.started_at)}</td>
        <td className="px-4 py-2 text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={`exp-detail-${row.id}`}
          >
            {isOpen ? "Hide" : "Detail"}
          </Button>
        </td>
      </tr>
      {isOpen && (
        <tr id={`exp-detail-${row.id}`} className="border-b last:border-0 bg-muted/30">
          <td colSpan={7} className="px-4 py-3">
            <div className="space-y-3">
              {row.hypothesis && (
                <p className="text-sm text-foreground">
                  <span className="font-medium">Hypothesis:</span> {row.hypothesis}
                </p>
              )}

              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Variants</p>
                {variants.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">No variants recorded.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {variants.map((v, i) => (
                      <li key={v.key ?? i} className="flex items-start gap-2 text-sm">
                        <Badge tone={v.key === "control" ? "muted" : "primary"}>
                          {v.key ?? `variant-${i}`}
                        </Badge>
                        {typeof v.weight === "number" && (
                          <span className="text-muted-foreground">weight {v.weight}</span>
                        )}
                        {v.config_patch != null && (
                          <code className="min-w-0 flex-1 overflow-x-auto rounded bg-background px-2 py-1 font-mono text-xs text-foreground">
                            {JSON.stringify(v.config_patch)}
                          </code>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {row.result != null && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Result</p>
                  <pre className="mt-1 overflow-x-auto rounded bg-background p-2 font-mono text-xs text-foreground">
                    {JSON.stringify(row.result, null, 2)}
                  </pre>
                </div>
              )}

              {row.decided_at && (
                <p className="text-xs text-muted-foreground">Decided {formatWhen(row.decided_at)}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "danger";
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
  }[tone];
  return (
    <Card>
      <CardBody className="py-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>{value}</p>
      </CardBody>
    </Card>
  );
}
