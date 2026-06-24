"use client";

import { useEffect, useMemo, useState } from "react";
import {
  admin,
  type DecisionRow,
  type ExperimentRow,
  type RpmRow,
} from "@/lib/admin/repo";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
} from "@/components/ui/primitives";
import { cn, formatGBP } from "@/lib/utils";

// /admin/loop — the CRISP-DM CONTROL TOWER. One screen that makes the
// self-improving loop visible (docs/02-CRISP-DM-LOOP.md): the RPM North Star,
// running/decided experiments per surface, the decision-log timeline of what
// the weekly improvement-agent promoted/retired/proposed, and a "surfaces vs
// rubric" panel. Reads are RLS-gated; without a backend the repo returns [] and
// every section renders a graceful empty state. No extra shell — the /admin
// layout provides AdminShell.

// Status → Badge tone, shared by the experiment list + timeline.
const EXPERIMENT_TONE: Record<
  string,
  "success" | "danger" | "warning" | "primary" | "muted"
> = {
  won: "success",
  lost: "danger",
  paused: "warning",
  running: "primary",
};

const DECISION_TONE: Record<string, "success" | "danger" | "warning" | "muted"> = {
  promoted: "success",
  retired: "danger",
  iterate: "warning",
};

// Static rubric from the loop doc; the live metric is filled where available.
const RUBRIC: { surface: string; primary: string; guardrail: string }[] = [
  { surface: "ranking", primary: "Qualified actions / 1k", guardrail: "Data accuracy" },
  { surface: "pseo", primary: "RPM / page type", guardrail: "Thin-content / index rate" },
  { surface: "tool", primary: "Completion %", guardrail: "Bounce / CWV" },
  { surface: "router", primary: "RPM", guardrail: "Qualified actions" },
  {
    surface: "comms",
    primary: "Quote→won / conversion",
    guardrail: "Unsubscribe / spam",
  },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB");
}

function pageTypeLabel(pt: string | null): string {
  return pt ?? "—";
}

