# LocalLens — CRISP-DM Self-Improving Loop (v2, wired to the build)

> Builds on `CRISP-DM-Improvement-Loop-Playbook.md`. v2 adds a **fifth surface — monetisation routing** — and ties every loop to the **RPM ↔ qualified-actions** honesty constraint and the schema in this repo.

> **Build-status honesty.** This document describes the loop as it is *designed* to run. What exists today: the **attribution spine** (`event_log` / `router_decision` / `touch` / `conversion`), the **config-as-policy** surface (weights/thresholds/journeys live in config, tunable without code), the **rules-mode router + trust floor** (tested), and the **rubrics** in `supabase/functions/_shared/loop-rubrics.ts`. What is **specified but not yet learning from live data** (◻): the offline-backtest harness, the online A/B assignment, and the scheduled **improvement-agent** itself. The loop is an instrumented harness until there is traffic to optimise — it cannot bandit its way out of a cold start. Step one is real high-intent sessions on one page; the optimisation activates from there.

---

## The five surfaces (one engine, five loops)

| Loop | Problem | Lever (config variant) | Primary | Guardrail | Reads |
|---|---|---|---|---|---|
| Directory ranking | best business not surfaced | `score_weights` | qualified actions / 1k | data-accuracy | `business.score_breakdown`, `event_log` |
| pSEO + market entry | pages/markets with no profit | opportunity threshold × affiliate-RPM × supply | RPM / page type | thin-content / index rate | `keyword.opportunity_score`, GSC |
| Tool conversion | visitors don't act | tool layout, inputs, CTA, routing | completion % + downstream RPM | bounce / CWV | `event_log` |
| **Monetisation routing** (NEW) | sessions earn £0 / sub-optimally | `router_policy.weights` + arms | **RPM** | qualified actions + disclosure | `router_decision`, `conversion`, `revenue_per_session` |
| CRM comms | leads/money/follow-up leak | templates, journeys, send-times | quote→won, paid-on-time, review rate | unsubscribe / spam | `comm_log` |

---

## The cycle (per surface)

```
Business understanding → Data understanding → Data prep → Modelling/Build(variant)
        ▲                                                          │
        └── Deployment(promote to config) ← Evaluation(offline→A/B)┘
```

1. **Business understanding** — real problem + hypothesis: *"Because [evidence], if we [change], then [metric] moves [amount] for [segment], without [guardrail] breaching."*
2. **Data understanding** — profile `event_log` + outcomes before acting.
3. **Data prep** — segment (vertical × location × cohort × device), construct the metric (numerator/denominator/window/exclusions), ensure fair comparison.
4. **Modelling/Build** — implement as a **config variant** (`experiment.variants[].config_patch`), never a global code swap.
5. **Evaluation** — offline backtest → online A/B to `min_exposure` → honest pass/fail on ONE primary metric → check guardrail.
6. **Deployment** — promote winner to config default; retire loser; write `decision_log`.

---

## The improvement-agent (scheduled Edge Function, weekly) — ◻ specified, activates at volume

> Target behaviour once there is enough traffic to evaluate. Until then it is not scheduled.

```
read metrics per surface  →  score vs rubric  →
  auto-promote clear winners to config defaults (best template/weight/offer/send-time)
  pause clear losers (underperforming pSEO patterns, dead offers)
  write /admin/loop report: what changed, won/lost, next recommended experiments
  flag anomalies (index-rate collapse, RPM drop, affiliate disclosure miss)
  emit per-operator nudges from cohort benchmarks ("quote within 1h to win 3×")
```

**Human-in-the-loop:** the agent *proposes*; a human approves promotions on sensitive surfaces (ranking weights, router policy) until trust is earned, then autonomy widens.

---

## Constant verification (never-finished QA — both are release gates)

**Data** (scheduled → `data_check`): accuracy sampling vs source, freshness SLA, dedup integrity, completeness/page-readiness, provenance. Fail → lower `data_confidence`, can pull page to `noindex`, alert.

**UI** (per deploy + scheduled → `ui_snapshot`): screenshots across page-types × devices, visual-regression diff, "looks great?" rubric, CWV, WCAG 2.1 AA. Critical regression → **block release**; thin/ugly → fix or enrichment queue.

Both surface in `/admin/loop` so data quality and UI quality are always visible and converging.

---

## Seed experiment backlog (gardeners, one UK metro)

| # | Surface | Hypothesis (abridged) | Primary | Guardrail |
|---|---|---|---|---|
| 1 | comms | speed-to-lead auto-reply lifts lead→won | lead→won | unsubscribe |
| 2 | comms | 48h quote follow-up recovers undecided | quote→accepted | unsubscribe |
| 3 | comms | post-job review request raises reviews→score→leads | reviews/job | complaint |
| 4 | **routing** | affiliate in `inline-after-shortlist` on research-stage lifts RPM | **RPM** | qualified actions |
| 5 | **routing** | lead rail beats affiliate for `hire_now` w/ operators | RPM | qualified actions |
| 6 | pseo | answer-block + local stat lifts lead rate + citations | lead rate | thin-content |
| 7 | tool | pricing-calculator → "see top-rated" lifts completion→lead | completion→lead | bounce |
| 8 | **market** | metros with affiliate RPM > £X are worth supply outreach | conversion of outreach | — |

Run each through the full cycle; promote winners to config; log every outcome in `decision_log`.

---

*Build the problem, not the feature. Earn from the asset you already have. Optimise within a fixed trust floor. Measure honestly, in money and user value. Keep only what wins. Repeat.*
