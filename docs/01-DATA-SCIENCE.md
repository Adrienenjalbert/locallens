# LocalLens — Data-Science Layer

The four models that make the engine *intelligent* rather than just templated. Every model is **explainable**, **config-driven**, **versioned**, and **offline-backtested before it touches live traffic**. Each is owned by a CRISP-DM loop (see `02-CRISP-DM-LOOP.md`).

> Governing rule: **store every output with its inputs.** Each model writes a `*_breakdown` so any score or decision is auditable — for user trust ("why ranked here") and for the loop (training data + regression detection).

---

## 0. The metric hierarchy (what we optimise)

| Level | Metric | Definition | Used by |
|---|---|---|---|
| **North Star** | **RPM** = revenue per 1,000 sessions | (affiliate + lead + attributed subscription £) / sessions × 1000, per page-type × vertical × geo | RevenueRouter, market entry |
| **Co-primary (trust)** | Qualified actions / 1k sessions | call/quote/booking/directions/tool-completion per 1k | Guardrail on RPM (must not fall) |
| Supporting | Lead rate, completion %, citation count, speed-to-lead, quote→won | per surface | each surface loop |
| Health | data-accuracy, freshness SLA, index rate, CWV, WCAG, disclosure compliance | gates | verification loop |

The **RPM ↔ qualified-actions** relationship is the honesty constraint: we only accept a monetisation change if RPM rises **without** qualified actions falling beyond a tolerance. This is encoded in experiment guardrails.

---

## 1. Quality Score (ranking model)

**Decision it changes:** the order of operators on location/best-of pages and the default in comparators.

**Form (config-driven per vertical, weights in `vertical.score_weights`):**

```
score = 100 × Σ_i  w_i · f_i(business)
```

| Signal `f_i` | How it's computed | Anti-gaming |
|---|---|---|
| review_quality | Bayesian-adjusted rating `(v·R + m·C)/(v+m)` (v=reviews, R=avg, m=prior strength, C=global mean) × recency decay × cross-source consistency | velocity anomaly detection; cross-source corroboration; per-signal cap |
| portfolio_quality | presence × depth × recency × image-quality (weighted higher in visual verticals) | image-quality model; require real provenance |
| verification | claimed + verified contact + verified credentials | credentials must be `verified=true` |
| completeness | profile-completeness ratio | — |
| data_confidence | penalise stale/low-confidence golden records | freshness SLA |

**Bayesian prior is the key fairness device:** a 4.9 with 3 reviews must not outrank a 4.7 with 400. `m` (prior strength) is itself a config knob the loop can tune.

**Lifecycle:** recompute on every ETL load → write `quality_score` + `score_breakdown` → render "Why ranked here." A weight change is a **versioned experiment**: replay against historical sessions (offline backtest, §5) to estimate Δ lead-rate before any live A/B.

---

## 2. Intent Classifier (NEW — feeds the router)

**Decision it changes:** which rail the RevenueRouter should favour for this visitor.

**Output:** `{ funnel_stage ∈ {research, compare, hire_now}, commercial_value ∈ {low, medium, high} }`.

