# Cursor Build Handover
### How to build GreenList with a well-architected agentic loop — and keep ongoing cost near zero

*v1.0 · June 2026 · companion to the blueprint, evaluation, and Vertical-in-a-Box PRD*

This is the document you hand to Cursor. It gives an AI coding agent everything it needs to build the directory engine: the stack, the repo, the guardrails (`AGENTS.md`/`.cursorrules`), the **build-time agentic loop** (how the agent should work), the **runtime self-improving loop** (what the product does), the CI quality gates, and a sequenced ticket backlog with acceptance criteria.

Two loops, don't confuse them:
- **Build loop** = how Cursor's agent writes the software (plan → test → implement → verify → human gate).
- **Runtime loop** = what the shipped product does on a schedule (ingest → score → generate → flag → human feedback → learn).

---

## 1. Recommended stack (static-first, AI-at-build-time)

Chosen to deliver the §13 "pay once, serve free" economics and to be maximally legible to an AI agent.

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js (App Router) + TypeScript** | SSG/ISR makes programmatic pages static & near-free to serve; huge training corpus = agent writes it well |
| Hosting | **Vercel** (or Cloudflare Pages) | Edge CDN, ISR, cheap static serving at scale |
| DB | **Postgres** (Supabase or Neon) + **Drizzle ORM** | Typed schema the agent can reason about; `pgvector` for portfolio/visual embeddings |
| Background jobs | **Inngest** (or Trigger.dev) | The runtime loop runs as scheduled/batch functions, not per-request — key to low cost |
| Styling/UI | **Tailwind + shadcn/ui** | Componentised, accessible defaults; fast for agents |
| Scraping | **Apify SDK** (`compass/crawler-google-places`, reviews actor) | Proven in live tests |
| Web extraction | **Firecrawl** (`/extract` with schema) | Add as connector; schema-based pull of brand/services/trust |
| LLM | **Anthropic + OpenAI** via a thin `llm/` wrapper | Swappable; all calls go through one rate-limited, cached module |
| Image gen | **Replicate / fal.ai** behind a capped, cached service | The only per-use cost — must be gated |
| Tests | **Vitest** (unit) + **Playwright** (e2e) | Test-gated agent loop |
| Quality CI | **Lighthouse CI** + **schema/JSON-LD validator** + **thin-content linter** | Enforces SEO/AEO/quality automatically |

> If the team prefers another stack, the only hard requirements are: (a) static/ISR rendering for programmatic pages, (b) scheduled batch jobs for the loop, (c) a typed DB schema. Everything else is swappable.

---

## 2. Repository structure (monorepo)

```
greenlist/
├─ AGENTS.md                 # agent operating rules (also symlink .cursorrules)
├─ docs/                     # the 4 strategy docs live here as source of truth
│   ├─ blueprint.md
│   ├─ critical-evaluation.md
│   ├─ vertical-in-a-box-PRD.md
│   └─ cursor-build-handover.md   (this file)
├─ config/
│   └─ verticals/gardeners.yaml    # THE Vertical Config (PRD §5) — single source of vertical truth
├─ apps/
│   └─ web/                  # Next.js app (pages, tools, pro dashboard)
├─ packages/
│   ├─ db/                   # Drizzle schema + migrations (PRD §7 data model)
│   ├─ ingest/               # M1 Apify + Firecrawl + Companies House + socials
│   ├─ resolve/              # M2 entity resolution + cleaning
│   ├─ scoring/              # M3 data-quality, legitimacy, trust fingerprint
│   ├─ generate/             # M4 page + schema generation (build-time)
│   ├─ tools/                # M5 estimator, visualiser, portfolio/marketing gen
│   ├─ llm/                  # single guarded LLM/image wrapper (cache + caps + cost log)
│   └─ loop/                 # M8 runtime loop as Inngest functions
├─ tests/                    # vitest + playwright
└─ .github/workflows/ci.yml  # quality gates
```

**Architecture rule the agent must honour:** vertical-specific knowledge lives **only** in `config/verticals/*.yaml`. Engine packages must read the config and never hardcode "gardens." (This is what makes vertical-cloning possible — PRD §11 "vertical leakage" risk.)

---

## 3. `AGENTS.md` / `.cursorrules` (paste this into the repo)

