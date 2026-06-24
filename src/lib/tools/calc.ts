// Pure calculation helpers for the calculator/utility tools. No DOM, no React,
// no network — deterministic and unit-tested. UK-first (VAT 20%, GBP).

// ── VAT (UK) ───────────────────────────────────────────────────────────────
export const UK_VAT_RATE = 0.2;

export interface VatResult {
  net: number;
  vat: number;
  gross: number;
}

/** Add VAT to a net amount. */
export function addVat(net: number, rate = UK_VAT_RATE): VatResult {
  const vat = net * rate;
  return { net, vat, gross: net + vat };
}

/** Remove VAT from a gross (VAT-inclusive) amount. */
export function removeVat(gross: number, rate = UK_VAT_RATE): VatResult {
  const net = gross / (1 + rate);
  return { net, vat: gross - net, gross };
}

// ── Percentage ───────────────────────────────────────────────────────────
/** X% of Y. */
export function percentOf(percent: number, value: number): number {
  return (percent / 100) * value;
}

/** Percentage change from `from` to `to` (positive = increase). */
export function percentChange(from: number, to: number): number {
  if (from === 0) return NaN;
  return ((to - from) / Math.abs(from)) * 100;
}

/** Price after a percentage discount. */
export function applyDiscount(price: number, percentOff: number): number {
  return price * (1 - percentOff / 100);
}

// ── Age / dates ────────────────────────────────────────────────────────────
export interface AgeBreakdown {
  years: number;
  months: number;
  days: number;
  totalDays: number;
}

/** Calendar age (years/months/days) from `birth` to `on` (default today). */
export function calculateAge(birth: Date, on: Date = new Date()): AgeBreakdown {
  const totalDays = Math.floor((on.getTime() - birth.getTime()) / 86_400_000);

  let years = on.getFullYear() - birth.getFullYear();
  let months = on.getMonth() - birth.getMonth();
  let days = on.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the month before `on`.
    const prevMonth = new Date(on.getFullYear(), on.getMonth(), 0).getDate();
    days += prevMonth;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days, totalDays };
}

/** Whole days between two dates (absolute). */
export function daysBetween(a: Date, b: Date): number {
  return Math.abs(Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/** Whole weeks (and remainder days) between two dates. */
export function weeksBetween(a: Date, b: Date): { weeks: number; days: number } {
  const total = daysBetween(a, b);
  return { weeks: Math.floor(total / 7), days: total % 7 };
}

// ── Health: BMR + TDEE (Mifflin-St Jeor) ─────────────────────────────────────
export type Sex = "male" | "female";

/** Activity multipliers applied to BMR to get TDEE. */
export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary (little/no exercise)", factor: 1.2 },
  { value: "light", label: "Light (1–3 days/week)", factor: 1.375 },
  { value: "moderate", label: "Moderate (3–5 days/week)", factor: 1.55 },
  { value: "active", label: "Active (6–7 days/week)", factor: 1.725 },
  { value: "very-active", label: "Very active (hard daily / physical job)", factor: 1.9 },
] as const;

export type ActivityValue = (typeof ACTIVITY_LEVELS)[number]["value"];

/** Basal Metabolic Rate (kcal/day), Mifflin-St Jeor. Metric inputs. */
export function bmr(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
}): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.ageYears;
  return input.sex === "male" ? base + 5 : base - 161;
}

/** Total Daily Energy Expenditure = BMR × activity factor. */
export function tdee(input: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  activity: ActivityValue;
}): number {
  const level = ACTIVITY_LEVELS.find((a) => a.value === input.activity);
  const factor = level?.factor ?? 1.2;
  return bmr(input) * factor;
}

// ── Concrete volume ──────────────────────────────────────────────────────
/** Concrete volume in cubic metres for a slab (metres). */
export function concreteVolumeM3(
  lengthM: number,
  widthM: number,
  depthM: number,
): number {
  return lengthM * widthM * depthM;
}