**Why it matters:**
- `hire_now` + has-operators → favour **lead** rail (highest value, operator-relevant).
- `research` / no-operators → favour **affiliate** rail (monetise intent we can't otherwise serve).
- `compare` → comparator tool + balanced rails.

**v1 (rules, transparent):** derived from the keyword's stored `intent`/`funnel` (from SEMrush ingest), the `page.type`, referrer, and simple on-page signals (e.g. clicked "get quote" = hire_now).

**v2 (learned):** a classifier trained on `event_log` sequences (page path, dwell, scroll, tool starts) → stage. Features stored; predictions written to `session.intent_stage` / `session.intent_value`.

**Inputs → stored on `session`** so the router decision and outcome are joinable.

---

## 3. RevenueRouter Policy (NEW — the central model)

**Decision it changes:** what fills each monetisation slot (affiliate / lead / subscription-nudge / featured / nothing).

**v1 — expected-value rules (implemented in `src/lib/revenue-router/`):**

```
score(candidate) = E[revenue | candidate, context] × rail_weight(rail)
choose argmax over candidates that clear the TRUST FLOOR (hard mask)
```

- `E[revenue]` for affiliate = `EPC` (learned earnings-per-click) or `payout_value × P(convert)`.
- `E[revenue]` for lead = lead value × P(operator wins) (from CRM outcomes).
- `rail_weight` lives in `vertical.router_policy.weights` (loop-tunable).
- **Trust floor** = hard constraints (`constraints.ts`): ranking integrity, affiliate relevance + disclosure, answer-first, consent, lead-needs-operator. A candidate failing any is masked out. **Showing nothing is a valid output.**

**v2 — contextual bandit (Thompson sampling): ✅ implemented (`bandit.ts`, `bandit-router.ts`).** One Beta-Bernoulli posterior per `(page_type × intent_stage × geo_tier)` **cell × arm** (`arm = rail:ref`). To pick: sample `θ ~ Beta(α,β)` per *eligible* arm and rank by `θ × expectedValue` — Thompson sampling for **revenue**, not just conversion rate. The trust floor remains a hard mask: `BanditRouter` overrides only `selectArm()`, which receives only the candidates the base class already cleared — so exploration happens strictly *inside* the floor (proven in `bandit.test.ts`). Cold-start arms use the uniform `Beta(1,1)` prior (pure exploration). The call site (`MonetisationSlot` → `useRouterDecision`) is unchanged.

- **Persistence:** `arm_stat` table (migration `0007`) holds the posteriors (public-read aggregates). `bandit-update` Edge Function bumps `Beta(α,β)` from `router_decision` impressions + matched `conversion` successes via the `bump_arm_stat` RPC.
- **Activation = config, not code:** set a vertical's `router_policy.policy_version` to `bandit-v2`. `useRouterDecision` then loads the cell's posteriors client-side *after* first paint and switches from the deterministic rules router to the bandit — so SSG/hydration markup is stable (no mismatch) and it degrades to rules on any failure. This honours "promote winners to config" + human-in-the-loop for routing.
- **Offline eval:** `thompsonSelect(..., "mean")` ranks by posterior-mean × EV with no exploration — used to backtest a policy change before activating it live.

**Every decision logged** to `router_decision` (context + all candidate scores + chosen + policy_version) → this is the bandit's training set and the audit trail.

---

## 4. Opportunity / Market-Entry model (profit-aware pSEO)

**Decision it changes:** which pages to build *and* which vertical×metro markets to enter.

```
opportunity = volume × intent_weight × competition_gap        (demand)
            × affiliate_rpm_potential                          (monetisable even with no supply)
            × supply_readiness                                 (enough confident data to be useful)
```

- Original plan scored keyword opportunity by demand only. v2 multiplies by **affiliate RPM potential** and **supply readiness**, turning page selection into a **profit-aware filter**.
- **Market-entry use:** aggregate opportunity across a vertical×metro → a single entry score. A market with high affiliate RPM potential can be entered and validated with **zero operators**, funded by the affiliate rail, *before* supply outreach. This is the strategist's market-entry filter the original lacked.
- Writes `keyword.opportunity_score`; queues `page` rows only above threshold AND with sufficient `page_readiness`.

---

## 5. Evaluation discipline (offline → online → promote)

```
 1. OFFLINE BACKTEST  replay change against historical sessions/conversions →
                      estimate Δ primary metric + Δ guardrail. Reject regressions here.
 2. ONLINE A/B        assign variants via experiment_assignment; run to min_exposure.
 3. DECISION          honest pass/fail on ONE primary metric; check guardrail;
                      significance (or labelled directional read at low volume).
 4. PROMOTE           winner → config default (so the engine improves without code);
                      retire loser; write decision_log (kept/killed/iterate + why).
```

**Statistical hygiene:** one primary metric per test; minimum exposure before calling; always check the guardrail; account for seasonality (gardening is seasonal — compare like periods); beware survivorship + novelty effects in the router.

---

## 6. Where each model lives in the repo / schema

| Model | Config | Code (now) | Persisted | Loop reads |
|---|---|---|---|---|
| Quality Score | `vertical.score_weights` | ✅ `src/lib/scoring/` (tested, Node) + `_shared/scoring.ts` (Deno) used by `etl-score` | `business.score_breakdown` | lead rate by score band |
| Page-readiness | thresholds in `page-readiness.ts` | ✅ `src/lib/scoring/page-readiness.ts` (tested) + `etl-score` | `page_readiness` | publish/hold + enrichment queue |
| Intent | keyword `intent`/`funnel` rules | ◻ rules in `router-candidates` (v1) | `session.intent_*` | stage→outcome |
| RevenueRouter | `vertical.router_policy` | ✅ `src/lib/revenue-router/` + `useRouterDecision` + `router-candidates` | `router_decision`, `touch`, `conversion` | `revenue_per_session` view (RPM) |
| Opportunity | thresholds in config | ✅ 🔁 `src/lib/scoring/opportunity.ts` (tested) + `tools/seo/` CLI + `etl-keywords` Edge fn | `keyword.opportunity_score` | indexed→clicks→RPM |

✅ = implemented in this scaffold. ETL (`etl-extract/normalise/resolve/score`) and affiliate/router Edge Functions are built; they gracefully no-op without live API keys so the pipeline can be exercised locally.

> **Two copies of the scoring math, by necessity:** the pure functions are duplicated in `src/lib/scoring/` (Node, unit-tested source of truth) and `supabase/functions/_shared/scoring.ts` (Deno, used by `etl-score`) because Node and Deno can't share module-aliased imports cleanly. A header comment in each flags the keep-in-sync requirement.
