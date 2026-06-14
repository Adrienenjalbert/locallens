# LocalLens

A **config-driven local-intent engine** that monetises one defensible data asset **three ways** off the same session — **affiliate** (instant), **CRM subscriptions** (recurring), and **lead-gen** (high-value) — all optimised by a **CRISP-DM self-improving loop**.

One codebase runs any vertical (trades, health, hospitality, services) by changing configuration. Launching first in the UK with **gardeners in one metro** as the wedge.

> **The stronger idea:** a directory's biggest asset is high-intent traffic. Instead of monetising it only when a visitor becomes a lead for a *claimed* operator (leaving day-one traffic at £0), LocalLens adds a first-class **affiliate rail** and a **RevenueRouter** that treats *"which money-maker to surface for this visitor, right now"* as the central, continuously-optimised decision — within a hard **trust floor** that keeps ranking honest.

---

## Docs (read in order)

| Doc | What |
|---|---|
| [`docs/00-MASTER-STRATEGY.md`](docs/00-MASTER-STRATEGY.md) | The thesis, the three rails, the RevenueRouter, what's stronger than v1, sequencing |
| [`docs/01-DATA-SCIENCE.md`](docs/01-DATA-SCIENCE.md) | Quality Score, Intent classifier, RevenueRouter policy, Opportunity/market model, evaluation discipline |
| [`docs/02-CRISP-DM-LOOP.md`](docs/02-CRISP-DM-LOOP.md) | The five surfaces, the cycle, the improvement-agent, constant Data + UI verification |
| [`docs/03-AFFILIATE-ENGINE.md`](docs/03-AFFILIATE-ENGINE.md) | The affiliate rail: schema, safe click/postback path, trust floor, compliance, economics |
| [`docs/04-BUILD-PROMPT-PLAN.md`](docs/04-BUILD-PROMPT-PLAN.md) | Revenue-first build sequence (Stage 0/1/2) + dependency graph |

The three source documents (PRD, original Lovable plan, CRISP-DM playbook) remain the canonical companions; these docs build on them.

---

## Architecture at a glance

```
Visitor + context ─► RevenueRouter (policy) ─► argmax E[revenue] within TRUST FLOOR
                          │  affiliate / lead / subscription-nudge / featured / nothing
                          ▼
        event_log · router_decision · touch · conversion  (unified attribution spine)
                          ▼
        CRISP-DM loop reads outcomes → updates config → engine improves itself
```

- **Front end:** React + Vite + TypeScript + Tailwind (CSS-variable design tokens → a vertical re-skins from config at runtime).
- **Backend:** Supabase (Postgres + PostGIS + Auth + Storage + Edge Functions + cron). The FE only reads **golden records** + active offers; all ETL/scraper/affiliate/comms/billing keys stay server-side.
- **The router** (`src/lib/revenue-router/`) is real, unit-tested code with the trust floor enforced as hard constraints.

---

## Repo layout

```
config/                 Vertical configs (design tokens, score weights, router policy)
  verticals/gardeners.ts
src/
  lib/revenue-router/   RevenueRouter + trust-floor constraints + tests   ← the core idea
  components/
    monetisation/       MonetisationSlot, AffiliateUnit, Lead/Subscription units
    directory/          AnswerBlock, BusinessCard, QualityScoreBadge
  pages/                LocationPage (answer-first + slot demo)
  theme/                ThemeProvider (applies tokens as CSS vars)
supabase/
  migrations/           0001 foundation · 0002 ETL · 0003 affiliate+revenue · 0004 CRM · 0005 loop · 0006 RLS
  seed.sql              gardeners + Manchester + seed affiliate offers
docs/                   Strategy + data-science + loop + affiliate + build plan
```

---

## Quick start

```bash
npm install
cp .env.example .env          # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (FE-safe only)
npm run dev                   # http://localhost:5173  →  /gardeners/manchester
npm test                      # RevenueRouter trust-floor + EV tests
npm run typecheck && npm run build
```

Supabase (local), once the CLI is installed:

```bash
supabase start
supabase db reset             # applies migrations + seed
npm run db:types              # regenerate src/lib/database.types.ts
```

> Note: the app boots without Supabase configured (for local UI work); data-backed pages require the env vars + a Supabase project.

---

## The trust floor (why this is honest + a moat)

The RevenueRouter may only choose candidates that clear hard, **code-enforced** constraints (`src/lib/revenue-router/constraints.ts`, unit-tested):

1. **Ranking integrity** — paid/featured units never reorder the honest Quality-Score list; capped above the fold.
2. **Affiliate relevance + disclosure** — below-relevance offers never render; disclosure + `rel="sponsored nofollow"` mandatory.
3. **Answer-first** — the direct answer/shortlist always precedes any monetisation unit.
4. **Consent** — affiliate only with marketing consent (PECR/UK GDPR).
5. **Lead needs an operator** — the lead rail only fires when a claimed operator can receive it.

Revenue is optimised **within** a fixed user-value floor. Trust is the product.
