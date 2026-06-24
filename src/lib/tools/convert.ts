// The unit-converter engine. One config-driven module powers every converter
// page (kg↔lbs, cm↔inches, °C↔°F, miles↔km, litres↔gallons…). Each direction is
// a CONVERSIONS entry that maps 1:1 to a /tools/<slug>/ page, so adding a new
// converter page is data, not code — the vertical-pSEO backbone for utilities.
//
// All maths is pure + deterministic so it is unit-tested and runs client-side
// with no network. UK-first: imperial gallons/pints, stones, en-GB labels.

export type ConversionFn = (value: number) => number;

export interface Conversion {
  /** URL slug under /tools/<slug>/. Stable. e.g. "kg-to-lbs". */
  slug: string;
  /** Human "from" unit, e.g. "Kilograms". */
  fromUnit: string;
  /** Human "to" unit, e.g. "Pounds". */
  toUnit: string;
  /** Short symbol for the from unit, e.g. "kg". */
  fromSymbol: string;
  /** Short symbol for the to unit, e.g. "lb". */
  toSymbol: string;
  /** Pure conversion. */
  convert: ConversionFn;
  /** Inverse conversion (powers the "swap" + the reverse page link). */
  invert: ConversionFn;
  /** Slug of the reverse converter page (for cross-linking), if one exists. */
  reverseSlug?: string;
  /** Decimal places to show in the result. Default 4 (trimmed). */
  precision?: number;
  /** A common reference example for the answer-first copy, e.g. 1. */
  example: number;
}

/** Round to `precision` dp and strip trailing zeros (e.g. 2.5000 → "2.5"). */
export function formatResult(value: number, precision = 4): string {
  if (!Number.isFinite(value)) return "";
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.?0+$/, "");
}

// Factor-based helpers keep the table declarative and auditable.
const linear =
  (factor: number): ConversionFn =>
  (v) =>
    v * factor;

// ── Temperature (affine, not linear) ──────────────────────────────────────
const cToF: ConversionFn = (c) => (c * 9) / 5 + 32;
const fToC: ConversionFn = (f) => ((f - 32) * 5) / 9;

// Standard conversion factors.
const KG_TO_LB = 2.2046226218;
const CM_TO_IN = 1 / 2.54;
const MILE_TO_KM = 1.609344;
const STONE_TO_LB = 14;
const LITRE_TO_IMP_GAL = 1 / 4.54609; // UK (imperial) gallon

export const CONVERSIONS: Conversion[] = [
  {
    slug: "kg-to-lbs",
    fromUnit: "Kilograms",
    toUnit: "Pounds",
    fromSymbol: "kg",
    toSymbol: "lb",
    convert: linear(KG_TO_LB),
    invert: linear(1 / KG_TO_LB),
    reverseSlug: "lbs-to-kg",
    example: 1,
  },
  {
    slug: "lbs-to-kg",
    fromUnit: "Pounds",
    toUnit: "Kilograms",
    fromSymbol: "lb",
    toSymbol: "kg",
    convert: linear(1 / KG_TO_LB),
    invert: linear(KG_TO_LB),
    reverseSlug: "kg-to-lbs",
    example: 1,
  },
  {
    slug: "stone-to-pounds",
    fromUnit: "Stone",
    toUnit: "Pounds",
    fromSymbol: "st",
    toSymbol: "lb",
    convert: linear(STONE_TO_LB),
    invert: linear(1 / STONE_TO_LB),
    reverseSlug: "pounds-to-stone",
    precision: 2,
    example: 1,
  },
  {
    slug: "pounds-to-stone",
    fromUnit: "Pounds",
    toUnit: "Stone",
    fromSymbol: "lb",
    toSymbol: "st",
    convert: linear(1 / STONE_TO_LB),
    invert: linear(STONE_TO_LB),
    reverseSlug: "stone-to-pounds",
    example: 14,
  },
  {
    slug: "cm-to-inches",
    fromUnit: "Centimetres",
    toUnit: "Inches",
    fromSymbol: "cm",
    toSymbol: "in",
    convert: linear(CM_TO_IN),
    invert: linear(2.54),
    reverseSlug: "inches-to-cm",
    example: 1,
  },
  {
    slug: "inches-to-cm",
    fromUnit: "Inches",
    toUnit: "Centimetres",
    fromSymbol: "in",
    toSymbol: "cm",
    convert: linear(2.54),
    invert: linear(CM_TO_IN),
    reverseSlug: "cm-to-inches",
    example: 1,
  },
  {
    slug: "miles-to-km",
    fromUnit: "Miles",
    toUnit: "Kilometres",
    fromSymbol: "mi",
    toSymbol: "km",
    convert: linear(MILE_TO_KM),
    invert: linear(1 / MILE_TO_KM),
    reverseSlug: "km-to-miles",
    example: 1,
  },
  {
    slug: "km-to-miles",
    fromUnit: "Kilometres",
    toUnit: "Miles",
    fromSymbol: "km",
    toSymbol: "mi",
    convert: linear(1 / MILE_TO_KM),
    invert: linear(MILE_TO_KM),
    reverseSlug: "miles-to-km",
    example: 1,
  },
  {
    slug: "celsius-to-fahrenheit",
    fromUnit: "Celsius",
    toUnit: "Fahrenheit",
    fromSymbol: "°C",
    toSymbol: "°F",
    convert: cToF,
    invert: fToC,
    reverseSlug: "fahrenheit-to-celsius",
    precision: 2,
    example: 20,
  },
  {
    slug: "fahrenheit-to-celsius",
    fromUnit: "Fahrenheit",
    toUnit: "Celsius",
    fromSymbol: "°F",
    toSymbol: "°C",
    convert: fToC,
    invert: cToF,
    reverseSlug: "celsius-to-fahrenheit",
    precision: 2,
    example: 68,
  },
  {
    slug: "litres-to-gallons",
    fromUnit: "Litres",
    toUnit: "Gallons (UK)",
    fromSymbol: "L",
    toSymbol: "gal",
    convert: linear(LITRE_TO_IMP_GAL),
    invert: linear(1 / LITRE_TO_IMP_GAL),
    reverseSlug: "gallons-to-litres",
    example: 1,
  },
  {
    slug: "gallons-to-litres",
    fromUnit: "Gallons (UK)",
    toUnit: "Litres",
    fromSymbol: "gal",
    toSymbol: "L",
    convert: linear(1 / LITRE_TO_IMP_GAL),
    invert: linear(LITRE_TO_IMP_GAL),
    reverseSlug: "litres-to-gallons",
    example: 1,
  },
];

export function findConversion(slug: string): Conversion | undefined {
  return CONVERSIONS.find((c) => c.slug === slug);
}
