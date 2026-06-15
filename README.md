<div align="center">

# 🔎 LocalLens

### A config‑driven local‑intent engine that monetises one data asset three ways — optimised by a self‑improving loop.

**Affiliate** (instant) · **CRM subscriptions** (recurring) · **Lead‑gen** (high‑value) — all decided live by a **RevenueRouter** that runs inside a hard, code‑enforced **trust floor**.

<br/>

[![CI](https://img.shields.io/github/actions/workflow/status/Adrienenjalbert/locallens/deploy-pages.yml?branch=main&label=build%20%26%20deploy&logo=github)](../../actions)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Edge%20Functions-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-vitest-6E9F18?logo=vitest&logoColor=white)](#testing)
[![Deploy](https://img.shields.io/badge/hosting-GitHub%20Pages-222?logo=githubpages)](#-deploy-to-github-pages)

</div>

---

## Why LocalLens

A directory's biggest asset is **high‑intent traffic**. Most directories only monetise it when a visitor becomes a lead for a *claimed* operator — leaving day‑one traffic worth **£0**.

LocalLens treats *"which money‑maker to surface for **this** visitor, **right now**"* as the central, continuously‑optimised decision:

- 🟢 **Affiliate rail** — earns from the very first visitor, before a single operator has claimed a profile.
- 🔵 **CRM subscriptions** — recurring revenue from operators who run their business on the platform.
- 🟣 **Lead‑gen** — high‑value introductions routed only to operators who can actually receive them.

One codebase serves **any vertical** (trades, health, hospitality, services) by changing a config file. The wedge: **gardeners in one UK metro**.

> **The core bet:** revenue is maximised *within* a fixed user‑value floor. Trust isn't a policy — it's a set of hard constraints compiled into the router. **Trust is the product.**

---

## ✨ At a glance

| | |
|---|---|
| 🎯 **One asset, three rails** | The same high‑intent session is monetised via affiliate, subscription, and lead‑gen — whichever maximises expected value. |
| 🧭 **RevenueRouter** | Real, unit‑tested code (`src/lib/revenue-router/`) that picks `argmax E[revenue]` per slot, every render. |
| 🛡️ **Trust floor** | Five hard constraints (`constraints.ts`) the router *cannot* violate — answer‑first, ranking integrity, relevance, consent, operator‑backed leads. |
| 🔁 **CRISP‑DM loop** | Outcomes flow into an attribution spine; the loop reads them and re‑tunes config so the engine improves itself. |
| ⭐ **Quality Score** | Transparent, weighted scoring (`src/lib/scoring/`) that keeps the honest ranking honest. |
| 🎨 **Config‑driven verticals** | CSS‑variable design tokens + score weights + router policy live in `config/verticals/*` — re‑skin and re‑tune without touching components. |
| 🧰 **Owner CRM workspace** | Leads → quotes → jobs → invoices lifecycle for claimed operators (`src/app/app/*`). |
| 🤖 **B2B signal outreach** | A standalone engine that discovers, audits, and ranks prospects (`tools/outreach/`). |
| ⚡ **Static + serverless** | Next.js static export on GitHub Pages; every privileged operation runs in a Supabase Edge Function. |

---

## 🏗️ Architecture at a glance

```text
Visitor + context ─► RevenueRouter (policy) ─► argmax E[revenue]  WITHIN the TRUST FLOOR
                          │   affiliate │ lead │ subscription‑nudge │ featured │ nothing
                          ▼
        event_log · router_decision · touch · conversion   ← unified attribution spine
                          ▼
        CRISP‑DM loop reads outcomes ─► updates config ─► the engine improves itself
```

- **Front end** — Next.js (App Router) + TypeScript + Tailwind, **statically exported** (`output: 'export'`) and hosted on **GitHub Pages**. CSS‑variable design tokens let a vertical re‑skin from config at runtime, and static HTML is ideal for SEO/AEO crawlability.
- **Back end** — Supabase (Postgres + PostGIS + Auth + Storage + **Edge Functions** + cron). The static site only reads **golden records** + active offers and calls Edge Functions. All ETL / scraper / affiliate / comms / billing keys stay server‑side, because Pages serves only static files.
- **The router** — `src/lib/revenue-router/` is real, deterministic, unit‑tested code. Every decision is explainable (each candidate carries a reason) and the trust floor is enforced as hard constraints, not guidelines.

---

## 🗺️ Repo layout

```text
config/                       Vertical configs — the only thing you change per vertical
  verticals/gardeners.ts        design tokens · score weights · router policy
  types.ts · index.ts

src/
  app/                        Next App Router (static export)
    page.tsx                    home
    [vertical]/[location]/      SSG directory pages (+ /[business] profiles)
    tools/[tool]/               SSG cost estimator + comparator tools (AEO surfaces)
    claim/                      operator claim flow
    app/                        owner CRM workspace
      leads · quotes · jobs · invoices · customers · profile · settings
  lib/
    revenue-router/             ◄── the core idea: router · constraints · types · tests
    scoring/                    Quality Score + page‑readiness (+ tests)
    crm/ · billing/ · auth/     CRM repo, entitlements, auth helpers
    tools/                      pricing + JSON‑LD for the tool pages
  components/
    directory/ · monetisation/  AnswerBlock, BusinessCard, MonetisationSlot, units
    crm/ · app/ · tools/ · ui/  CRM lifecycle, owner dashboard, tool widgets, primitives
  views/                      page‑level compositions (LocationPage, ProfileView, tools…)
  theme/                      ThemeProvider — applies config tokens as CSS variables

supabase/
  migrations/                 0001 foundation · 0002 ETL · 0003 affiliate+revenue
                              0004 CRM · 0005 loop/quality · 0006 RLS
  functions/                  Deno Edge Functions:
                              affiliate‑redirect · affiliate‑postback · router‑candidates
                              etl‑* · journey‑engine · seed‑journeys  (+ _shared/)
  seed.sql                    gardeners + Manchester + seed affiliate offers

tools/outreach/               B2B signal‑based prospect discovery + audit engine
.github/workflows/            deploy-pages.yml — build static export → GitHub Pages
docs/                         strategy · data science · CRISP‑DM loop · affiliate · GTM
```

---

## 🚀 Quick start

```bash
npm install
cp .env.example .env          # fill NEXT_PUBLIC_SUPABASE_URL + ANON_KEY (FE‑safe only)
npm run dev                   # http://localhost:3000  →  /gardeners/manchester
```

```bash
npm test                      # RevenueRouter trust‑floor + Quality Score tests
npm run typecheck             # tsc --noEmit
npm run build                 # production static export → out/
```

> The app boots **without** Supabase configured (for local UI work). Data‑backed pages require the env vars + a Supabase project.

### Supabase (local)

Once the [Supabase CLI](https://supabase.com/docs/guides/cli) is installed:

```bash
supabase start
supabase db reset             # applies migrations + seed
supabase functions serve      # affiliate‑redirect · affiliate‑postback · router‑candidates · …
npm run db:types              # regenerate src/lib/database.types.ts
```

### B2B outreach engine

```bash
cp tools/outreach/.env.outreach.example tools/outreach/.env.outreach
npm run outreach              # discovers + audits + ranks prospects → tools/outreach/out/
```

---

## 🛡️ The trust floor — why this is honest *and* a moat

The RevenueRouter may **only** choose candidates that clear hard, code‑enforced constraints in [`src/lib/revenue-router/constraints.ts`](src/lib/revenue-router/constraints.ts) (all unit‑tested):

| # | Constraint | Guarantee |
|---|---|---|
| 1 | **Ranking integrity** | Paid/featured units never reorder the honest Quality‑Score list and are capped above the fold. |
| 2 | **Affiliate relevance + disclosure** | Below‑relevance offers never render; disclosure + `rel="sponsored nofollow"` is mandatory. |
| 3 | **Answer‑first** | The direct answer/shortlist always precedes any monetisation unit. |
| 4 | **Consent** | Affiliate fires only with marketing consent (PECR / UK GDPR). |
| 5 | **Operator‑backed leads** | The lead rail only fires when a claimed operator can actually receive it. |

Revenue is optimised **within** a fixed user‑value floor. If no candidate clears the floor, the honest outcome — showing **nothing** — is a first‑class result.

---

## 🧪 Testing

```bash
npm test
```

| Suite | Covers |
|---|---|
| `src/lib/revenue-router/router.test.ts` | EV ranking, arm selection, every trust‑floor constraint |
| `src/lib/scoring/quality-score.test.ts` | Weighted scoring, normalisation, edge cases |

The build itself (`npm run build`) also runs `next lint` + full type‑checking and prerenders every route, so a green build is a strong correctness signal.

---

## ☁️ Deploy to GitHub Pages

1. **Push to `main`.** [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) runs the tests, builds the static export, and publishes `out/`.
2. In repo **Settings → Pages**, set **Source: GitHub Actions**.
3. Add repo secrets `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (the anon key is RLS‑bounded and safe to ship in a static bundle).
4. For a **project site** (`https://<user>.github.io/<repo>`) the workflow auto‑sets `NEXT_PUBLIC_BASE_PATH=/<repo>`; for a user/org page or custom domain it stays empty.

Privileged work (ETL, affiliate click‑resolution, postbacks, candidate‑build, journeys) runs in Supabase Edge Functions — see [`supabase/functions/README.md`](supabase/functions/README.md).

---

## 📚 Documentation (read in order)

| Doc | What's inside |
|---|---|
| [`docs/00-MASTER-STRATEGY.md`](docs/00-MASTER-STRATEGY.md) | The thesis, the three rails, the RevenueRouter, what's stronger than v1, sequencing |
| [`docs/01-DATA-SCIENCE.md`](docs/01-DATA-SCIENCE.md) | Quality Score, intent classifier, RevenueRouter policy, opportunity/market model, evaluation discipline |
| [`docs/02-CRISP-DM-LOOP.md`](docs/02-CRISP-DM-LOOP.md) | The five surfaces, the cycle, the improvement‑agent, constant Data + UI verification |
| [`docs/03-AFFILIATE-ENGINE.md`](docs/03-AFFILIATE-ENGINE.md) | The affiliate rail: schema, safe click/postback path, trust floor, compliance, economics |
| [`docs/04-BUILD-PROMPT-PLAN.md`](docs/04-BUILD-PROMPT-PLAN.md) | Revenue‑first build sequence (Stage 0/1/2) + dependency graph |
| [`docs/05-B2B-SIGNAL-OUTREACH-PLAN.md`](docs/05-B2B-SIGNAL-OUTREACH-PLAN.md) | Signal‑based B2B prospecting for the outreach engine |
| GTM plans | [`docs/01-BUSINESS-PLAN-ITALY-GTM.md`](docs/01-BUSINESS-PLAN-ITALY-GTM.md) · [`docs/02-BUSINESS-PLAN-UK-GTM.md`](docs/02-BUSINESS-PLAN-UK-GTM.md) |

---

## 🧰 Tech stack

**Next.js 14** · **React 18** · **TypeScript 5** · **Tailwind CSS 3** · **Supabase** (Postgres + PostGIS + Edge Functions/Deno) · **Vitest** · **GitHub Actions** → **GitHub Pages**.

## 🔐 Security & secrets

The browser only ever sees the Supabase **anon** key + public URL (RLS‑bounded). Every privileged key — service role, Google Places, Apify, SEMrush, Stripe, Resend, Twilio, affiliate‑network keys — lives in Supabase Edge Function secrets and **never** in the front end. See [`.env.example`](.env.example). Never commit a `.env` file.

## 🤝 Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branch naming, conventional commits, and the local verification checklist (`typecheck` → `test` → `build`).

## 📄 License

Released under the [MIT License](LICENSE).