```markdown
# GreenList — Agent Operating Rules

## Mission
Build a trust-led, vertical-agnostic local-services directory engine. Vertical = config.
Optimise for: data quality, SEO/AEO, near-zero ongoing serving cost, two-sided value.

## Golden rules
1. SPEC FIRST. Every change traces to a ticket in docs/ or config. No unrequested scope.
2. TEST-GATED. Write the acceptance test (or a failing test) BEFORE the implementation.
3. SMALL BATCHES. One vertical slice per PR. Keep diffs reviewable (< ~400 lines).
4. NO VERTICAL HARDCODING. Read config/verticals/*.yaml. Never hardcode "garden".
5. COST DISCIPLINE. All LLM/image calls go through packages/llm with caching + caps.
   NEVER call an LLM or image model from a request handler that runs per pageview.
   Programmatic pages are generated at build/ingest time and served static (ISR).
6. QUALITY GATE. A page only publishes if DataQualityScore >= config threshold AND
   it passes the thin-content linter. Negative/low-confidence trust signals require
   human approval (status: pending_review) before they are public.
7. PROVENANCE. Every scraped field stores {source, fetched_at}. Never publish raw
   third-party review TEXT; publish DERIVED signals only.
8. ACCESSIBILITY + SCHEMA. Every public template ships valid JSON-LD and passes WCAG AA.

## Definition of Done (per ticket)
- [ ] Acceptance criteria met (from the ticket)
- [ ] Unit/e2e tests written and green
- [ ] `pnpm typecheck && pnpm test && pnpm lint` pass
- [ ] No new per-request LLM/image calls
- [ ] If it renders a public page: JSON-LD valid + Lighthouse SEO >= 95 + passes thin-content linter
- [ ] Self-review checklist completed in the PR description
- [ ] Human approval obtained for anything behind the QA gate

## When unsure
Stop and ask. Do not invent product scope, fabricate data, or bypass the QA gate.
```

---

## 4. The build-time agentic loop (how Cursor should work)

Run the agent in a disciplined **spec → test → implement → verify → review** cycle. This is the loop you operate per ticket:

```
        ┌──────────────────────────────────────────────────┐
        │ 0. SELECT TICKET (from §6 backlog)               │
        │    agent reads ticket + linked spec + config     │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 1. PLAN  → agent writes a short plan + file list  │
        │    YOU approve the plan before code (cheap gate)  │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 2. TEST  → agent writes acceptance/failing tests  │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 3. IMPLEMENT → smallest code to pass the tests    │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 4. VERIFY → run typecheck+test+lint+CI gates;     │
        │    agent iterates until green (autonomous)        │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 5. SELF-REVIEW → agent fills PR checklist,        │
        │    diffs against Definition of Done               │
        └───────────────┬──────────────────────────────────┘
                        ▼
        ┌──────────────────────────────────────────────────┐
        │ 6. HUMAN REVIEW → you approve/merge. Feedback      │
        │    becomes a rule in AGENTS.md (loop learns)      │
        └──────────────────────────────────────────────────┘
```

**Why these gates:** the two cheap human checkpoints (plan approval at step 1, PR review at step 6) catch 90% of agent drift for minutes of your time, while steps 2–5 run autonomously. Feeding recurring corrections back into `AGENTS.md` is how the *build* loop self-improves — the agent stops repeating mistakes.

**Operating tips for the agent runs**
- Give the agent the relevant `docs/` section + the ticket, not the whole repo, to keep it focused.
- One ticket = one branch = one PR. Never let it batch unrelated work.
- Keep an `evals/` folder: golden sample inputs (e.g. the Manchester scrape) with expected cleaned/scored outputs, so regressions in M2/M3 are caught automatically.
- Make CI the agent's source of truth — it iterates against red/green, not vibes.

---

## 5. The runtime self-improving loop (what `packages/loop` builds)

This is the product's loop, implemented as **scheduled batch jobs** (Inngest), never per-request — the key to flat cost as traffic grows.

```
Inngest cron (e.g. weekly per geo):
  1. INGEST deltas      → packages/ingest   (Apify/Firecrawl; only changed/new pros)
  2. RESOLVE + CLEAN    → packages/resolve
  3. SCORE              → packages/scoring   (DQ, legitimacy, trust fingerprint)
  4. GATE               → write status: published | pending_review | enrich_queue
  5. GENERATE           → packages/generate  (regenerate ONLY changed pages → ISR revalidate)
  6. FLAG               → anomalies, rank drops, low-confidence, disputes → review queue
  7. HUMAN FEEDBACK     → ops approve/edit/reject (UI in apps/web/admin)
  8. LEARN              → corrections stored as FeedbackEvent → tune prompts/thresholds
```

Triggered events (also Inngest, cheap text-LLM): post-job → verified-review request; new enquiry → AI receptionist qualifies + books site visit; site visit → quote builder. None of these run on pageview.

**Cost guardrails in code:** `packages/llm` enforces (a) a response cache keyed on input hash, (b) a per-job token/image budget that hard-stops, (c) a cost log per run. Image generation (visualiser) is rate-limited per IP/session and cached by input.

---

## 6. Ticket backlog (vertical slices the agent can execute in order)

Each ticket is small, testable, and shippable. Acceptance criteria are the agent's contract.

