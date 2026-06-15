# LocalLens — Affiliate Engine (the third revenue rail)

The pillar that turns the directory into a **machine that earns from day one**, before any operator subscribes. Outbound affiliate monetisation: route high-intent traffic to relevant third-party partners (insurance, supplies, comparison, booking, finance, materials) and earn CPC/CPL/CPA — *within the trust floor*.

---

## 1. Why this is the strategic unlock

A directory's most valuable asset is **high-intent organic traffic**. In the original plan it was monetised only when a visitor became a lead for a *claimed* operator — so most early traffic earned **£0**. The affiliate rail monetises that same traffic immediately and:

1. **Funds the data moat** (ETL, content, pSEO) before subscription revenue exists.
2. **De-risks cold-start** — profitable directories in zero-operator markets.
3. **Becomes a market-entry filter** — affiliate RPM proves a market is worth supply investment.
4. **Subsidises CAC** for the CRM/lead rails.

---

## 2. Data model (see `supabase/migrations/0003_affiliate_revenue.sql`)

```
affiliate_partner ─< affiliate_offer ─< affiliate_placement
                                   │
session ─< router_decision ─< touch ─< conversion        (unified attribution spine)
```

- **`affiliate_partner`** — a network (Awin/Impact/CJ/PartnerStack) or direct merchant. Credentials referenced, never stored in plaintext; real secrets live in Edge-function secrets.
- **`affiliate_offer`** — a monetisable unit with targeting (`vertical_ids`, `funnel_targets`, `geo_scope`, `keywords`), economics (`payout_model`, `payout_value`, learned `epc`), trust metadata (`disclosure_required`, `rel_attribute`), and health (`status`, `last_health_check_at`).
- **`affiliate_placement`** — which slots/page-types an offer may compete for, with a `cap_per_page`.
- **Attribution spine** (`session → router_decision → touch → conversion`) — shared by *all* rails so one query yields RPM across affiliate + lead + subscription.

---

## 3. How an offer reaches the page (the safe path)

```
 1. CANDIDATE BUILD (server/SSR or edge): for the page's slot, find active offers whose
    targeting matches (vertical, funnel stage, geo, keyword relevance). Compute relevance_score
    and E[revenue]=EPC. Build Candidate[] for the RevenueRouter.
 2. ROUTE: RevenueRouter.decide(slot, ctx, candidates) → picks the EV-max candidate that
    clears the TRUST FLOOR (relevance ≥ floor, disclosure, answer-first, consent). May pick nothing.
 3. RENDER: <MonetisationSlot/> renders <AffiliateUnit/> — labelled "Partner offer",
    rel="sponsored nofollow", disclosure copy. Logs slot_decision + impression (touch).
 4. CLICK → server resolve: link points at /r/:offerId (our endpoint), NOT a raw affiliate URL.
    The endpoint mints a subid, records a `touch` (kind=click), and 302-redirects to the partner
    deep-link with the subid. Keeps affiliate URLs out of page source + enables postback matching.
 5. POSTBACK → conversion: partner postback (server-to-server) hits /webhooks/affiliate/:network,
    is verified, matched by subid, and written to `conversion` (status pending→approved→paid).
```

**Why server-side click resolution + postbacks:** cleaner attribution (not cookie-dependent → PECR-friendly), affiliate URLs not exposed/scrapable, and we can pause dead offers instantly.

---

## 4. The trust floor (enforced in code, not policy prose)

Enforced in **two places**, and this doc is precise about which is which:

**Router-level** (`src/lib/revenue-router/constraints.ts`, unit-tested) — a candidate failing any is masked out of the decision:

| # | Constraint | Effect |
|---|---|---|
| 1a | Ranking integrity (no reorder) | a featured/paid unit can never fill an organic-list slot, so it can never reorder the honest operator ranking — even at higher EV |
| 1b | Ranking integrity (cap) | featured units in dedicated slots are capped above the fold (`max_featured_above_fold`) |
| 2 | Affiliate relevance | `relevance ≥ vertical.router_policy.trust_floor.affiliate_relevance_min`; below-floor offers are masked |
| 3 | Answer-first | no unit before the answer/shortlist renders |
| 4 | Consent | affiliate only with marketing consent (PECR/GDPR); else the router falls back to non-affiliate |

**Render-level** (`src/components/monetisation/AffiliateUnit.tsx`) — presentation guarantees applied where the unit is drawn:

| Guarantee | Effect |
|---|---|
| Disclosure | mandatory "Partner offer / we may earn a commission" copy when `disclosureRequired` |
| rel attribute | `rel="sponsored nofollow"` always (Google paid-link policy) |
| Editorial separation | visually distinct, labelled, never styled as an organic listing |

The router constraints are **unit-tested** (`router.test.ts`), including a test that a high-EV featured unit is still masked out of the organic list. The loop can only explore inside the floor.

---

## 5. Compliance checklist (UK + FTC)

- **Disclosure** (ASA/CAP + FTC): every affiliate unit carries clear "Partner offer / we may earn a commission" copy; `disclosure_required=true` blocks render without it.
- **rel attributes:** `sponsored nofollow` on all affiliate links.
- **Consent (PECR/UK GDPR):** no affiliate cookies/tracking without consent; prefer server-side subid attribution.
- **Editorial separation:** affiliate units are visually distinct, never inside the editorial operator list, never styled as organic.
- **Link health:** the verification loop health-checks offers; `status='dead'` auto-pauses them (no broken/expired offers shown).

---

## 6. Economics & optimisation

- **EPC learned per offer** from `touch` (clicks) ÷ `conversion` (£). Seeds `payout_value` until enough data.
- **RPM is the unit of comparison** across pages/verticals (the `revenue_per_session` view).
- The **affiliate routing loop** (CRISP-DM): experiment on offer selection, placement, copy, and `router_policy.weights`; primary metric = RPM; guardrail = qualified actions + disclosure compliance; promote winners to config.
- **Affiliate-aware page-readiness:** a low-supply page with a strong affiliate match (`page_readiness.affiliate_match=true`) can be publishable — it still delivers value + earns — whereas a page with neither operators nor a relevant offer is genuinely thin → hold.

---

## 7. What's built vs specified

| Piece | State |
|---|---|
| Schema (partner/offer/placement + attribution spine + RPM view) | ✅ migration `0003` |
| RevenueRouter + trust-floor constraints + tests | ✅ `src/lib/revenue-router/` |
| `<AffiliateUnit/>` + `<MonetisationSlot/>` (labelled, rel-correct, accessible) | ✅ `src/components/monetisation/` |
| Seed offers (gardeners) | ✅ `supabase/seed.sql` |
| Click-resolution Edge fn + postback webhook | ✅ `supabase/functions/affiliate-redirect`, `affiliate-postback` (set network secrets to go live) |
| Candidate-build (relevance + EPC) Edge fn + client helper | ✅ `supabase/functions/router-candidates` + `src/lib/revenue-router/fetch-candidates.ts` |
| Affiliate routing CRISP-DM experiments | ◻ wired via `experiment` schema |

> **Static-host note:** the front end is GitHub Pages (no server), so affiliate units link to the `affiliate-redirect` Edge Function rather than a Next route. This is why click-resolution lives in Supabase, not the app.
