# Business Plan — UK Go-To-Market: "Reviews on Autopilot" for Gardeners

**Author:** Adrien Enjalbert · **Status:** Strategy + GTM blueprint (UK-first) · **Companion to:** `00-MASTER-STRATEGY.md` (LocalLens), `01-BUSINESS-PLAN-ITALY-GTM.md`

> **How this fits LocalLens.** This is the **UK-first market entry** for the LocalLens engine, focused on a single vertical — **gardeners/landscapers in one metro** — entered through a **pure-software, low-run-cost, low-fee** product, not a managed service. The wedge is **review collection + reputation automation**: the one pain every gardener has, that costs us almost nothing to deliver, and that **directly feeds the LocalLens flywheel** (more/fresher reviews → higher Quality Score → better ranking → more high-intent traffic → more affiliate + lead revenue). Managed ads were considered and **rejected as the wedge** (see §9): they need our cash, our time, and per-client ad budget — the opposite of a scalable entry.

---

## 1. Executive summary

- **Offer:** **"Reviews on Autopilot"** — a £9–£15/mo app that gets a gardener more (and fresher) Google reviews with zero effort: finish a job → one tap → the customer gets a friendly review request by SMS/WhatsApp → reviews flow in, are monitored, and get AI-drafted replies.
- **Why this wedge:** Reviews are the **#1 driver of local-pack ranking and buyer trust**, the pain is **universal and frequent**, and almost no sole-trader gardener has a system for it. It is **buildable with our existing stack** (CRM, journeys engine, Quality Score review signal) and has **near-zero marginal cost** (a few messages + DB rows per client).
- **Cost structure (the whole point):** **~£1–£3 per client per month** to run (messaging + infra). No ad spend, no labour-per-client. That margin is what lets us charge a **low, honest fee** and still profit from client #1 — and scale to thousands without hiring.
- **Pricing (indicative):** **Free** (collect reviews manually, see the leads waiting) · **Pro £12/mo** (automation, monitoring, AI replies, unlimited sends) · **Growth £29/mo** (multi-channel, priority placement in the directory, lead boosts). Validate willingness-to-pay in the loop.
- **The flywheel tie-in:** every review collected makes the operator's LocalLens directory page stronger, which lifts organic traffic, which the RevenueRouter monetises three ways. **The wedge product and the engine compound each other** — this is why reviews beat ads as the entry.
- **Why now:** UK trades are sick of paying Checkatrade/Bark £80–£170/mo to share leads with rivals. A £12/mo tool that demonstrably wins them more *direct* work via reviews is an easy yes, with a price that needs no procurement decision.

---

## 2. The market (evidence-backed)

### 2.1 The pain today
- **Shared-lead platforms** are the incumbent spend and the incumbent grievance: Checkatrade ~£80–£170/mo just to be listed; MyBuilder/Bark/Rated People charge **£5–£45 per lead, shared with 3–5 competitors**, converting at only **15–25%**. *(seoforthetrade, digitaltradies 2026.)*
- **Reviews are the under-served lever.** Local-pack ranking and conversion are driven heavily by review **count, rating, velocity, and recency** — yet most sole-trader gardeners collect reviews ad hoc or not at all. They know reviews matter; they have no system.

### 2.2 Why reviews, specifically, for gardeners
- Gardening is **high-frequency, repeat, visual, and reputation-led** — a happy customer at the end of a job is the perfect, recurring moment to ask for a review.
- Review **velocity** (e.g. 15+ new reviews / 90 days) matters more than lifetime total for ranking — and velocity is exactly what an automation tool manufactures.
- Fresh reviews are a **direct input to the LocalLens Quality Score** (`review_quality` includes recency decay + volume credit), so the product's output is the engine's fuel.

### 2.3 Pricing anchors (what they already pay)
- Jobber (software only): ~£23–£199/mo. Checkatrade: ~£120/mo for a *listing only*. Dedicated reputation tools (Birdeye/Podium-class) are priced for mid-market, **not** a one-van gardener.
- **Implication:** a focused **£12/mo** reviews tool sits *below the threshold where a sole trader deliberates* — and is a fraction of what they waste on shared leads. We win on simplicity + price, not features.

---

## 3. The offer & model

### 3.1 The decisive design rule (vs the rejected managed-ads model)
Everything in the package must be **scalable software with near-zero marginal cost**. No managed ads, no done-for-you services in the entry tiers, no ad-spend pass-through. The fee is for software the gardener self-serves. This keeps run cost at ~£1–£3/client/mo and the fee low and honest.