**Milestone A — Foundations**
- `A1` Scaffold monorepo + CI (typecheck/test/lint/lighthouse/schema gates). *AC: CI green on empty app; gates fail a deliberately thin page.*
- `A2` Drizzle schema for PRD §7 entities + migrations. *AC: schema matches data model; `pnpm db:migrate` works; provenance fields present.*
- `A3` `config/verticals/gardeners.yaml` + a typed loader. *AC: engine reads config; no hardcoded vertical strings (lint rule).*

**Milestone B — Data pipeline (proven in live tests)**
- `B1` `packages/ingest` Apify Maps + reviews. *AC: ingests N Manchester landscapers; stores provenance; idempotent re-run.*
- `B2` `packages/ingest` Firecrawl site extraction (brand/services/trust schema). *AC: returns logo+services+trust for a real site; null-safe when no site.*
- `B3` `packages/resolve` entity resolution + cleaning. *AC: dedupes same pro across sources; flags the "5:30 AM" class of errors; sanitises keyword-stuffed names. Tested against `evals/`.*

**Milestone C — Scoring & gate (the moat + safety)**
- `C1` Data-Quality Score + publish threshold. *AC: low-DQ records go to enrich_queue, not public.*
- `C2` Legitimacy Score from configured signals. *AC: deterministic, explainable score with per-signal breakdown.*
- `C3` Trust/Review fingerprint via `packages/llm` (cached, build-time). *AC: synthesises across sources where ≥ min_text_reviews; honest "limited data" state otherwise; no per-pageview calls.*
- `C4` Human QA gate + admin review queue + pro right-of-reply. *AC: nothing negative publishes without approval; FeedbackEvent recorded.*

**Milestone D — Pages (SEO/AEO, static)**
- `D1` `packages/generate` location/cost/best-of/profile templates with JSON-LD + extractable answer blocks + internal links. *AC: ISR static; Lighthouse SEO ≥95; valid schema; thin-content linter passes; robots allows AI crawlers.*
- `D2` Per-type sitemaps + breadcrumbs. *AC: all pages reachable; no orphans.*

**Milestone E — Two-sided tools**
- `E1` Buyer cost-estimator (client-side, from `pricing_model`). *AC: zero server calls; produces band + lead capture.*
- `E2` Supply portfolio-builder + auto-themed mini-site (from B2 brand tokens). *AC: pro builds portfolio; mini-site renders on /pro/[slug]; switching-cost data lives on platform.*
- `E3` Review-request kit (feeds first-party verified reviews). *AC: post-job trigger sends request; verified review stored and feeds C3.*
- `E4` AI Garden Visualiser (capped/cached image service). *AC: hard per-session cap; cached by input; outputs costed brief → matched enquiry.*
- `E5` AI receptionist / lead qualifier (text-LLM, event-driven). *AC: qualifies enquiry, books site visit; not on any pageview path.*

**Milestone F — Loop & liquidity**
- `F1` `packages/loop` Inngest functions (runtime loop §5). *AC: scheduled; regenerates only changed pages; cost log emitted.*
- `F2` Metrics dashboard (supply density, enquiry→match→booked, verified reviews/wk, AI-citation share). *AC: per-geo liquidity view.*

**Milestone G — Repeatability**
- `G1` Add second vertical via config only (e.g. roofers). *AC: new directory stands up with no engine code changes — proves the PRD thesis.*

---

## 7. CI quality gates (`.github/workflows/ci.yml`)

The agent iterates until all pass:
1. `typecheck` (tsc), `test` (vitest), `e2e` (playwright), `lint`.
2. **Schema gate** — JSON-LD on changed public pages validates.
3. **Lighthouse CI** — SEO ≥ 95, performance budget met, a11y ≥ 95.
4. **Thin-content linter** — fails any public page below uniqueness/coverage threshold.
5. **Cost lint** — static check that no request handler imports `packages/llm` image/LLM calls (only build-time/jobs may).
6. **Eval gate** — `evals/` golden cases for resolve/scoring still produce expected outputs.

---

## 8. Environment & connectors

Secrets (never commit): `APIFY_TOKEN`, `FIRECRAWL_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `REPLICATE_TOKEN`, `DATABASE_URL`, `INNGEST_*`. Add **Firecrawl** as a connector (not currently mounted). Keep a `.env.example`. All third-party calls go through the typed wrappers in `packages/` so they're mockable in tests.

---

## 9. First three things to tell Cursor

1. "Read `docs/` and `config/verticals/gardeners.yaml`. Build ticket `A1`. Follow `AGENTS.md`. Plan first, wait for my approval."
2. After A–C land: "Run `packages/ingest` on Manchester landscapers, show me the cleaned/scored output, and confirm the QA gate blocks low-quality records."
3. Then proceed ticket-by-ticket through the backlog, one PR each, feeding any correction back into `AGENTS.md`.

**The whole point:** the agent does the autonomous middle (test→implement→verify), you keep two cheap gates (plan, PR), the product's cost stays flat because AI runs at build/ingest time, and the engine is vertical-agnostic so the next directory is a config file — not another rebuild.
