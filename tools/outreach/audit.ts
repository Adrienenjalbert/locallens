// Free website auditor — fetches a prospect's homepage over plain HTTP and runs
// cheap, deterministic heuristics to surface REAL, concrete improvements. No LLM,
// no paid API: this is what makes the engine cost-effective. The LLM later only
// *phrases* these findings into a message.
//
// Scoring: 0..100 where LOWER = more headroom = better outreach prospect.
// We start at 100 and subtract for each issue, weighted by severity.

import type { AuditIssue, AuditResult, Prospect } from "./types";

const FETCH_TIMEOUT_MS = 12_000;
const UA =
  "Mozilla/5.0 (compatible; BetterClickAudit/1.0; +https://betterclick.example)";

/** Each detector returns an issue (or null) given the page context. */
interface PageContext {
  url: string;
  finalUrl: string;
  status: number;
  html: string;
  bytes: number;
  elapsedMs: number;
}

type Detector = (ctx: PageContext, p: Prospect) => AuditIssue | null;

const has = (html: string, re: RegExp) => re.test(html);

const DETECTORS: Detector[] = [
  // --- Trust / technical basics ---
  (ctx) =>
    ctx.finalUrl.startsWith("https://")
      ? null
      : {
          id: "no_https",
          label: "Website isn't secure (no HTTPS)",
          impact:
            "Browsers show a 'Not secure' warning and Google ranks HTTP sites lower — customers bounce before they call.",
          severity: 5,
        },
  (ctx) =>
    has(ctx.html, /<meta[^>]+name=["']viewport["']/i)
      ? null
      : {
          id: "not_mobile_friendly",
          label: "Not mobile-friendly (no viewport tag)",
          impact:
            "Most garden enquiries come from phones; a non-responsive site loses the majority of visitors.",
          severity: 5,
        },
  (ctx) =>
    ctx.bytes < 2_500_000
      ? null
      : {
          id: "heavy_page",
          label: "Homepage is very heavy / slow to load",
          impact:
            "Slow pages lose ~half of mobile visitors and hurt Google Ads Quality Score (you pay more per click).",
          severity: 4,
        },

  // --- SEO / findability basics ---
  (ctx) =>
    has(ctx.html, /<title[^>]*>[^<]{5,}<\/title>/i)
      ? null
      : {
          id: "missing_title",
          label: "Missing or empty page title",
          impact:
            "Google uses the title as your headline in search; without it you're invisible for 'gardener near me'.",
          severity: 4,
        },
  (ctx) =>
    has(ctx.html, /<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i)
      ? null
      : {
          id: "missing_meta_description",
          label: "No meta description",
          impact:
            "Search results show a random snippet instead of a compelling reason to click — fewer clicks.",
          severity: 2,
        },

  // --- Conversion: can a customer actually contact / book? ---
  (ctx, p) => {
    const hasTelLink = has(ctx.html, /href=["']tel:/i);
    const phoneShown =
      !!p.phone &&
      ctx.html.replace(/\s|-/g, "").includes(p.phone.replace(/\s|-/g, ""));
    return hasTelLink || phoneShown
      ? null
      : {
          id: "no_click_to_call",
          label: "No tap-to-call phone link",
          impact:
            "On mobile, a tappable number is the #1 way garden customers convert — typing a number loses them.",
          severity: 4,
        };
  },
  (ctx) =>
    has(
      ctx.html,
      /(book\s*(now|online)|request a quote|get a quote|free quote|contact us|enquir)/i,
    )
      ? null
      : {
          id: "no_clear_cta",
          label: "No clear call-to-action (quote/booking/contact)",
          impact:
            "Visitors who don't see an obvious 'Get a quote' button leave without becoming a lead.",
          severity: 4,
        },
  (ctx) =>
    has(ctx.html, /(contact|enquir|quote|get-a-quote|book)/i)
      ? null
      : {
          id: "no_contact_path",
          label: "No obvious contact page or form",
          impact: "If customers can't find how to reach you, the leads simply go to a competitor.",
          severity: 3,
        },

  // --- Social proof: reviews on the site ---
  (ctx) =>
    has(ctx.html, /(review|testimonial|★|stars?|trustpilot|checkatrade|google review)/i)
      ? null
      : {
          id: "no_reviews_shown",
          label: "No reviews/testimonials shown on the site",
          impact:
            "81% of people read reviews before choosing a local trade; not showing them kills trust on the page.",
          severity: 3,
        },

  // --- Lead capture / remarketing ---
  (ctx) =>
    has(ctx.html, /(gtag|googletagmanager|google-analytics|gtm\.js|fbq\()/i)
      ? null
      : {
          id: "no_analytics",
          label: "No analytics / ad-tracking installed",
          impact:
            "Without tracking you can't measure leads or run effective Google/Facebook ads (no remarketing, no ROI proof).",
          severity: 2,
        },
];

/** A prospect with no website at all — the strongest, special-cased prospect. */
function auditNoWebsite(): AuditResult {
  return {
    reachable: false,
    score: 5, // very low score = huge headroom
    issues: [
      {
        id: "no_website",
        label: "No website at all",
        impact:
          "You're relying entirely on shared-lead platforms; a simple branded site + Google profile captures exclusive leads no competitor sees.",
        severity: 5,
      },
    ],
    signals: { hasWebsite: false },
  };
}

async function fetchPage(url: string): Promise<PageContext> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      signal: controller.signal,
      redirect: "follow",
    });
    const html = await res.text();
    return {
      url,
      finalUrl: res.url || url,
      status: res.status,
      html,
      bytes: new Blob([html]).size,
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function audit(p: Prospect): Promise<AuditResult> {
  if (!p.website) return auditNoWebsite();

  let ctx: PageContext;
  try {
    ctx = await fetchPage(p.website);
  } catch (e) {
    // Unreachable site is itself a finding (down / broken = urgent).
    return {
      reachable: false,
      score: 10,
      issues: [
        {
          id: "site_unreachable",
          label: "Website is down or unreachable",
          impact:
            "A site that won't load loses every visitor and tanks your Google Ads — this is costing you money right now.",
          severity: 5,
        },
      ],
      signals: { error: e instanceof Error ? e.message : String(e) },
    };
  }

  if (ctx.status >= 400) {
    return {
      reachable: false,
      httpStatus: ctx.status,
      score: 10,
      issues: [
        {
          id: "site_error_status",
          label: `Website returns an error (HTTP ${ctx.status})`,
          impact:
            "Customers and Google both hit an error page instead of your services — urgent to fix.",
          severity: 5,
        },
      ],
      signals: { httpStatus: ctx.status },
    };
  }

  const issues = DETECTORS.map((d) => d(ctx, p)).filter(
    (i): i is AuditIssue => i !== null,
  );

  // Score: start at 100, subtract weighted penalties (severity * 5), floor 0.
  const penalty = issues.reduce((sum, i) => sum + i.severity * 5, 0);
  const score = Math.max(0, 100 - penalty);

  return {
    reachable: true,
    httpStatus: ctx.status,
    score,
    issues,
    signals: {
      hasWebsite: true,
      finalUrl: ctx.finalUrl,
      bytes: ctx.bytes,
      loadMs: ctx.elapsedMs,
      issueCount: issues.length,
    },
  };
}

/** Pick the 2-3 highest-impact issues for the pitch (stable: severity desc). */
export function topIssues(result: AuditResult, n = 3): AuditIssue[] {
  return [...result.issues].sort((a, b) => b.severity - a.severity).slice(0, n);
}