### 3.2 What the product actually does (easy + extremely useful)
1. **One-tap review request.** After a job (or from the CRM job record), send a templated SMS/WhatsApp asking for a Google review, with the direct review link. Sector-tuned, friendly, in the gardener's name.
2. **Smart timing + follow-up.** A journey (already in the engine — `journey-engine` / `_shared/journeys.ts`) sends the ask at the right moment and one gentle nudge if no review lands.
3. **Review monitoring.** New Google reviews surface in the dashboard with rating + text.
4. **AI reply drafts.** Paste/auto-pull a review → get 3 on-brand reply drafts (especially valuable for the awkward negative ones).
5. **A "reputation score" + what-to-do.** A simple 0–100 readout (count, rating, response rate, velocity vs local peers) with the single next action. Doubles as the **free public audit tool** that acquires users (see §5).

> Everything above is **automation around an existing, painful, recurring moment**. No new behaviour to learn; the gardener taps one button.

### 3.3 Tiers

| Tier | Includes | Cost structure | For | Indicative price |
|---|---|---|---|---|
| **Free** | Directory listing, manual review-link generator, see the leads/reviews waiting, reputation score | Near-zero | Funnel entry; every gardener | **£0** |
| **Pro** (core) | Automated review requests + follow-ups, monitoring, **AI reply drafts**, light CRM (customers/jobs), unlimited sends | Software only, ~£1–£3/client/mo to run | The sole-trader gardener | **£12/mo** |
| **Growth** | Above + multi-channel (WhatsApp + SMS + email), **priority placement in the directory + lead boosts**, review-widget for own site | Software only | Established / multi-van | **£29/mo** |

### 3.4 Positioning / message
> "Get more 5-star Google reviews without lifting a finger. Finish a job, tap once, and we ask your customer for a review — and reply to it for you. £12/mo, no contract. The reviews make you rank higher and win more *direct* work, so you can stop renting shared leads from Checkatrade and Bark."

Optional differentiator borrowed from the original plan: **one featured gardener per town** in the directory (Growth tier) — protects perceived exclusivity without any rank-and-rent dishonesty (the organic order stays Quality-Score-true; see trust floor).

---

## 4. Replication template (productise once, sell many)

1. **Reviews "Setup Kit"** (defaults shipped in config, not rebuilt per client):
   - Sector-tuned review-request copy (SMS / WhatsApp / email) for gardening.
   - Default journey timing (ask + one nudge) — already expressible in `journeys.ts`.
   - Google review deep-link + QR/branded card generator.
   - AI reply prompt templates per review sentiment.
   - The reputation-score rubric (reused as the public audit tool).
2. **Build the proof asset:** instrument **reviews-collected/mo, rating delta, and review velocity vs local peers** for the first few gardeners. "We added 14 reviews in 60 days and moved them into the local 3-pack" is the single most persuasive sales line for the next gardener.
3. **Replicate by gardener, many per town** (the entry tier is *not* exclusive — exclusivity is only a Growth-tier featured slot). Reviews automation does not cannibalise between clients, so density is good (more directory data → stronger pages).
4. **Feed LocalLens:** this vertical is the first live instance of the flywheel (reviews → Quality Score → ranking → organic traffic → affiliate/lead rails). No ad dependency anywhere.

---

## 5. Acquisition: the free audit tool + pSEO (same engine as Italy plan)

- **Hero free tool:** **"Free Gardener Reputation Check"** — enter a business, get a 0–100 score (reviews, rating, response rate, velocity vs local competitors via Places API) + the one next action. This is the HubSpot-Website-Grader analogue and the top of the funnel. Maps to the existing `src/app/tools/[tool]` surface and the "Tool conversion" loop.
- **Programmatic SEO:** `Gardeners in [town]` / `garden maintenance [town]` directory pages, each carrying **live local data** (top-rated gardeners + their review stats) so they are never thin. These pages *also* earn affiliate RPM from day one (per Master Strategy) and capture leads — funding acquisition before the gardener even signs up.
- **Funnel:** `tool/directory page → free reputation check → sign up free → automate (Pro £12) → Growth £29`. Benchmarks to instrument: tool→signup 3–8%, free→paid 10–25%, organic CAC well under £50 (no ad spend).

---

## 6. Unit economics (illustrative — validate with real numbers)

