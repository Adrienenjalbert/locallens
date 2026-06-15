# LocalLens — Build Prompt Plan (v2, revenue-first sequencing)

Revises `Lovable-Prompt-Plan.md`. Keeps all the original prompts (they were good) and **inserts the affiliate rail + RevenueRouter early** so revenue starts in Stage 0. Works for a local repo (this scaffold) or Lovable copy-paste.

> **Hosting model:** the front end is **Next.js statically exported to GitHub Pages** (crawlable static HTML for SEO/AEO). All dynamic/privileged work runs in **Supabase Edge Functions** the static site calls — there is no Node server in production. Keep this split in mind for every prompt: page = static; logic = Edge Function.

> Convention: ✅ = scaffolded in this repo already · ◻ = to build · 🔁 = wired into the CRISP-DM loop.
> Seed: **gardeners** in one UK metro (e.g. Manchester).

---

## Stage 0 — Asset + Affiliate ("earn before you have operators") — weeks 1–4

| Step | What | State |
|---|---|---|
| 0 | Project scaffold (Next.js 14 App Router + React + TS + Tailwind, config dirs, Supabase wiring) | ✅ |
| 1 | Tokenised design system + component library + `/styleguide` | ✅ partial (tokens, ThemeProvider, core components) |
| 2 | Data model migrations (golden records, ETL, **affiliate/revenue**, CRM, loop, RLS) | ✅ |
| 3 | ETL extract + normalise (Google Places + Apify) — server-side, idempotent, observable | ✅ `etl-extract`, `etl-normalise` |
| 4 | ETL dedup + validate + enrich + load → golden records + provenance + confidence | ✅ `etl-resolve` |
| 5 | Quality Score (config-driven, explainable, `score_breakdown`) | ✅ 🔁 `src/lib/scoring/` (tested) + `etl-score` |
| 6 | Core directory pages (location/profile/service-location) — answer-first, schema, AEO | ◻ partial (LocationPage demo) |
| **A1** | **Affiliate catalogue + partner/offer/placement admin** | ✅ schema + seed; ◻ admin UI |
| **A2** | **RevenueRouter + MonetisationSlot + AffiliateUnit (trust floor in code)** | ✅ |
| **A3** | **Intent classifier (rules v1) → session.intent_*** | ◻ |
| **A4** | **Attribution spine + click-resolution + postback webhooks + candidate-build + RPM view** | ✅ schema/view + Edge Functions (`affiliate-redirect`, `affiliate-postback`, `router-candidates`) |
| **A5** | **Affiliate compliance (disclosure, rel, consent) — gated in `<MonetisationSlot/>`** | ✅ |
| **A6** | **Live wiring: `<MonetisationSlot/>` fetches server candidates (static SSG fallback)** | ✅ `useRouterDecision` + `router-candidates` |
| 21 | Page-readiness scoring + publish gate (affiliate-aware) | ✅ 🔁 `src/lib/scoring/page-readiness.ts` (tested) + `etl-score` |
| 7 | Searcher tools (cost estimator + comparator) — answer-first, FAQ + JSON-LD, shareable URLs, ending MonetisationSlot | ✅ `src/app/tools/[tool]`, `src/views/tools/*`, `src/components/tools/*`, `src/lib/tools/*` |

**Stage 0 outcome:** a live directory in one vertical/metro earning **affiliate RPM from organic traffic with zero operators.** Proves intent value + funds the rest.

---

## Stage 1 — Supply + CRM ("turn proven demand into operators") — weeks 4–10

| Step | What | State |
|---|---|---|
| 8 | Supply flywheel: claim → verify (magic-link) → owner dashboard ("Get found" / improve-your-rank) → portfolio editor (RLS) | ✅ `src/app/claim`, `src/app/app/profile`, `OwnerDashboard`, `ProfileView`, `PortfolioEditor` |
| 13 | Free business tools (quote/invoice generators, pricing calc, get-found score) | ◻ (CRM quote/invoice builders exist; standalone public biz-tool pages next) |
| 14 | CRM data layer + owner workspace shell (`/app`) | ✅ `AppShell`, `/app` layout, `src/lib/crm/*`, `AuthProvider` |
| 15 | Leads inbox (directory tie-in, `session_id` link) + customers | ✅ 🔁 `src/app/app/leads`, `customers` (speed-to-lead timer) |
| 16 | Quotes → jobs/scheduling (recurring) → invoicing | ✅ `src/app/app/quotes`, `jobs`, `invoices` + `LifecycleStepper` |
| 17 | Automated comms & lifecycle journeys (speed-to-lead, follow-up, review request, overdue) | ✅ 🔁 `journey-engine`, `seed-journeys`, `_shared/journeys.ts`, `/app/settings` |
| 18 | Monetisation: Stripe (CRM entry + Growth package), freemium gates, **lead rail live** | ◻ 🔁 |

