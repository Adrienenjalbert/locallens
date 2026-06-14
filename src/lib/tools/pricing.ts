// Transparent pricing model for the cost estimator. Kept in a server-safe
// module (no "use client") so BOTH the server page (for price-range JSON-LD)
// and the client view (for interactive recompute) import the real functions.
//
// In production these bands are learned from real quotes; hard-coded here so the
// tool runs statically and the methodology stays explainable (AEO).

export interface GardenSizeOption {
  value: string;
  label: string;
  /** Base one-off visit range, GBP, before scope + local modifiers. */
  baseLow: number;
  baseHigh: number;
}

export interface ScopeOption {
  value: string;
  label: string;
  /** Multiplier applied to the base band. */
  modifier: number;
}

export const GARDEN_SIZES: GardenSizeOption[] = [
  { value: "small", label: "Small (courtyard / patio)", baseLow: 40, baseHigh: 75 },
  { value: "medium", label: "Medium (typical back garden)", baseLow: 80, baseHigh: 160 },
  { value: "large", label: "Large (long / wrap-around)", baseLow: 150, baseHigh: 320 },
  { value: "xlarge", label: "Extra large (grounds / plot)", baseLow: 300, baseHigh: 650 },
];

export const SCOPE_OPTIONS: ScopeOption[] = [
  { value: "maintenance", label: "Routine maintenance (mow, edge, tidy)", modifier: 1 },
  { value: "hedge", label: "Hedge trimming & pruning", modifier: 1.25 },
  { value: "clearance", label: "Full garden clearance", modifier: 1.7 },
  { value: "landscaping", label: "Landscaping / redesign", modifier: 3.2 },
];

/** Manchester sits at the national baseline in this demo model. */
const LOCAL_MODIFIER = 1;

export interface PriceRange {
  low: number;
  high: number;
}

export const DEFAULT_SIZE = GARDEN_SIZES[1].value;
export const DEFAULT_SCOPE = SCOPE_OPTIONS[0].value;

/** Pure estimator — used by the client view and the server page (JSON-LD). */
export function estimateRange(sizeValue: string, scopeValue: string): PriceRange {
  const size = GARDEN_SIZES.find((s) => s.value === sizeValue) ?? GARDEN_SIZES[1];
  const scope = SCOPE_OPTIONS.find((s) => s.value === scopeValue) ?? SCOPE_OPTIONS[0];
  const factor = scope.modifier * LOCAL_MODIFIER;
  return {
    low: Math.round((size.baseLow * factor) / 5) * 5,
    high: Math.round((size.baseHigh * factor) / 5) * 5,
  };
}
