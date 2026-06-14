# LocalLens — Build Prompt Plan (v2, revenue-first sequencing)

Revises `Lovable-Prompt-Plan.md`. Keeps all the original prompts (they were good) and **inserts the affiliate rail + RevenueRouter early** so revenue starts in Stage 0. Works for a local repo (this scaffold) or Lovable copy-paste.

> Convention: ✅ = scaffolded in this repo already · ◻ = to build · 🔁 = wired into the CRISP-DM loop.
> Seed: **gardeners** in one UK metro (e.g. Manchester).

---

## Stage 0 — Asset + Affiliate ("earn before you have operators") — weeks 1–4

| Step | What | State |
|---|---|---|
| 0 | Project scaffold (Vite+React+TS+Tailwind, config dirs, Supabase wiring) | ✅ |
| 1 | Tokenised design system + component library + `/styleguide` | ✅ partial (tokens, ThemeProvider, core components) |
| 2 | Data model migrations (golden records, ETL, **affiliate/revenue**, CRM, loop, RLS) | ✅ |
| 3 | ETL extract + normalise (Google Places + Apify) — server-side, idempotent, observable | ◻ |
| 4 | ETL dedup + validate + enrich + load → golden records + provenance + confidence | ◻ |
| 5 | Quality Score (config-driven, explainable, `score_breakdown`) | ◻ 🔁 |
| 6 | Core directory pages (location/profile/service-location) — answer-first, schema, AEO | ◻ partial (LocationPage demo) |
| **A1** | **Affiliate catalogue + partner/offer/placement admin** | ✅ schema + seed; ◻ admin UI |
| **A2** | **RevenueRouter + MonetisationSlot + AffiliateUnit (trust floor in code)** | ✅ |
| **A3** | **Intent classifier (rules v1) → session.intent_*** | ◻ |
| **A4** | **Attribution spine + `/r/:offerId` click-resolution + postback webhooks + RPM view** | ✅ schema/view; ◻ edge fns |
| **A5** | **Affiliate compliance (disclosure, rel, consent) — gated in `<MonetisationSlot/>`** | ✅ |
| 7 | Searcher tools (cost estimator + comparator) with shareable result URLs | ◻ |

**Stage 0 outcome:** a live directory in one vertical/metro earning **affiliate RPM from organic traffic with zero operators.** Proves intent value + funds the rest.

---

## Stage 1 — Supply + CRM ("turn proven demand into operators") — weeks 4–10

| Step | What | State |
|---|---|---|
| 8 | Supply flywheel: claim → verify → owner dashboard → portfolio (RLS) | ◻ |
| 13 | Free business tools (quote/invoice generators, pricing calc, get-found score) | ◻ |
| 14 | CRM data layer + owner workspace shell (`/app`) | ◻ schema ✅ |
| 15 | Leads inbox (directory tie-in, `session_id` link) + customers | ◻ 🔁 |
| 16 | Quotes → jobs/scheduling (recurring) → invoicing | ◻ |
| 17 | Automated comms & lifecycle journeys (speed-to-lead, follow-up, review request, overdue) | ◻ 🔁 |
| 18 | Monetisation: Stripe (CRM entry + Growth package), freemium gates, **lead rail live** | ◻ 🔁 |

**Stage 1 outcome:** sessions can now route to **operators/leads** as well as affiliate. Proof-led outreach uses affiliate-proven traffic + captured leads.

---

## Stage 2 — Loop + scale ("let it optimise itself") — weeks 8+

| Step | What | State |
|---|---|---|
| 19 | Instrumentation + experiments + improvement-agent + `/admin/loop` | ◻ schema ✅ 🔁 |
| R1 | **Promote RevenueRouter rules → contextual bandit (Thompson)** — swap `selectArm()` only | ◻ 🔁 |
| 9 | Keyword-driven pSEO scaling (SEMrush/Ahrefs) — profit-aware opportunity | ◻ 🔁 |
| 10 | Technical SEO/AEO plumbing + freshness | ◻ |
| 20 | Authenticity & real-image handling | ◻ schema ✅ |
| 21 | Page-readiness scoring + publish gate (affiliate-aware) | ◻ schema ✅ 🔁 |
| 22 | Internal prospecting/outreach console (admin GTM, need-score) | ◻ schema ✅ |
| 23 | Constant Data + UI verification (release gates) | ◻ schema ✅ 🔁 |
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
6 ─► 9 pSEO ─► 10 SEO/AEO ─► 11 new vertical ─► 12 QA
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
