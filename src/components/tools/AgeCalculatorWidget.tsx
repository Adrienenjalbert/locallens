"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { calculateAge } from "@/lib/tools/calc";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Age calculator ("how old am I"). Computes exact years/months/days plus total
 * days lived. Client-side only; answer-first copy + FAQ render on the server.
 */
export function AgeCalculatorWidget() {
  const [birth, setBirth] = useState("");
  const [on, setOn] = useState(todayISO());

  const age = useMemo(() => {
    if (!birth) return null;
    const b = new Date(birth);
    const o = new Date(on || todayISO());
    if (Number.isNaN(b.getTime()) || Number.isNaN(o.getTime()) || b > o) return null;
    return calculateAge(b, o);
  }, [birth, on]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          How old am I?
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="age-birth" className="text-sm font-medium text-foreground">
              Date of birth
            </label>
            <div className="mt-1.5">
              <Input
                id="age-birth"
                type="date"
                max={on}
                value={birth}
                onChange={(e) => setBirth(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="age-on" className="text-sm font-medium text-foreground">
              Age at date
            </label>
            <div className="mt-1.5">
              <Input
                id="age-on"
                type="date"
                value={on}
                onChange={(e) => setOn(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4 text-center">
          {age ? (
            <>
              <p className="font-display text-3xl font-semibold text-foreground">
                {age.years}{" "}
                <span className="text-lg font-normal text-muted-foreground">years</span>{" "}
                {age.months}{" "}
                <span className="text-lg font-normal text-muted-foreground">months</span>{" "}
                {age.days}{" "}
                <span className="text-lg font-normal text-muted-foreground">days</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                That&apos;s {age.totalDays.toLocaleString("en-GB")} days lived.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter your date of birth to see your exact age.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