**Stage 1 outcome:** sessions can now route to **operators/leads** as well as affiliate. Proof-led outreach uses affiliate-proven traffic + captured leads.

---

## Stage 2 — Loop + scale ("let it optimise itself") — weeks 8+

| Step | What | State |
|---|---|---|
| 18 | Monetisation: Stripe (CRM + Growth) + freemium gates + upgrade nudges + referral | ✅ `stripe-checkout`/`stripe-webhook`, `/pricing`, `config/plans.ts`, `Gate`/`UpgradeNudge`, `useEntitlements` |
| 19 | Instrumentation + experiments + improvement-agent + `/admin/loop` | ✅ 🔁 `improvement-agent` (HITL for ranking/routing) + `/admin/loop`, `/admin/experiments` |
| R1 | **Promote RevenueRouter rules → contextual bandit (Thompson)** — swap `selectArm()` only | ✅ 🔁 `bandit.ts`/`bandit-router.ts` (tested), `arm_stat` (mig 0007), `bandit-update` fn; activate via `policy_version='bandit-v2'` |
| 9 | Keyword-driven pSEO scaling (free tools) — profit-aware opportunity | ✅ 🔁 `src/lib/scoring/opportunity.ts` (tested) + `tools/seo/` CLI + `etl-keywords` Edge fn (writes `keyword.opportunity_score`, queues pages); ◻ GSC volume wiring |
| 10 | Technical SEO/AEO plumbing + freshness | ✅ `robots.ts`, `sitemap.ts`, `src/lib/seo/*`, LocalBusiness/Breadcrumb/ItemList schema (see `docs/06-AEO-SEO-STRATEGY.md`) |
| 20 | Authenticity & real-image handling | ◻ schema ✅ |
| 21 | Page-readiness scoring + publish gate (affiliate-aware) | ✅ schema + `src/lib/scoring/page-readiness.ts` (tested) 🔁 (also listed in Stage 0) |
| 22 | Internal prospecting/outreach console (admin GTM, need-score) | ✅ `/admin/prospects` + `tools/outreach` CLI (discover/audit/personalise) |
| 23 | Constant Data + UI verification (release gates) | ✅ 🔁 `data-verify` + `ui-verify` Edge Functions + `/admin/data`, `/admin/ui` |
| 11 | New vertical from config (prove the engine) | ◻ |
| 12 | QA, accessibility & launch checklist | ◻ |

---

## Dependency graph (the order is the strategy)

```
Stage 0 (revenue-first)
0 scaffold ─► 1 design ─► 2 data model ─► 3 ETL extract ─► 4 ETL load ─► 5 score
                                    └─► A1 affiliate catalogue ─► A2 router ─► A3 intent
                                                                       └─► A4 attribution ─► A5 compliance
5,A2 ─► 6 core pages ─► 7 searcher tools         ← directory EARNS affiliate RPM here, no operators

Stage 1 (supply)
6 ─► 8 supply flywheel ─► 13 biz tools ─► 14 CRM ─► 15 leads ─► 16 lifecycle ─► 17 journeys ─► 18 monetisation(+lead rail)

Stage 2 (loop + scale)
all surfaces ─► 19 loop ─► R1 bandit
6 ─► 9 pSEO ✅ ─► 10 SEO/AEO ✅ ─► 11 new vertical ─► 12 QA
6 ─► 20 authenticity ─► 21 readiness   ;   4,15 ─► 22 prospecting   ;   19 ─► 23 verification
```

---

## Why this beats the original sequence

The original proved the demand loop first (0–8) before any revenue — months in a zero-revenue valley, supply-gated. v2 makes **Stage 0 self-funding via affiliate**, decoupling revenue from the slowest input (supply), and uses **affiliate RPM as a market-entry filter** so we only invest supply effort where demand is already proven to pay.

---

## Working notes

- Keep all ETL/scraper/comms/billing/affiliate-resolution logic in **Edge Functions** (service role); the front end only reads golden records + active offers and asks the router.
- Replace `{{brand}}`, `{{first vertical}}`, `{{seed city}}` consistently (defaults: LocalLens / gardeners / Manchester).
- Commit working states often; gate merges on `npm run typecheck`, `npm test`, and the data + UI verification checks.
