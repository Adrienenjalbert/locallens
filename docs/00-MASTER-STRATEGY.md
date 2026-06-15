# LocalLens — Master Strategy & Architecture (v2)

**Author:** Adrien Enjalbert · **Status:** Build blueprint · **Supersedes-as-companion-to:** `PRD-Local-Directory-Engine.md`, `Lovable-Prompt-Plan.md`, `CRISP-DM-Improvement-Loop-Playbook.md`

> This document is the *stronger idea*. The original three docs describe an excellent two-sided **directory + CRM + AEO** engine. This blueprint keeps everything that was right and upgrades it into a **genuine affiliate + CRM + AEO machine** with one unifying thesis, a sharper data-science core, and a UI architecture designed around monetisation decisions — not just content.

---

## 1. The one-sentence thesis (what changed)

> **LocalLens is a local-intent engine that monetises a single, defensible data asset three ways off the same session — affiliate commission (instant), CRM subscription (recurring), and qualified lead-gen (high-value) — and treats "which money-maker to surface for this visitor, on this page, right now" as the central decision, designed from day one for a CRISP-DM loop to optimise as traffic accrues.**

> **Build-status honesty.** The decision engine (RevenueRouter, rules mode), the trust floor (enforced in code), the scoring, the schema, and the attribution spine are **built and tested**. The *self-improving* part — offline backtest → A/B → promote-to-config, then a contextual bandit — is **designed in and activates at volume**; with zero traffic the loop is an instrumented harness, not yet a learner. This document describes the target engine; see each section's status markers and `01-DATA-SCIENCE.md` §6 for what is ✅ vs ◻.

The original plan had **two** money engines (CRM subscriptions + featured listings) and a thin "referral hook." The fatal gap: a directory's biggest asset — **high-intent organic traffic** — was only monetised when a visitor became a lead for a *claimed* operator. Most early traffic hits unclaimed listings and earns **£0**. 

The fix is a **third, always-on revenue rail**: outbound **affiliate monetisation**. Every high-intent page (and every tool result) can earn from day one — before a single operator subscribes — by routing intent to relevant third-party partners (insurance, supplies, comparison, booking, finance, materials). This funds the data moat and de-risks the cold-start.

### The three rails (one data asset, three ways to earn)

| Rail | Earns when | Latency to first £ | Who pays | Owner |
|---|---|---|---|---|
| **Affiliate** (NEW first-class) | A visitor clicks/converts on a partner offer | **Day one** (no supply needed) | 3rd-party partners (CPC/CPL/CPA) | `RevenueRouter` + `affiliate_*` schema |
| **CRM subscription** | A claimed operator pays monthly | Weeks (needs supply) | Operators | CRM + `subscription` |
| **Lead-gen** | A qualified lead is delivered/sold | Weeks (needs supply + demand) | Operators (CPL/rev-share) | Leads inbox + `lead_ledger` |

The strategic unlock: **the affiliate rail subsidises customer acquisition for the other two.** We can run profitable directories in verticals/areas where we have *zero* operators yet, using affiliate revenue, and let that traffic + revenue *prove demand* before we ever do supply outreach.

---

## 2. The unifying mental model: the RevenueRouter

Every page view is a **decision**: given who this visitor likely is (intent, geo, device, query class, funnel stage) and what inventory we have (claimed operators? affiliate partners? a sellable lead slot?), **what is the expected-value-maximising thing to surface?**

```
                       ┌─────────────────────────────────────────────┐
   Visitor + context ──►            RevenueRouter (policy)            │
   (intent, geo,       │  argmax over actions of  E[revenue | ctx]    │
    device, page,      │   actions = {show operator CTA,              │
    funnel stage)      │              show affiliate offer,           │
                       │              capture lead, push CRM tool,    │
                       │              do nothing / pure-value}        │
                       └───────────────┬─────────────────────────────┘
                                       │  emits decision + variant to event_log
                                       ▼
        ┌──────────── CRISP-DM loop reads outcomes, updates the policy ───────────┐
        │  (contextual bandit / rules-with-guardrails; promotes winners to config)│
        └─────────────────────────────────────────────────────────────────────────┘
```

This is the single most important architectural idea in v2. Instead of hard-coding "this page shows operators, that page shows an affiliate banner," **placement is a policy** that the loop optimises. It starts as transparent **rules + config weights** (explainable, safe), and graduates to a **contextual bandit** once we have volume — without changing the page code, because pages ask the router *"what should I show in this slot?"* and log the outcome.

