// ui-verify (Constant verification — UI gate) — per-deploy + scheduled UI QA.
// For each page-type × device it records ONE `ui_snapshot` row (page_type, url,
// device, screenshot_url, diff_status, issues), so /admin/ui always shows the
// current visual health and critical regressions can block a release.
//
// SCREENSHOTS: this environment cannot drive a real browser. The function is
// structured around an OPTIONAL external screenshot service:
//
//   • If SCREENSHOT_SERVICE_URL is set, we POST { url, device } to it and expect
//     { screenshot_url, brokenLayout?, lcpMs?, cls?, a11yViolations? } back. This
//     is the seam where a Playwright / Browserless / browserless.io runner (run
//     in CI on each deploy) plugs in — it captures the PNG, uploads it to
//     storage, runs CWV + axe checks, and returns the URL + metrics.
//   • If it is NOT set (basic mode), we record a 'pending' snapshot with no
//     screenshot. The pure rubric still runs and (because the screenshot is
//     missing) marks the snapshot 'broken' / pending so it is clearly visible as
//     "not yet verified" rather than silently passing.
//
// No external paid service is required to run in basic mode.
//
// POST /functions/v1/ui-verify
//   body (all optional): { baseUrl?, targets?: {page_type,url}[], devices?: string[] }

import { handlePreflight, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/admin.ts";
import {
  type DiffStatus,
  type UiSnapshotInput,
  uiDiffStatus,
  uiRubric,
} from "../_shared/verify-rules.ts";

interface Target {
  page_type: string;
  url: string;
}

interface Body {
  baseUrl?: string;
  targets?: Target[];
  devices?: string[];
}

interface ScreenshotResult {
  screenshot_url: string | null;
  brokenLayout?: boolean;
  lcpMs?: number | null;
  cls?: number | null;
  a11yViolations?: number | null;
}

interface SnapshotRow {
  page_type: string;
  url: string;
  device: string;
  screenshot_url: string | null;
  diff_status: DiffStatus | "pending";
  issues: string[];
}

// Default surfaces to verify when the caller doesn't pass explicit targets — the
// page-types from docs/01 (location/profile/service-location/best-of/tool…).
const DEFAULT_TARGETS: Target[] = [
  { page_type: "location", url: "/" },
  { page_type: "profile", url: "/" },
  { page_type: "service-location", url: "/" },
  { page_type: "best-of", url: "/" },
  { page_type: "tool", url: "/" },
];
const DEFAULT_DEVICES = ["mobile", "desktop"];

/**
 * Capture a screenshot via the optional external runner. Returns null when no
 * service is configured (basic mode) or on any error — the caller then records a
 * 'pending' snapshot rather than failing the whole run.
 */
async function captureScreenshot(url: string, device: string): Promise<ScreenshotResult | null> {
  const service = Deno.env.get("SCREENSHOT_SERVICE_URL");
  if (!service) return null; // basic mode — no runner wired yet.
  try {
    const res = await fetch(service, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, device }),
    });
    if (!res.ok) return null;
    return (await res.json()) as ScreenshotResult;
  } catch (_err) {
    // Network/runner failure must not crash the verification pass.
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body = {};
  try {
    const text = await req.text();
    if (text.trim().length > 0) body = JSON.parse(text) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const supabase = adminClient();
  const baseUrl = (body.baseUrl ?? Deno.env.get("SITE_ORIGIN") ?? "").replace(/\/$/, "");
  const targets = body.targets ?? DEFAULT_TARGETS;
  const devices = body.devices ?? DEFAULT_DEVICES;
  const hasRunner = !!Deno.env.get("SCREENSHOT_SERVICE_URL");

  const rows: SnapshotRow[] = [];
  const tallies = { ok: 0, changed: 0, broken: 0, pending: 0 };

  for (const target of targets) {
    const absUrl = target.url.startsWith("http") ? target.url : `${baseUrl}${target.url}`;
    for (const device of devices) {
      const shot = await captureScreenshot(absUrl, device);

      const rubricInput: UiSnapshotInput = {
        page_type: target.page_type,
        url: absUrl,
        device,
        screenshot_url: shot?.screenshot_url ?? null,
        brokenLayout: shot?.brokenLayout,
        lcpMs: shot?.lcpMs ?? null,
        cls: shot?.cls ?? null,
        a11yViolations: shot?.a11yViolations ?? null,
      };
      const issues = uiRubric(rubricInput);

      // With no runner we mark the snapshot 'pending' (clearly "not verified")
      // rather than 'broken'; with a runner the rubric decides ok/changed/broken.
      let diff_status: SnapshotRow["diff_status"];
      if (!hasRunner) {
        diff_status = "pending";
        tallies.pending++;
      } else {
        diff_status = uiDiffStatus(issues);
        tallies[diff_status]++;
      }

      rows.push({
        page_type: target.page_type,
        url: absUrl,
        device,
        screenshot_url: shot?.screenshot_url ?? null,
        diff_status,
        issues,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("ui_snapshot").insert(rows);
  }

  const criticalRegressions = tallies.broken;
  return json({
    ok: true,
    mode: hasRunner ? "captured" : "pending",
    snapshots: rows.length,
    tallies,
    // A non-zero count here is the signal CI uses to block a release.
    criticalRegressions,
  });
});
