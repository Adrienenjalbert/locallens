"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { formatGBP } from "@/lib/utils";
import { addVat, removeVat, UK_VAT_RATE } from "@/lib/tools/calc";

type Mode = "add" | "remove";

/**
 * UK VAT calculator. Adds or removes VAT at a chosen rate (default 20%).
 * Client-side only; the page's answer-first copy + FAQ render server-side (AEO).
 */
export function VatCalculatorWidget() {
  const [mode, setMode] = useState<Mode>("add");
  const [amount, setAmount] = useState("100");
  const [ratePct, setRatePct] = useState(String(UK_VAT_RATE * 100));

  const result = useMemo(() => {
    const value = Number(amount);
    const rate = Number(ratePct) / 100;
    if (Number.isNaN(value) || Number.isNaN(rate) || amount.trim() === "") return null;
    return mode === "add" ? addVat(value, rate) : removeVat(value, rate);
  }, [mode, amount, ratePct]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Calculate VAT
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-foreground">Mode</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <ModeButton
              selected={mode === "add"}
              onSelect={() => setMode("add")}
              label="Add VAT (to net)"
            />
            <ModeButton
              selected={mode === "remove"}
              onSelect={() => setMode("remove")}
              label="Remove VAT (from gross)"
            />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="vat-amount" className="text-sm font-medium text-foreground">
              {mode === "add" ? "Net amount (£)" : "Gross amount (£)"}
            </label>
            <div className="mt-1.5">
              <Input
                id="vat-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="vat-rate" className="text-sm font-medium text-foreground">
              VAT rate (%)
            </label>
            <div className="mt-1.5">
              <Input
                id="vat-rate"
                inputMode="decimal"
                value={ratePct}
                onChange={(e) => setRatePct(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div
          aria-live="polite"
          className="grid gap-2 rounded-lg border bg-muted/40 p-4 sm:grid-cols-3"
        >
          <Figure label="Net" value={result ? formatGBP(result.net) : "—"} />
          <Figure
            label={`VAT (${ratePct || 0}%)`}
            value={result ? formatGBP(result.vat) : "—"}
          />
          <Figure label="Gross" value={result ? formatGBP(result.gross) : "—"} emphasis />
        </div>
      </CardBody>
    </Card>
  );
}

function ModeButton({
  selected,
  onSelect,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={
        selected
          ? "rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm font-medium text-foreground"
          : "rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
      }
    >
      {label}
    </button>
  );
}

function Figure({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          emphasis
            ? "mt-0.5 font-display text-xl font-semibold text-foreground"
            : "mt-0.5 font-display text-lg font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
