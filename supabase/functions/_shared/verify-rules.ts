// Constant-verification rules. Pure functions, no IO — they encode the data +
// UI release-gate logic so it is unit-testable and reused by the data-verify /
// ui-verify Edge Functions. Mirrors the "Constant verification" section of
// docs/02-CRISP-DM-LOOP.md (accuracy, freshness, completeness, provenance + the
// UI "looks great?" rubric).

/** Status used by both data_check.status and the per-rule outcomes. */
export type CheckStatus = "pass" | "fail" | "flag";

/** ui_snapshot.diff_status. */
export type DiffStatus = "ok" | "changed" | "broken";

// ── Data accuracy heuristics ──────────────────────────────────────────────

/**
 * Accuracy heuristic: is a phone number present and in plausible E.164 shape?
 * The ETL stores phones already normalised to +44…, so here we only assert the
 * shape (leading "+", 8–15 digits) rather than re-deriving country rules.
 */
export function checkPhoneE164(input: string | null | undefined): boolean {
  if (!input) return false;
  return /^\+[1-9]\d{7,14}$/.test(input.trim());
}

const UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;

/** Accuracy heuristic: present + valid UK postcode shape ("M1 1AE"). */
export function checkPostcode(input: string | null | undefined): boolean {
  if (!input) return false;
  return UK_POSTCODE_RE.test(input.trim());
}

// ── Freshness SLA ─────────────────────────────────────────────────────────

/** Whole days between `iso` and `now`; large sentinel when missing/invalid. */
export function ageInDays(iso: string | null | undefined, now: number = Date.now()): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - t) / 86_400_000);
}

/**
 * Freshness SLA: a record verified within `slaDays` passes; up to 2× the SLA is
 * a soft `flag` (re-verify soon); older than that (or never verified) is `fail`.
 */
export function freshnessStatus(
  lastVerifiedAt: string | null | undefined,
  slaDays: number,
  now: number = Date.now(),
): CheckStatus {
  const age = ageInDays(lastVerifiedAt, now);
  if (age <= slaDays) return "pass";
  if (age <= slaDays * 2) return "flag";
  return "fail";
}

// ── UI "looks great?" rubric ──────────────────────────────────────────────

export interface UiSnapshotInput {
  page_type?: string | null;
  url?: string | null;
  device?: string | null;
  screenshot_url?: string | null;
  /** Optional signals a screenshot service can return for this capture. */
  brokenLayout?: boolean;
  /** Largest-Contentful-Paint ms; CWV "good" ≤ 2500ms. */
  lcpMs?: number | null;
  /** Cumulative Layout Shift; CWV "good" ≤ 0.1. */
  cls?: number | null;
  /** WCAG 2.1 AA contrast/accessibility violation count. */
  a11yViolations?: number | null;
}

/**
 * Pure UI rubric: returns the list of human-readable issues for a snapshot. An
 * empty list means the page looks healthy. The data-verify/ui-verify functions
 * map these issues onto a `diff_status` via {@link uiDiffStatus}.
 */
export function uiRubric(snapshot: UiSnapshotInput): string[] {
  const issues: string[] = [];
  if (!snapshot.url) issues.push("missing url");
  // No screenshot at all → we cannot visually verify; treated as a hard issue.
  if (!snapshot.screenshot_url) issues.push("missing screenshot");
  if (snapshot.brokenLayout) issues.push("layout marked broken");
  if (snapshot.lcpMs != null && snapshot.lcpMs > 2500) {
    issues.push(`slow LCP (${Math.round(snapshot.lcpMs)}ms > 2500ms)`);
  }
  if (snapshot.cls != null && snapshot.cls > 0.1) {
    issues.push(`high CLS (${snapshot.cls.toFixed(2)} > 0.10)`);
  }
  if (snapshot.a11yViolations != null && snapshot.a11yViolations > 0) {
    issues.push(`${snapshot.a11yViolations} WCAG violation(s)`);
  }
  return issues;
}

/** Issues that constitute a critical regression (block release). */
const CRITICAL_ISSUES = new Set(["missing screenshot", "layout marked broken", "missing url"]);

/**
 * Map rubric issues → diff_status. A critical issue (broken layout / no
 * screenshot) is `broken` and blocks release; any other issue is `changed`
 * (needs a look); none is `ok`.
 */
export function uiDiffStatus(issues: string[]): DiffStatus {
  if (issues.length === 0) return "ok";
  if (issues.some((i) => CRITICAL_ISSUES.has(i))) return "broken";
  return "changed";
}
