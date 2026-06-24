"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { daysBetween, weeksBetween } from "@/lib/tools/calc";

/**
 * Days-between-dates calculator. Whole days, plus weeks + remainder. Client-side
 * only; answer-first copy + FAQ render on the server (AEO).
 */
export function DaysBetweenWidget() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const result = useMemo(() => {
    if (!start || !end) return null;
    const a = new Date(start);
    const b = new Date(end);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    const span = weeksBetween(a, b);
    return { days: daysBetween(a, b), weeks: span.weeks, remainderDays: span.days };
  }, [start, end]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Days between two dates
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="dbd-start" className="text-sm font-medium text-foreground">
              Start date
            </label>
            <div className="mt-1.5">
              <Input
                id="dbd-start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="dbd-end" className="text-sm font-medium text-foreground">
              End date
            </label>
            <div className="mt-1.5">
              <Input
                id="dbd-end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4 text-center">
          {result ? (
            <>
              <p className="font-display text-3xl font-semibold text-foreground">
                {result.days.toLocaleString("en-GB")}{" "}
                <span className="text-lg font-normal text-muted-foreground">days</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.weeks} weeks and {result.remainderDays} days
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick a start and end date to count the days between them.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
