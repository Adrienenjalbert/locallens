"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import { concreteVolumeM3 } from "@/lib/tools/calc";
import { formatResult } from "@/lib/tools/convert";

// A pre-mixed concrete bag (~25 kg) yields ~0.0098 m³; round to a safe ~0.011 m³
// so the bag estimate doesn't under-order.
const M3_PER_25KG_BAG = 0.011;

/**
 * Concrete calculator. Volume of a rectangular slab in cubic metres, plus an
 * approximate 25 kg pre-mix bag count. Client-side only; answer-first + FAQ on
 * the server (AEO).
 */
export function ConcreteCalculatorWidget() {
  const [length, setLength] = useState("4");
  const [width, setWidth] = useState("3");
  const [depthCm, setDepthCm] = useState("10");

  const result = useMemo(() => {
    const l = Number(length);
    const w = Number(width);
    const d = Number(depthCm) / 100;
    if ([l, w, d].some((v) => Number.isNaN(v) || v <= 0)) return null;
    const m3 = concreteVolumeM3(l, w, d);
    return { m3, bags: Math.ceil(m3 / M3_PER_25KG_BAG) };
  }, [length, width, depthCm]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Concrete slab calculator
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="con-l" label="Length (m)" value={length} onChange={setLength} />
          <Field id="con-w" label="Width (m)" value={width} onChange={setWidth} />
          <Field id="con-d" label="Depth (cm)" value={depthCm} onChange={setDepthCm} />
        </div>

        <div
          aria-live="polite"
          className="grid gap-2 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2"
        >
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Concrete volume</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-foreground">
              {result ? `${formatResult(result.m3, 3)} m³` : "—"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">≈ 25 kg pre-mix bags</p>
            <p className="mt-0.5 font-display text-2xl font-semibold text-foreground">
              {result ? result.bags : "—"}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Add ~10% for spillage and uneven sub-base. Bag count is an estimate for standard
          pre-mixed concrete.
        </p>
      </CardBody>
    </Card>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="mt-1.5">
        <Input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