export default function AdminLoopPage() {
  const [rpm, setRpm] = useState<RpmRow[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRow[]>([]);
  const [decisions, setDecisions] = useState<DecisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([admin.rpm(), admin.experiments(), admin.decisions()])
      .then(([r, e, d]) => {
        if (!active) return;
        setRpm(r);
        setExperiments(e);
        setDecisions(d);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Roll the per-page-type RPM rows into the North-Star headline numbers.
  const totals = useMemo(() => {
    const sessions = rpm.reduce((a, r) => a + (r.sessions ?? 0), 0);
    const revenue = rpm.reduce((a, r) => a + (r.revenue ?? 0), 0);
    const overallRpm =
      sessions > 0 ? Math.round((revenue / sessions) * 1000 * 100) / 100 : 0;
    return { sessions, revenue, overallRpm };
  }, [rpm]);

  // Live primary metric per surface for the rubric panel: the best RPM page-type
  // for RPM surfaces; left blank for surfaces whose metric isn't in the view.
  const liveBySurface = useMemo(() => {
    const bestRpm = rpm.reduce((max, r) => Math.max(max, r.rpm ?? 0), 0);
    const map: Record<string, string> = {};
    map.pseo = bestRpm > 0 ? `best ${bestRpm} RPM` : "—";
    map.router = totals.overallRpm > 0 ? `${totals.overallRpm} RPM` : "—";
    return map;
  }, [rpm, totals.overallRpm]);

  const experimentRows = useMemo(
    () =>
      [...experiments].sort(
        (a, b) => (a.status === "running" ? -1 : 1) - (b.status === "running" ? -1 : 1),
      ),
    [experiments],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Improvement loop
        </h1>
        <p className="text-sm text-muted-foreground">
          The control tower for the CRISP-DM self-improving loop — RPM North Star, live
          experiments across all five surfaces, and the decision log the weekly
          improvement-agent writes.
        </p>
      </header>

      {/* North-Star RPM summary */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard
          label="Overall RPM"
          value={loading ? "…" : `£${totals.overallRpm}`}
          tone="primary"
        />
        <SummaryCard
          label="Sessions"
          value={loading ? "…" : totals.sessions.toLocaleString("en-GB")}
          tone="muted"
        />
        <SummaryCard
          label="Revenue"
          value={loading ? "…" : formatGBP(totals.revenue)}
          tone="success"
        />
      </div>

      {/* Per-page-type RPM table */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-foreground">
          RPM by page type
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading RPM…</p>
        ) : rpm.length === 0 ? (
          <EmptyState
            title="No revenue data yet"
            description="The revenue_per_session view aggregates sessions × conversions per page type and vertical. It fills as router decisions and conversions land."
          />
        ) : (
          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      Page type
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Sessions
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Revenue
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      RPM
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rpm.map((r, i) => (
                    <tr
                      key={`${r.page_type ?? "none"}-${r.vertical_id ?? i}`}
                      className="border-b last:border-0"
                    >
                      <td className="px-4 py-2 capitalize">
                        {pageTypeLabel(r.page_type)}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {(r.sessions ?? 0).toLocaleString("en-GB")}
                      </td>
                      <td className="px-4 py-2 tabular-nums">
                        {formatGBP(r.revenue ?? 0)}
                      </td>
                      <td className="px-4 py-2 font-medium tabular-nums">
                        £{r.rpm ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Experiments */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Experiments
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading experiments…</p>
        ) : experimentRows.length === 0 ? (
          <EmptyState
            title="No experiments yet"
            description="Every config default is the champion of an ongoing test. New experiments appear here with their surface, primary metric and guardrail."
          />
        ) : (
          <Card>
            <CardBody className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-2 font-medium">
                      Experiment
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Surface
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Primary
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Guardrail
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {experimentRows.map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{e.name}</td>
                      <td className="px-4 py-2 capitalize">{e.surface}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.primary_metric}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {e.guardrail_metric ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          tone={EXPERIMENT_TONE[e.status] ?? "muted"}
                          className="capitalize"
                        >
                          {e.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Decision-log timeline */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Decision log
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading decisions…</p>
        ) : decisions.length === 0 ? (
          <EmptyState
            title="No decisions yet"
            description="The weekly improvement-agent records every promotion, retirement and proposal here — institutional memory for what won, what lost, and why."
          />
        ) : (
          <Card>
            <CardBody className="space-y-3">
              {decisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <Badge
                    tone={DECISION_TONE[d.decision] ?? "muted"}
                    className="mt-0.5 shrink-0 capitalize"
                  >
                    {d.decision}
                  </Badge>
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-foreground">{d.rationale ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.surface ? (
                        <span className="capitalize">{d.surface}</span>
                      ) : (
                        "loop summary"
                      )}{" "}
                      · {formatWhen(d.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </section>

      {/* Surfaces vs rubric */}
      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Surfaces vs rubric
        </h2>
        <p className="text-sm text-muted-foreground">
          Each surface optimises one primary metric under a guardrail. Ranking and routing
          are human-in-the-loop — the agent proposes, a human promotes.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {RUBRIC.map((row) => (
            <Card key={row.surface}>
              <CardHeader className="flex items-center justify-between">
                <span className="font-display text-base font-semibold capitalize text-foreground">
                  {row.surface}
                </span>
                {(row.surface === "ranking" || row.surface === "router") && (
                  <Badge tone="warning">Human-in-the-loop</Badge>
                )}
              </CardHeader>
              <CardBody className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Primary:</span>{" "}
                  <span className="font-medium text-foreground">{row.primary}</span>
                  {liveBySurface[row.surface] ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · live {liveBySurface[row.surface]}
                    </span>
                  ) : null}
                </p>
                <p>
                  <span className="text-muted-foreground">Guardrail:</span>{" "}
                  <span className="text-foreground">{row.guardrail}</span>
                </p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "success" | "muted";
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success",
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
