"use client";

import { useEffect, useMemo, useState } from "react";
import { admin, type DataCheckRow } from "@/lib/admin/repo";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// /admin/data — DATA release gate. Recent data_check rows from the scheduled
// data-verify function (accuracy / freshness / completeness / provenance). Reads
// are RLS-gated; without a backend admin.dataChecks() returns [] and we render a
// graceful empty state. No extra shell — the /admin layout provides AdminShell.

type StatusFilter = "all" | "pass" | "fail" | "flag";

const STATUS_TONE: Record<string, "success" | "danger" | "warning" | "muted"> = {
  pass: "success",
  fail: "danger",
  flag: "warning",
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "fail", label: "Fail" },
  { key: "flag", label: "Flag" },
  { key: "pass", label: "Pass" },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

function shortTarget(target: string | null): string {
  if (!target) return "—";
  return target.length > 12 ? `${target.slice(0, 8)}…` : target;
}

export default function AdminDataPage() {
  const [rows, setRows] = useState<DataCheckRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;
    admin
      .dataChecks()
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
    const c = { pass: 0, fail: 0, flag: 0 };
    for (const r of rows) {
      if (r.status === "pass" || r.status === "fail" || r.status === "flag")
        c[r.status]++;
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
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Data checks
        </h1>
        <p className="text-sm text-muted-foreground">
          Constant verification of golden records — a failing accuracy or freshness check
          is a release gate and can hold a business or noindex its pages.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Pass" value={counts.pass} tone="success" />
        <SummaryCard label="Flag" value={counts.flag} tone="warning" />
        <SummaryCard label="Fail" value={counts.fail} tone="danger" />
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
        <p className="text-sm text-muted-foreground">Loading checks…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No data checks yet" : "Nothing matches this filter"}
          description={
            rows.length === 0
              ? "The scheduled data-verify function writes accuracy, freshness, completeness and provenance results here."
              : "Try a different status filter."
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {visible.length} check{visible.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Target
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Sampled
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td
                      className="px-4 py-2 font-mono text-xs"
                      title={r.target ?? undefined}
                    >
                      {shortTarget(r.target)}
                    </td>
                    <td className="px-4 py-2 capitalize">{r.check_type}</td>
                    <td className="px-4 py-2">
                      <Badge
                        tone={STATUS_TONE[r.status] ?? "muted"}
                        className="capitalize"
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {formatWhen(r.sampled_at)}
                    </td>
                  </tr>
                ))}
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
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger";
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
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums", toneClass)}>
          {value}
        </p>
      </CardBody>
    </Card>
  );
}
