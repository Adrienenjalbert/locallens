"use client";

import { useEffect, useMemo, useState } from "react";
import { Repeat, Check, Clock } from "lucide-react";
import { crm } from "@/lib/crm/repo";
import type { Job } from "@/lib/crm/types";
import { Badge, Button, Card, CardBody, EmptyState } from "@/components/ui/primitives";
import { LifecycleStepper } from "@/components/crm/LifecycleStepper";

// Jobs — the daily round. Split into today vs the rest of this week so the owner
// knows what to do next. Recurring jobs (weekly gardening rounds) are flagged.

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    crm.jobs().then((rows) => {
      if (!active) return;
      setJobs(rows);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const { today, thisWeek } = useMemo(() => {
    const now = new Date();
    const dayStart = startOfDay(now);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
    const weekEnd = new Date(dayStart.getTime() + 7 * 24 * 3_600_000);

    const open = jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled");
    const todayJobs: Job[] = [];
    const weekJobs: Job[] = [];
    for (const job of open) {
      if (!job.scheduled_at) {
        weekJobs.push(job);
        continue;
      }
      const when = new Date(job.scheduled_at);
      if (when >= dayStart && when < dayEnd) todayJobs.push(job);
      else if (when >= dayEnd && when < weekEnd) weekJobs.push(job);
    }
    return { today: todayJobs, thisWeek: weekJobs };
  }, [jobs]);

  async function markComplete(job: Job) {
    setBusyId(job.id);
    const ok = await crm.update("job", job.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    if (ok) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, status: "completed", completed_at: new Date().toISOString() }
            : j,
        ),
      );
    }
    setBusyId(null);
  }

  const isEmpty = !loading && today.length === 0 && thisWeek.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">Jobs</h1>
          <p className="mt-1 text-muted-foreground">
            Your round, today and across the week. Tick jobs off as you go.
          </p>
        </div>
        <LifecycleStepper current="job" />
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          Loading jobs…
        </p>
      ) : isEmpty ? (
        <EmptyState
          title="No jobs scheduled"
          description="When a quote is accepted it becomes a job. Set a recurrence (e.g. every 2 weeks) and recurring jobs like gardening rounds rebook themselves automatically."
        />
      ) : (
        <div className="space-y-6">
          <JobSection
            title="Today"
            jobs={today}
            busyId={busyId}
            onComplete={markComplete}
            emptyText="Nothing booked for today."
          />
          <JobSection
            title="This week"
            jobs={thisWeek}
            busyId={busyId}
            onComplete={markComplete}
            emptyText="Nothing else booked this week."
          />
        </div>
      )}
    </div>
  );
}

function JobSection({
  title,
  jobs,
  busyId,
  onComplete,
  emptyText,
}: {
  title: string;
  jobs: Job[];
  busyId: string | null;
  onComplete: (job: Job) => void;
  emptyText: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
        <span className="ml-2 font-normal normal-case">({jobs.length})</span>
      </h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobRow job={job} busy={busyId === job.id} onComplete={onComplete} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function JobRow({
  job,
  busy,
  onComplete,
}: {
  job: Job;
  busy: boolean;
  onComplete: (job: Job) => void;
}) {
  return (
    <Card>
      <CardBody className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium text-foreground">{job.title ?? "Job"}</p>
            {job.recurrence && (
              <Badge tone="primary">
                <Repeat className="mr-1 h-3 w-3" aria-hidden /> Recurring
              </Badge>
            )}
            <Badge tone={job.status === "in_progress" ? "warning" : "muted"} className="capitalize">
              {job.status.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatSchedule(job.scheduled_at)}
            {job.duration_min ? ` · ${job.duration_min} min` : ""}
          </p>
        </div>
        <Button size="sm" disabled={busy} onClick={() => onComplete(job)}>
          <Check className="h-4 w-4" aria-hidden /> Mark complete
        </Button>
      </CardBody>
    </Card>
  );
}

function formatSchedule(scheduledAt: string | null): string {
  if (!scheduledAt) return "Unscheduled";
  return new Date(scheduledAt).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