- **Run cost per Pro client:** ~£1–£3/mo (a handful of SMS/WhatsApp segments + Supabase rows). Email-only is sub-£1.
- **Gross margin at £12/mo:** ~75–90% from client #1. No per-client labour, no ad spend to absorb.
- **No cash outlay to acquire delivery capacity** — the opposite of managed ads, where every client needs budget + your hours. This is why the wedge is *low barrier for us* as well as for them.
- **Targets to instrument from client #1:** reviews collected/mo, rating + velocity delta, free→paid conversion, churn, messages sent/client (the only variable cost), tier mix.

---

## 7. Sequencing (UK-first)

- **Phase 0 — Build the wedge (wks 1–4):** ship the free reputation-check tool + the Pro review-automation flow on the existing CRM/journeys spine. Wire SMS/WhatsApp/email sends. Instrument reviews + velocity.
- **Phase 1 — Land the first 5–10 gardeners (wks 4–10):** self-serve free tier + £12 Pro. Use early review-velocity results as the proof asset. Delivery is fully automated; "sales" is the free audit + a short message.
- **Phase 2 — pSEO + directory at scale (mo 3–6):** scale `Gardeners in [town]` pages with live data; turn on affiliate rail on those pages (day-one RPM with zero operators in new towns).
- **Phase 3 — Engine + expand (mo 6+):** wire the full LocalLens loops (reviews → ranking → traffic → affiliate/lead rails); add Growth-tier lead boosts; expand to adjacent verticals from config (the engine's whole promise).

---

## 8. Risks & mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| £12/mo feels too cheap to be valued | Trades can dismiss cheap tools | Lead with the **free audit + visible review velocity**; the result (more reviews, higher rank) is the value, shown in a monthly one-line report |
| Messaging deliverability / spam | SMS/WhatsApp rules, opt-out | Consent-aware sends (already in the trust model); WhatsApp templates; honour opt-out; prefer post-job moments the customer expects |
| Google review-link / API changes | Product depends on Google surfaces | Use stable review deep-links; degrade gracefully; own the CRM/reputation data layer, not just the Google hook |
| Low lock-in of a reviews-only tool | Easy to churn | Reviews = wedge; the **light CRM (customers/jobs)** and accumulated review history create switching cost; expand to quotes/booking |
| Thin marginal value if a gardener is dormant | Seasonal trade | Seasonal journeys; off-season = monitoring + reply drafts; pause-friendly billing |
| Affiliate/monetisation trust risk (when rails added) | Could erode trust | Enforce LocalLens trust floor in code (relevance gate, disclosure, answer-first, ranking integrity) |

---

## 9. Why NOT managed ads (the rejected wedge — recorded on purpose)

Managed Google/local ads were the obvious "fast cash" path and were **deliberately rejected as the entry wedge**:

| Dimension | Managed ads (rejected) | Reviews on Autopilot (chosen) |
|---|---|---|
| Our cash needed | High — ad budget + tooling per client | ~£0 |
| Our time per client | High — campaign setup + ongoing management | ~0 (fully automated) |
| Marginal cost | Labour + ad spend per client | ~£1–£3/mo messaging |
| Scalability | Caps at our hours | Scales to thousands unattended |
| Price we can charge | High (£199–£349 + ad spend) — small market | Low (£12) — huge, frictionless market |
| Barrier for the customer | Needs a real ad budget | A £12 no-brainer |
| Feeds the LocalLens flywheel? | Indirectly | **Directly** (reviews → Quality Score → ranking) |

Managed ads can return **later, as an optional Growth add-on** for established operators who ask for it — priced as a service with transparent ad-spend pass-through — but it is **not** the wedge. The wedge must be low-cost for us *and* for them.

---

## 10. Open decisions to lock next

1. **First messaging channel:** SMS, WhatsApp, or email first? (Email is cheapest/simplest to ship; WhatsApp converts best in the UK trades.)
2. **Metro + town list** for the first directory + pSEO pages (Thorburn's area is a natural seed for the live design-partner data).
3. **Free→Pro gate:** exactly which automation sits behind the £12 wall (recommended: manual review-link free; *automated* requests + AI replies paid).
4. **Billing:** Stripe tiers (already scaffolded in `stripe-checkout` / `stripe-webhook`) wired to `config/plans.ts`.

**Suggested next deliverables:** (a) the reputation-score rubric + free-tool spec; (b) the gardening review-request + AI-reply copy pack; (c) the journey timing defaults in `journeys.ts`; (d) a financial model (free signups → Pro conversion → MRR at ~£1–£3 run cost).

---

*Aligned principles (LocalLens): Build the problem, not the feature. Earn from the asset you already have. Optimise within a fixed trust floor. Customers own their asset — trust is the product. Measure honestly, in money and in user value (reviews collected, velocity, rank). Keep only what wins.*
