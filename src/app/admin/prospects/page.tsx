"use client";

import { useEffect, useMemo, useState } from "react";
import { admin, type ProspectRow } from "@/lib/admin/repo";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

// /admin/prospects — PROSPECTING console (our GTM). Every business we cover is a
// sales lead for US, scored by need_score (high need = high opportunity).
// Outreach is proof-led ("X leads waiting near you"); the actual send is a later
// workstream, so the Outreach button is a disabled placeholder. Reads are
// RLS-gated and admin-only; without a backend admin.prospects() returns [] and
// we render a graceful empty state. No extra shell — the /admin layout provides
// AdminShell.

type StatusFilter = "all" | "new" | "contacted" | "won" | "lost";

const STATUS_TONE: Record<
  string,
  "success" | "danger" | "warning" | "primary" | "muted"
> = {
  new: "primary",
  contacted: "warning",
  won: "success",
  lost: "danger",
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

// Known signal keys we surface compactly when present in the jsonb blob.
const SIGNAL_KEYS = ["leads_received", "unclaimed", "presence", "reviews"] as const;

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function needTone(score: number | null): {
  tone: "danger" | "warning" | "muted";
  label: string;
} {
  if (score == null) return { tone: "muted", label: "—" };
  if (score >= 70) return { tone: "danger", label: "high need" };
  if (score >= 40) return { tone: "warning", label: "medium" };
  return { tone: "muted", label: "low" };
}

function signalSummary(signals: unknown): { key: string; value: string }[] {
  if (typeof signals !== "object" || signals === null || Array.isArray(signals))
    return [];
  const record = signals as Record<string, unknown>;
  const out: { key: string; value: string }[] = [];
  for (const key of SIGNAL_KEYS) {
    if (!(key in record)) continue;
    const raw = record[key];
    if (raw == null) continue;
    const value =
      typeof raw === "boolean"
        ? raw
          ? "yes"
          : "no"
        : typeof raw === "number" || typeof raw === "string"
          ? String(raw)
          : "";
    if (value === "") continue;
    out.push({ key: key.replace(/_/g, " "), value });
  }
  return out;
}

export default function AdminProspectsPage() {
  const [rows, setRows] = useState<ProspectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    let active = true;
    admin
      .prospects()
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
    const c = { new: 0, contacted: 0, won: 0, lost: 0 };
    for (const r of rows) {
      if (
        r.status === "new" ||
        r.status === "contacted" ||
        r.status === "won" ||
        r.status === "lost"
      ) {
        c[r.status]++;
      }
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
        <h1 className="font-display text-2xl font-semibold text-foreground">Prospects</h1>
        <p className="text-sm text-muted-foreground">
          Every business we cover is a sales lead for us, ranked by need score — high need
          means high opportunity. Outreach is proof-led (&ldquo;X leads waiting near
          you&rdquo;). Admin-only.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryCard label="Total" value={rows.length} tone="muted" />
        <SummaryCard label="New" value={counts.new} tone="primary" />
        <SummaryCard label="Contacted" value={counts.contacted} tone="warning" />
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
        <p className="text-sm text-muted-foreground">Loading prospects…</p>
      ) : visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? "No prospects yet" : "Nothing matches this filter"}
          description={
            rows.length === 0
              ? "Scored prospects appear here as businesses are profiled by need — high-need leads first."
              : "Try a different status filter."
          }
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="text-sm text-muted-foreground">
              {visible.length} prospect{visible.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Business
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Need
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Signals
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Outreach
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const need = needTone(r.need_score);
                  const signals = signalSummary(r.signals);
                  return (
                    <tr key={r.id} className="border-b last:border-0 align-top">
                      <td
                        className="px-4 py-2 font-mono text-xs"
                        title={r.business_id ?? undefined}
                      >
                        {shortId(r.business_id)}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums font-medium">
                            {r.need_score ?? "—"}
                          </span>
                          <Badge tone={need.tone}>{need.label}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {signals.length === 0 ? (
                          "—"
                        ) : (
                          <span className="flex flex-wrap gap-1.5">
                            {signals.map((s) => (
                              <span
                                key={s.key}
                                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
                              >
                                <span className="capitalize">{s.key}</span>
                                <span className="font-medium text-foreground">
                                  {s.value}
                                </span>
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          tone={STATUS_TONE[r.status] ?? "muted"}
                          className="capitalize"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled
                          title="Outreach send is a later workstream"
                        >
                          Outreach
                        </Button>
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
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "primary" | "muted";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    primary: "text-primary",
    muted: "text-foreground",
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