**Guardrail (non-negotiable, and a moat):** the router is **trust-bounded**. It may never (a) bury the genuinely-best operator to push a paid placement, (b) show an affiliate offer that isn't relevant + clearly labelled, or (c) degrade the answer-first user value. Trust is the product; the router optimises revenue *within* a fixed user-value floor (see §6). This is enforced in code, not policy prose.

---

## 3. The flywheel (now with three intertwined loops)

```
        AFFILIATE REVENUE (day one, no supply)
                 │  funds data + content + pSEO
                 ▼
  Accurate data → beautiful AEO pages → organic + AI-cited traffic
                 │                                  │
                 │ proves demand per area/vertical  │ high-intent sessions
                 ▼                                  ▼
   PROOF-LED OUTREACH ("X leads + £Y affiliate    RevenueRouter monetises
    near you")  ─────────────────────────────►    every session 3 ways
                 │                                  │
                 ▼                                  ▼
        OPERATORS CLAIM + SUBSCRIBE (CRM)   LEADS captured + (optionally) sold
                 │                                  │
                 ▼                                  │
   CRM drives completed jobs → REVIEW REQUESTS ─────┘
                 │
                 ▼
        Fresher reviews → higher Quality Score → better ranking →
        more traffic → (back to top)  + richer data → better affiliate match
```

Three compounding loops share one data asset:
1. **Content loop** (AEO): data → pages → citations → traffic. *(from original PRD)*
2. **Supply loop** (CRM): leads → claim → subscribe → jobs → reviews → ranking. *(from original PRD)*
3. **Revenue loop** (NEW): every session → RevenueRouter → affiliate/lead/CRM-nudge → outcomes → better routing. *(the unifier)*

Each loop *feeds the others*: affiliate revenue funds content; content creates leads that drive supply; supply creates reviews that improve ranking and therefore affiliate match quality and traffic.

---

## 4. What's genuinely stronger than the original plan

| # | Upgrade | Why it matters |
|---|---|---|
| 1 | **Affiliate as a first-class rail** with placement engine, attribution, partner catalogue, and its own CRISP-DM loop | Monetises day-one traffic; subsidises CAC; de-risks cold-start; works in zero-supply areas |
| 2 | **RevenueRouter policy** abstracts every monetisation slot | Placement becomes *optimised*, not hard-coded; one mechanism, three rails; safe→smart upgrade path |
| 3 | **Intent classification** of every session (query class × funnel stage) | The router needs to know "is this a hire-now searcher or a research-stage browser?" to choose affiliate vs lead vs CRM |
| 4 | **Trust floor enforced in code** (user-value guardrail) | Makes the "honest ranking" promise structural, not aspirational — and it's the moat |
| 5 | **Unified attribution spine** (`touch` → `conversion` across all rails) | One ledger answers "what did this session earn, across affiliate + lead + subscription?" — essential for the loop |
| 6 | **Marginal-revenue-per-1k-sessions (RPM)** as the directory North Star alongside qualified actions | Aligns the loop with money, not just activity; lets us compare pages/verticals fairly |
| 7 | **Config-as-policy**: weights, thresholds, rubrics, *and routing policy* all live in versioned config | The loop improves the engine by editing config, not code (original principle, now extended to monetisation) |
| 8 | **Offline + online evaluation split** for the data-science layer | Score/router changes are backtested offline before they touch live traffic — prevents revenue regressions |
| 9 | **Affiliate-aware page-readiness** | A page with no operators *and* no relevant affiliate offer is genuinely thin → hold; one with a great affiliate match is publishable | 
| 10 | **Compliance baked into schema** (FTC/ASA affiliate disclosure, nofollow/sponsored rel, consent state) | Affiliate done wrong is a trust + legal landmine; we make disclosure + rel attributes data-driven and unskippable |

---

## 5. Strategist's view — sequencing for compounding (the order is the strategy)

The original "prove the demand loop first (0–8)" is right but leaves money on the table for months. v2 re-sequences so **revenue starts in week one** and each phase is *self-funding*:

