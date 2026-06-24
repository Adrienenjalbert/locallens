"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { percentOf, percentChange, applyDiscount } from "@/lib/tools/calc";
import { formatResult } from "@/lib/tools/convert";

type Mode = "of" | "change" | "discount";

const MODES: { value: Mode; label: string }[] = [
  { value: "of", label: "% of a number" },
  { value: "change", label: "% increase / decrease" },
  { value: "discount", label: "% off a price" },
];

/**
 * Percentage calculator covering the three most-searched intents: X% of Y,
 * percentage change, and percent-off. Client-side only; answer-first + FAQ on
 * the server (AEO).
 */
export function PercentageCalculatorWidget() {
  const [mode, setMode] = useState<Mode>("of");
  const [a, setA] = useState("15");
  const [b, setB] = useState("200");

  const output = useMemo(() => {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    switch (mode) {
      case "of":
        return { label: `${a}% of ${b} is`, value: formatResult(percentOf(x, y), 4) };
      case "change": {
        const change = percentChange(x, y);
        if (Number.isNaN(change)) return null;
        const dir = change >= 0 ? "increase" : "decrease";
        return {
          label: `Change from ${a} to ${b}`,
          value: `${formatResult(Math.abs(change), 2)}% ${dir}`,
        };
      }
      case "discount":
        return {
          label: `${b}% off £${a} leaves`,
          value: `£${formatResult(applyDiscount(x, y), 2)}`,
        };
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  }, [mode, a, b]);

  const labels = useMemo(() => {
    switch (mode) {
      case "of":
        return { a: "Percentage (%)", b: "Of number" };
      case "change":
        return { a: "From", b: "To" };
      case "discount":
        return { a: "Original price (£)", b: "Discount (%)" };
      default: {
        const _exhaustive: never = mode;
        return _exhaustive;
      }
    }
  }, [mode]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Percentage calculator
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <fieldset>
          <legend className="sr-only">Calculation type</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={mode === m.value}
                onClick={() => setMode(m.value)}
                className={
                  mode === m.value
                    ? "rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-foreground"
                    : "rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pct-a" className="text-sm font-medium text-foreground">
              {labels.a}
            </label>
            <div className="mt-1.5">
              <Input
                id="pct-a"
                inputMode="decimal"
                value={a}
                onChange={(e) => setA(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="pct-b" className="text-sm font-medium text-foreground">
              {labels.b}
            </label>
            <div className="mt-1.5">
              <Input
                id="pct-b"
                inputMode="decimal"
                value={b}
                onChange={(e) => setB(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4 text-center">
          {output ? (
            <>
              <p className="text-sm text-muted-foreground">{output.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                {output.value}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter two numbers to calculate.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
