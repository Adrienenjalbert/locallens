"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Input } from "@/components/ui/primitives";
import {
  ACTIVITY_LEVELS,
  type ActivityValue,
  type Sex,
  bmr,
  tdee,
} from "@/lib/tools/calc";

function round(n: number): string {
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
}

/**
 * TDEE + BMR calculator (Mifflin-St Jeor). Metric, UK-first. Client-side only;
 * answer-first copy + FAQ render on the server (AEO). Also shows calorie targets
 * for cut/maintain/bulk, the question users actually ask.
 */
export function TdeeCalculatorWidget() {
  const [sex, setSex] = useState<Sex>("male");
  const [age, setAge] = useState("30");
  const [heightCm, setHeightCm] = useState("180");
  const [weightKg, setWeightKg] = useState("80");
  const [activity, setActivity] = useState<ActivityValue>("moderate");

  const result = useMemo(() => {
    const input = {
      sex,
      ageYears: Number(age),
      heightCm: Number(heightCm),
      weightKg: Number(weightKg),
      activity,
    };
    if (
      [input.ageYears, input.heightCm, input.weightKg].some(
        (v) => Number.isNaN(v) || v <= 0,
      )
    ) {
      return null;
    }
    const t = tdee(input);
    return { bmr: bmr(input), tdee: t, cut: t - 500, bulk: t + 300 };
  }, [sex, age, heightCm, weightKg, activity]);

  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Calculate your TDEE
        </h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <fieldset>
          <legend className="text-sm font-medium text-foreground">Sex</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Toggle
              selected={sex === "male"}
              onSelect={() => setSex("male")}
              label="Male"
            />
            <Toggle
              selected={sex === "female"}
              onSelect={() => setSex("female")}
              label="Female"
            />
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-3">
          <LabeledInput id="tdee-age" label="Age (years)" value={age} onChange={setAge} />
          <LabeledInput
            id="tdee-height"
            label="Height (cm)"
            value={heightCm}
            onChange={setHeightCm}
          />
          <LabeledInput
            id="tdee-weight"
            label="Weight (kg)"
            value={weightKg}
            onChange={setWeightKg}
          />
        </div>

        <div>
          <label htmlFor="tdee-activity" className="text-sm font-medium text-foreground">
            Activity level
          </label>
          <select
            id="tdee-activity"
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityValue)}
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {ACTIVITY_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        <div aria-live="polite" className="rounded-lg border bg-muted/40 p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Stat
              label="BMR (at rest)"
              value={result ? `${round(result.bmr)} kcal/day` : "—"}
            />
            <Stat
              label="TDEE (maintenance)"
              value={result ? `${round(result.tdee)} kcal/day` : "—"}
              emphasis
            />
          </div>
          {result && (
            <div className="mt-3 grid gap-2 border-t pt-3 text-sm sm:grid-cols-3">
              <Goal
                label="Lose weight"
                value={`${round(result.cut)} kcal`}
                hint="−500/day"
              />
              <Goal label="Maintain" value={`${round(result.tdee)} kcal`} hint="TDEE" />
              <Goal
                label="Gain muscle"
                value={`${round(result.bulk)} kcal`}
                hint="+300/day"
              />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Estimates use the Mifflin-St Jeor equation. For general guidance only — not
          medical advice.
        </p>
      </CardBody>
    </Card>
  );
}

function Toggle({
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

function LabeledInput({
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

function Stat({
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
            ? "mt-0.5 font-display text-2xl font-semibold text-primary"
            : "mt-0.5 font-display text-xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Goal({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md bg-background p-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