**Stage 0 — Asset + Affiliate (weeks 1–4): "earn before you have operators."**
Stand up data spine + core pages + the **affiliate rail + RevenueRouter (rules mode)**. Outcome: a live directory in one vertical/metro that earns affiliate RPM from organic traffic with **zero operators**. This proves intent value and funds the rest.

**Stage 1 — Supply + CRM (weeks 4–10): "turn proven demand into operators."**
Use the affiliate-proven traffic + captured-lead data as the proof for outreach. Claim flow → CRM → journeys. Now sessions can also route to operators/leads.

**Stage 2 — Loop + scale (weeks 8+): "let it optimise itself."**
Stand up event spine, experiments, and the improvement-agent. Promote RevenueRouter from rules → contextual bandit. Scale pSEO on demand-proven patterns. Prove a 2nd vertical from config.

**Why this order wins:** revenue (affiliate) is decoupled from the slowest input (supply). We never sit in a zero-revenue valley. Each vertical/metro can be **financially validated by affiliate RPM before we invest in supply** — a data-driven market-entry filter the original plan lacked.

---

## 6. The trust floor (the guardrail that makes the router safe)

The RevenueRouter optimises `E[revenue]` **subject to** hard constraints. They live in two precise places (and the doc is explicit about which, because the guarantee being *structural* is the whole point):

**Router-enforced** (`src/lib/revenue-router/constraints.ts`, checked on every decision, unit-tested):
1. **Ranking integrity:** a paid/featured unit can never fill an organic-list slot (so it can never reorder the honest Quality-Score ranking, even at higher EV), and featured units in dedicated slots are capped above the fold (e.g. ≤1).
2. **Affiliate relevance:** an affiliate candidate is masked unless `relevance ≥ threshold` for the page's intent.
3. **Answer-first floor:** no monetisation unit is selected before the answer/shortlist has rendered.
4. **Consent + privacy:** affiliate is masked without marketing consent (UK GDPR/PECR); the router falls back to non-affiliate.
5. **Operator-backed leads:** the lead rail is masked unless a claimed operator can actually receive the lead.

**Render/content-enforced** (`src/components/monetisation/`, applied where the unit is drawn): mandatory disclosure copy ("Ad / Partner — we may earn a commission", FTC/UK ASA), `rel="sponsored nofollow"`, visual separation from organic results, and **no fabrication** — affiliate copy is real/partner-supplied; AI only labels and summarises.

A decision that violates any router constraint is rejected and logged. **The loop can only explore inside the trust floor.** This is what lets us be aggressive on revenue without becoming spam.

---

## 7. Data-science core (sharper than v1)

Four models, each owned by a CRISP-DM loop, each **explainable and config-driven**:

1. **Quality Score** (ranking) — unchanged in spirit (Bayesian review adjustment, portfolio, verification, completeness, data-confidence; anti-gaming) but now **versioned** and **offline-backtested**: a weight change is replayed against historical sessions to estimate lead-rate impact *before* going live.
2. **Intent Classifier** (NEW) — maps `{query pattern, page type, referrer, on-page behaviour}` → `{funnel stage: research | compare | hire-now}` × `{commercial value}`. Drives the router. v1 = transparent rules from keyword `intent` + page type; v2 = a learned model on `event_log`.
3. **RevenueRouter Policy** (NEW) — chooses the slot fill per context. v1 = expected-value rules with config weights + guardrails; v2 = contextual bandit (Thompson sampling) per `(page_type × intent × geo-tier)` cell, with the trust floor as a hard mask.
4. **Opportunity / Market model** — `keyword opportunity` (volume × intent × competition gap) **× affiliate-RPM potential × supply-density** → which pages to build *and* which markets to enter. This is the original pSEO selection, upgraded to a **profit-aware market-entry score**.

**Shared discipline (CRISP-DM, applied to models):** one primary metric per experiment, a guardrail metric, minimum exposure before calling it, offline backtest → online A/B → promote-to-config. Every model output is **stored with its inputs** (`*_breakdown`) so any score/decision is auditable — for trust *and* for the loop.

### The directory North Star, restated for money
- **Primary:** **Revenue per 1,000 sessions (RPM)** = affiliate RPM + lead RPM + attributed subscription value, per page type × vertical × geo.
- **Co-primary (trust):** Qualified actions per 1k sessions (the user-value metric — must not fall when RPM rises; this is the guardrail relationship that keeps us honest).

---

