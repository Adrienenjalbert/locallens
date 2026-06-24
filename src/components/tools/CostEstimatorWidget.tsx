"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn, formatGBP } from "@/lib/utils";
import { Card, CardBody, CardHeader } from "@/components/ui/primitives";
import {
  GARDEN_SIZES,
  SCOPE_OPTIONS,
  DEFAULT_SIZE,
  DEFAULT_SCOPE,
  estimateRange,
} from "@/lib/tools/pricing";

/**
 * Interactive island of the estimator. Reads/writes tool state in the URL query
 * (so results are shareable/linkable) and recomputes the range live. The page's
 * answer-first block, methodology and FAQ render server-side around this so the
 * static HTML stays crawlable (AEO); this widget enhances on hydration.
 */
export function CostEstimatorWidget({
  inputs,
  placeName,
}: {
  inputs: string[];
  placeName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sizeValue = searchParams.get("garden_size") ?? DEFAULT_SIZE;
  const scopeValue = searchParams.get("scope") ?? DEFAULT_SCOPE;

  const range = useMemo(
    () => estimateRange(sizeValue, scopeValue),
    [sizeValue, scopeValue],
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(key, value);
      router.replace(`?${next.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const sizeLabel = GARDEN_SIZES.find((s) => s.value === sizeValue)?.label ?? sizeValue;
  const scopeLabel =
    SCOPE_OPTIONS.find((s) => s.value === scopeValue)?.label ?? scopeValue;

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Estimate your job
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        {inputs.includes("garden_size") && (
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Garden size</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {GARDEN_SIZES.map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={opt.value === sizeValue}
                  label={opt.label}
                  onSelect={() => setParam("garden_size", opt.value)}
                />
              ))}
            </div>
          </fieldset>
        )}

        {inputs.includes("scope") && (
          <fieldset>
            <legend className="text-sm font-medium text-foreground">Job type</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {SCOPE_OPTIONS.map((opt) => (
                <OptionButton
                  key={opt.value}
                  selected={opt.value === scopeValue}
                  label={opt.label}
                  onSelect={() => setParam("scope", opt.value)}
                />
              ))}
            </div>
          </fieldset>
        )}

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4 text-center">
          <p className="text-sm text-muted-foreground">Estimated range</p>
          <p className="mt-1 font-display text-3xl font-semibold text-foreground">
            {formatGBP(range.low)}
            <span className="mx-1.5 text-muted-foreground">–</span>
            {formatGBP(range.high)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sizeLabel} · {scopeLabel} · {placeName}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function OptionButton({
  selected,
  label,
  onSelect,
}: {
  selected: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "rounded-md border px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/10 font-medium text-foreground"
          : "bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