## 8. UI / UX architecture (designed around the decision, not just content)

Beautiful + useful *and* monetisation-aware. The component library from the original Prompt 1 stands, plus:

- **Slot-based page layout.** Pages declare **named monetisation slots** (`hero-cta`, `inline-after-shortlist`, `sidebar`, `tool-result-cta`, `sticky-mobile`). Each slot is filled by `RevenueRouter.decide(slot, context)`, returning either an operator CTA, an affiliate unit, a lead capture, or nothing. The page never hard-codes what fills a slot.
- **`<MonetisationSlot/>`** component: asks the router, renders the chosen unit, enforces the trust-floor visuals (labels, rel attributes), and fires a `slot_decision` + `slot_impression` event. One component, fully optimisable.
- **`<AffiliateUnit/>`**: relevance-gated, labelled, accessible, with provenance ("Partner offer — we may earn a commission"). Never styled to look like an organic result.
- **Answer-first, always.** Trust floor #3 is enforced by layout: `<AnswerBlock/>` → `<Shortlist/>` → only then any `<MonetisationSlot/>`.
- **Operator UI unchanged** (mobile-first CRM lifecycle) but now shows, alongside leads, an **"earnings near you" honesty panel** so operators see the directory is a live demand engine (and a reason to subscribe).
- **`/admin/loop`** becomes a true control tower: per-surface metrics, the live router policy, affiliate RPM, running experiments, data + UI verification, and the decision log — one screen to run the machine.

---

## 9. How the loop now runs four surfaces (was: four; the 4th is upgraded)

| Loop | Business problem | Lever (variant, in config) | Primary metric | Guardrail |
|---|---|---|---|---|
| Directory ranking | Best business not surfaced | Quality Score weights | Qualified actions / 1k | Data-accuracy |
| pSEO + market entry | Pages/markets with no profit | Opportunity threshold × affiliate-RPM × supply | RPM per page type | Thin-content / index rate |
| Tool conversion | Visitors don't act | Tool layout, inputs, CTA, result routing | Completion % + downstream RPM | Bounce / CWV |
| **Monetisation routing (NEW)** | Sessions earn £0 / earn sub-optimally | RevenueRouter policy weights & arms | **RPM** | Qualified actions (must not fall) + disclosure compliance |
| CRM comms | Leads/money/follow-up leak | Templates, journeys, send-times | Quote→won, paid-on-time, review rate | Unsubscribe / spam |

---

## 10. Compliance & risk (affiliate-specific, added to PRD §15)

| Risk | Mitigation (data-driven, in-schema) |
|---|---|
| Undisclosed affiliate (FTC/UK ASA breach) | Mandatory disclosure component; `affiliate_offer.disclosure_required=true` blocks render without it; `rel="sponsored nofollow"` enforced |
| Affiliate links seen as paid links by Google | All affiliate links `rel="sponsored nofollow"`; affiliate units are not in main content's editorial links; clear ad labelling |
| Irrelevant/spammy offers erode trust | `relevance_score` gate + the trust floor; router can show *nothing* (and often should) |
| Cookie/consent (PECR/GDPR) | Consent-aware router; affiliate/tracking only on consent; postback/server-side attribution preferred over cookies |
| Partner link rot / dead offers | `affiliate_offer.status` health checks in the verification loop; dead offers auto-paused |
| Revenue optimisation degrades UX | RPM co-primary with qualified actions; guardrail blocks promotions that drop user value |
| Operator perceives pay-to-rank | Ranking integrity guarantee (trust floor #1) + transparent `/methodology`; featured slots labelled + capped |

---

## 11. Mapping to the build (see `docs/04-BUILD-PROMPT-PLAN.md`)

- Original Prompts 0–12 (directory + tools + supply) and 13–23 (CRM + loop + GTM) are **kept** and refined.
- **New prompts** inserted: **Affiliate rail + partner catalogue**, **RevenueRouter + MonetisationSlot**, **Intent classifier**, **Attribution spine + RPM**, and **affiliate compliance**. They slot into **Stage 0** so revenue starts early.
- The re-sequencing (§5) is reflected in the dependency graph in the build plan.

---

*Principles, unchanged and reinforced: Build the problem, not the feature. Earn from the asset you already have. Optimise within a fixed trust floor. Measure honestly, in money and in user value. Keep only what wins. Repeat.*
