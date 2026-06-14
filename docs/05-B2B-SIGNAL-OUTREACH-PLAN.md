# 05 — B2B Signal-to-Lead Engine (UK Gardeners) — Reflection, Disagreement & Plan

**Author input:** Adrien · **Scope:** UK first, gardeners, B2B (contact the *operators*), optimise for fastest revenue/validation
**Status:** Strategic plan + build spec · **Relation to repo:** extends `00-MASTER-STRATEGY.md`; re-sequences it for a faster wedge.

> TL;DR — The repo (LocalLens) is a genuinely strong B2C affiliate-first directory engine. But you don't want a directory yet — you want to *extract businesses that show buying signals and sell to them now*. That is a different, faster, cash-first motion. This document keeps the repo's best assets (the Supabase spine, entity resolution, scoring discipline, the CRISP-DM loop) and points them at a **B2B signal-based outbound machine**. Affiliate/directory becomes Phase 2, funded by Phase-1 cash. The single biggest constraint that shapes everything below: **most UK gardeners are sole traders, who UK PECR treats as individuals — so cold email is legally restricted and the channel mix must lead with phone (TPS-screened) and other consented routes.**

---

## 1. What the repo actually is (reflection)

LocalLens is well-designed. The parts worth keeping verbatim:

- **The Supabase data spine** (`0001_foundation` → `0006_rls`): a clean raw → staging → golden-record architecture with PostGIS, `pg_trgm` fuzzy dedup, per-field source attribution, and front-end isolated from raw data. This is exactly the backbone a signal engine needs.
- **Entity resolution + data-confidence scoring.** One golden record per real business, with `data_confidence` and freshness SLAs. Lead lists die from duplicates and stale rows; this design pre-empts both.
- **Config-as-policy + CRISP-DM loop.** Scoring weights, thresholds and routing live in versioned config and improve via offline-backtest → A/B → promote. That discipline transfers perfectly to *lead scoring*.
- **The "store every output with its inputs" rule** (`*_breakdown`). For outbound this means every lead score is explainable — you'll know *why* a gardener was flagged, which makes outreach personalised and the model auditable.

So: the engineering is not the problem. The **sequencing and the customer** are.

---

## 2. Where I disagree (the better strategic alternative)

The master strategy's core bet is *"affiliate first — earn from organic traffic on day one with zero operators, then use that proof to recruit supply."* That is clever and de-risks cold-start **for a content/SEO business**. But it has three problems for *your stated goal* (fast revenue, contacting operators):

1. **Affiliate-first is slow to first £, not fast.** "Day one" revenue assumes you already have indexed, AI-cited, high-intent organic traffic. You don't. SEO/AEO traffic to a brand-new directory realistically takes 3–6+ months and content investment before affiliate RPM is meaningful. That is the opposite of "fastest validation."
2. **It validates the wrong thing.** Affiliate RPM proves *consumers click offers*. It does **not** prove *gardeners will pay you* — which is the thing you actually want to sell. You can have great affiliate RPM and still discover operators won't subscribe.
3. **It buries your real asset.** Your fastest path to cash is the *supply-side signal data itself*: knowing which specific gardeners are growing, under-marketed, or already paying competitors for leads — and reaching them with a relevant offer **this week**. The repo treats that as a Phase-1→2 outcome; it should be the **product**.

**The reframe:** Don't build a directory and hope operators show up. Build a **signal-driven outbound machine** that finds the ~5–15% of gardeners with a live, evidenced reason to buy, and sell them something concrete now. Use the revenue and the conversations to learn what they'll pay for — *then* decide whether the full LocalLens directory is worth building (you'll know, instead of guessing).

This isn't throwing the repo away. It's running it **back-to-front**: supply signals → cash → (maybe) directory, instead of directory → traffic → supply.

### The one honest caveat
A signal list is worthless without a **wedge offer** people actually buy. The hardest part of this plan is not extraction — it's §5. Solve the offer and the data engine prints money; get the data perfect and the offer wrong, and you have a beautiful database nobody pays for. Plan accordingly: build the *thinnest* extraction that can feed real outreach, and let live rejections shape the offer fast.

---

## 3. ICP — who counts as a target (UK gardeners)

A signal engine needs a precise definition of "qualified," split into **fit** (is this the kind of business we want?) and **trigger** (is now the moment?). Score = fit × trigger × contactability (§7).

### 3a. Firmographic fit
| Attribute | Target | Why | Source |
|---|---|---|---|
| Activity | Landscaping / garden maintenance / grounds care | Core vertical | Google Places category; SIC **81300** "Landscape service activities" |
| Legal form | Sole trader **or** Ltd — but tracked separately | Drives channel + compliance (§9) | Companies House (Ltd only); Places/web (sole traders) |
| Size | Micro: 1–10 staff / £0–500k turnover | Big enough to have budget, small enough to lack in-house marketing | CH accounts (Ltd); proxy via review count, fleet/van mentions, team page |
| Geo | One UK metro to start (e.g. Manchester — matches repo seed) | Density = cheaper outreach, comparable benchmarks | Places radius + postcode |
| Digital maturity | Has a phone & GBP, but weak/no website or thin reviews | The gap *is* the pitch | Places + website probe |

### 3b. "Why now" triggers (the part that makes outbound work)
Fit tells you *who*; triggers tell you *when* — and give you the opening line. Ranked by how strongly each predicts willingness to pay:

| Trigger | What it signals | Strength |
|---|---|---|
| **Already paying for leads** (listed/advertising on Bark, Checkatrade, MyBuilder, Yell) | Proven budget + proven pain (these are expensive) — warmest possible | ★★★★★ |
| **Running paid ads** (Google Ads Transparency / Meta Ad Library) | Actively spending to get customers *now*; receptive to cheaper/better channels | ★★★★★ |
| **Hiring** (Indeed / Gumtree job ad for gardeners/labourers) | Growing → needs more work to fill capacity → wants leads | ★★★★☆ |
| **Recently incorporated** (CH, last 6–18 months, SIC 81300) | New business actively chasing first customers | ★★★★☆ |
| **Reputation gap** (rating < 4.3, or < 10 reviews, or newest review > 6 months old) | Visible pain you can fix; clear talking point | ★★★☆☆ |
| **No / broken / non-mobile website** but active GBP | Under-marketed; easy "you're invisible online" hook | ★★★☆☆ |
| **Unclaimed Google Business Profile** | Leaving the #1 free channel on the table | ★★★☆☆ |

A target qualifies when **fit ≥ threshold AND at least one ★★★★+ trigger** (or two ★★★). Everything else goes to a nurture pool, not the call list.

---

## 4. Signal taxonomy → data sources (UK)

Each signal = (where to get it) + (how to compute it) + (what it predicts). All flow through the existing `etl.raw_payload → staging → golden` spine; signals attach to the golden `business` (renamed conceptually to *company*) as rows in a new `signal` table (§6).

| Signal | Source (UK) | Cost / access | Compute | Predicts |
|---|---|---|---|---|
| Core listing (name, phone, address, GBP, rating, review count, website, categories) | **Google Places API** | Paid per call, generous free tier | Direct fields | Fit + reputation/website gaps |
| Reviews (text, dates, velocity) | Places details / Apify GBP scraper | Paid | Bayesian rating, recency, velocity | Reputation gap trigger |
| Company registry (incorp date, SIC, status, officers, accounts size) | **Companies House API** — free, API key, 600 req/5 min | **Free** | Age, size band, status=active | Fit (Ltd), recency trigger |
| Paid-ads activity | **Google Ads Transparency Center**, **Meta Ad Library** | Free (scrape/inspect) | Has live ads y/n, count, recency | "Spending now" trigger ★★★★★ |
| Pays-for-leads | Bark / Checkatrade / MyBuilder / Yell listings (Apify scrapers) | Paid (Apify) | Present on ≥1 platform | Proven budget trigger ★★★★★ |
| Hiring | Indeed / Gumtree (Apify) | Paid (Apify) | Open gardener/labourer role | Growth trigger |
| Website presence/quality | HTTP probe + lightweight checks | Free (your own fetch) | Exists / 200 / mobile / last-modified / has booking | Digital-maturity gap |
| Contactability | Derived from above + enrichment | mixed | Phone present, TPS/CTPS status, email found, on register | Channel + compliance gate (§9) |

**Sequencing of sources (cheapest-first funnel):** Companies House (free) + a single Places sweep to build the universe → cheap free probes (website, ads libraries) to attach triggers → only then spend Apify credits enriching the *already-triggered* subset. Don't scrape everything; scrape the shortlist. This keeps cost-per-qualified-lead low and is the data-science "opportunity filter" from the repo applied to spend.

---

## 5. The wedge offer — what you actually sell (decide before you extract)

The signal tells you who's in pain; the offer is the painkiller. For a brand-new operation with no traffic and no product yet, ranked by speed-to-cash and how little you must build:

| Offer | What it is | Why it fits the signals | Build needed | Risk |
|---|---|---|---|---|
| **A. Pay-per-lead** ("I'll send you 5 local garden jobs this month, £X each, only pay for ones you want") | You generate demand (cheap local Google/Meta ads + a one-page site) and sell the enquiries | Directly matches "pays for leads / runs ads" triggers — same wallet they already open for Bark | A landing page + ad spend; manual at first | You must actually generate leads; upfront ad cost |
| **B. Done-for-you Google presence + reviews** | Claim/optimise their GBP, get them a mobile site, kick off review collection — setup fee + small monthly | Matches "unclaimed GBP / no website / reputation gap" | Mostly your time + templates | Service delivery time per client |
| **C. "Claimed featured profile"** on a thin directory page | The LocalLens MVP: one ranked page per area, they pay to be featured/claimed | Matches repo; but weakest day-one because page has no traffic yet | Repo already scaffolds this | No traffic = hard to justify price |

**Recommendation: lead with A (pay-per-lead), keep B as the upsell/fallback.** Pay-per-lead is the offer gardeners *already understand and buy* (it's what Bark/Checkatrade sell, at painful prices). You undercut on price and quality of fit. It validates the single most important question — *will operators pay you money for customers?* — in days, with no directory required. It also generates the exact demand-side data that later justifies building LocalLens properly. Offer C is where you graduate (§10), not where you start.

> Validation gate: if you can't get ~3–5 gardeners to say "yes, send me leads / yes I'll pay for setup" from the first ~50 well-targeted conversations, the problem is the offer or segment, not the tech — fix that before scaling extraction.

---

## 6. Supabase schema — extraction additions

These sit alongside the existing spine. The golden `business` table already holds the company core; we add **signals**, **contacts**, **lead lifecycle**, and **outreach**. (Migration `0007_b2b_signals.sql`.)

```sql
-- 0007_b2b_signals.sql — B2B signal & outbound layer (extends 0001 foundation)

-- Enrich the golden record with B2B/registry fields (gardeners may be sole traders → nullable)
alter table business
  add column if not exists company_number   text,          -- Companies House (Ltd only)
  add column if not exists legal_form        text,          -- 'sole_trader' | 'ltd' | 'llp' | 'partnership'
  add column if not exists incorporated_on   date,
  add column if not exists sic_codes         text[] default '{}',
  add column if not exists employee_band     text,          -- proxy or CH accounts
  add column if not exists icp_fit_score     numeric(5,2),  -- 0..100 firmographic fit
  add column if not exists icp_fit_breakdown jsonb;

-- One row per observed buying signal (append-only; the engine reasons over the latest per type)
create type signal_type as enum (
  'pays_for_leads','running_ads','hiring','recently_incorporated',
  'reputation_gap','no_website','unclaimed_gbp','website_weak');

create table company_signal (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  type         signal_type not null,
  strength     numeric(4,3) not null,          -- 0..1 normalised
  evidence     jsonb not null,                 -- {source, url, snapshot, observed_value}
  source       text not null,                  -- google_ads | meta_ads | bark | indeed | companies_house | web_probe
  observed_at  timestamptz not null default now(),
  expires_at   timestamptz                     -- triggers decay (ads stop, role filled)
);
create index company_signal_biz_idx  on company_signal (business_id, type, observed_at desc);

-- Contacts (decision-makers) with compliance state baked in
create table contact (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid not null references business(id) on delete cascade,
  full_name     text,
  role          text,                          -- owner | director | manager
  phone_e164    text,
  email         text,
  email_status  text,                          -- found | verified | risky | none
  is_individual boolean default true,          -- PECR: true for sole trader/partnership
  tps_status    text,                          -- 'listed' | 'clear' | 'unscreened' (re-screen ≤28d)
  ctps_status   text,
  consent_state text default 'none',           -- none | soft_optin | consented | opted_out
  source        text,
  created_at    timestamptz not null default now()
);
create index contact_biz_idx on contact (business_id);

-- Lead = a scored, qualified company ready for (or in) outreach
create type lead_stage as enum (
  'candidate','qualified','contacted','replied','meeting','won','lost','suppressed');

create table lead (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references business(id) on delete cascade,
  stage           lead_stage not null default 'candidate',
  lead_score      numeric(5,2),                -- fit × trigger × contactability (§7)
  score_breakdown jsonb,                       -- explainable: which signals, what weights
  best_channel    text,                        -- phone | email | linkedin | post | inperson
  assigned_to     text,
  suppress_reason text,                        -- opted_out | tps_listed | no_contact | duplicate
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (business_id)
);
create index lead_stage_score_idx on lead (stage, lead_score desc);

-- Every outreach touch (the attribution + compliance audit trail)
create table outreach_touch (
  id           uuid primary key default uuid_generate_v4(),
  lead_id      uuid not null references lead(id) on delete cascade,
  contact_id   uuid references contact(id),
  channel      text not null,
  direction    text not null default 'out',    -- out | in
  template     text,
  body         text,
  outcome      text,                           -- no_answer | gatekeeper | conversation | positive | not_interested | callback
  compliance   jsonb,                          -- {tps_checked_at, basis:'legitimate_interest'|'soft_optin', opt_out_offered:true}
  occurred_at  timestamptz not null default now()
);
create index outreach_lead_idx on outreach_touch (lead_id, occurred_at desc);
```

The repo's RLS pattern (`0006_rls`) applies: these tables are service-role-written by Edge Functions; only an authenticated admin reads the lead/outreach views. **The export "to contact the user" is just a view** over `lead` joined to `contact` and `company_signal`, filtered to `stage='qualified' AND suppress_reason IS NULL`, ordered by `lead_score` — feed it straight into your dialler/CRM, or `present_files` it as a CSV.

---

## 7. Lead scoring model (reuse the repo's discipline)

Same shape as Quality Score (`01-DATA-SCIENCE.md §1`): a config-weighted, explainable, stored-with-inputs score — but for *propensity to buy*, not ranking.

```
lead_score = 100 × ( w_fit · fit  +  w_trigger · trigger  +  w_reach · contactability )
fit         = firmographic match (vertical, size, geo, legal form)         [icp_fit_score/100]
trigger     = max/weighted-sum of active company_signal.strength            (decayed by recency)
contactability = has_phone ·0.5 + has_email_if_allowed ·0.3 + not_suppressed ·0.2
```

- Weights live in `vertical.router_policy` (or a sibling `outreach_policy` jsonb) — loop-tunable, no code change.
- `trigger` uses signal **recency decay** via `company_signal.expires_at`: a Meta ad live today >> a job ad from 4 months ago.
- **Suppression is a hard mask**, exactly like the repo's trust floor: TPS-listed (for phone) or `consent_state='opted_out'` → `lead_score` irrelevant, lead is `suppressed`. Compliance is enforced in code, not hoped for.
- Store `score_breakdown` so every call opens with the real reason ("Saw you're running Google ads for garden clearance in M20…").

The CRISP-DM loop then optimises *which signals actually predict a closed deal*: log outreach outcomes → after N conversations, re-fit weights so the signals that correlate with "won" rise. Your list gets smarter every week — the repo's flywheel, pointed at sales.

---

## 8. Pipeline architecture (maps onto existing Edge Functions)

Reuse the repo's `etl-extract / etl-normalise / etl-resolve / etl-score` pattern; add two stages.

```
1. UNIVERSE     etl-extract:  Companies House (SIC 81300, metro) + Places sweep  → raw_payload → staging
2. RESOLVE      etl-resolve:  pg_trgm dedup → one golden `business` per real co.   (exists)
3. SIGNALS      etl-signals (NEW): for each golden co., probe free signals first
                (website HTTP, Google Ads Transparency, Meta Ad Library, GBP claim
                 state), then spend Apify on the triggered subset (Bark/Checkatrade,
                 Indeed) → write company_signal rows
4. ENRICH       etl-enrich (NEW): find decision-maker + contact details; set
                is_individual, run TPS/CTPS screen, set email_status → contact rows
5. SCORE        etl-score:   compute icp_fit + lead_score + breakdown; apply
                suppression mask → upsert lead (stage candidate→qualified)        (extend)
6. EXPORT       view `qualified_leads` → CSV / CRM / dialler.  outreach_touch logs every contact.
```

Cost control is structural: stages 1–3a are free/cheap and run on the *whole* metro; the expensive stage 3b/4 enrichment only touches companies that already cleared a trigger gate. That's the "profit-aware opportunity filter" from `01-DATA-SCIENCE.md §4`, applied to your API budget.

---

## 9. Compliance — the constraint that shapes the channel (UK, verified June 2026)

This is non-optional and it genuinely changes the plan, because **most gardeners are sole traders**.

- **PECR classifies sole traders & ordinary partnerships as *individual subscribers*** (like consumers). Limited companies and LLPs are *corporate subscribers*.
- **Cold marketing email/SMS to individuals (sole traders) needs consent or the "soft opt-in"** (only applies to your own prior customers). So you generally **cannot** cold-email the bulk of your list. You *can* B2B-cold-email **Ltd/LLP** gardeners under legitimate interest, with identification + an opt-out — that's the ~2,500-ish SIC-81300 limited companies.
- **Live marketing calls** to individuals (incl. sole traders) run on **opt-out**: allowed *unless* the number is on **TPS**; Ltd/partnership numbers screen against **CTPS**. You must **screen lists against TPS *and* CTPS and re-screen every 28 days**, identify yourself, show a number, and offer opt-out on every call.
- The **Data (Use and Access) Act 2025** is in force and ICO guidance is being updated — treat the above as the floor and keep `compliance` JSON on every touch as your audit trail.

**Practical channel order for sole-trader-heavy gardeners:**
1. **Phone (TPS/CTPS-screened)** — your primary channel; legal under opt-out, and trades answer the phone.
2. **LinkedIn / Instagram DM** — platform-governed, not PECR email; fine for relationship-first outreach.
3. **Email** — only to **Ltd/LLP** contacts (legitimate interest + opt-out), or to anyone who consented.
4. **Postal / leaflet / in-person** — fully legal, surprisingly effective for local trades, good for "I'll send you jobs" pilots.

Bake this in: `contact.is_individual`, `tps_status`, `consent_state` decide `lead.best_channel` automatically, and the scorer suppresses anything you may not contact. Compliance becomes data, not a lawyer's afterthought.

---

## 10. The 4-week validation plan (fastest cash)

| Week | Goal | Concrete actions | Done when |
|---|---|---|---|
| **0–1** | Universe + thinnest extraction | Get CH API key (free) + Places key. Build `etl-extract` for SIC 81300 + Places in ONE metro. Reuse `etl-resolve` dedup. Manual is fine. | ~200–500 deduped gardeners in `business` for one metro |
| **1–2** | Triggers + a usable list | Add `etl-signals` for the *free* triggers (website probe, Google/Meta ad libraries, GBP claim, reputation). Score + suppress. Hand-screen TPS for the top 50. | A `qualified_leads` CSV of 50 phone-reachable, triggered gardeners with a "why now" line each |
| **2–3** | Sell the wedge (offer A) | Stand up a one-page pay-per-lead landing page + small Google/Meta local ad. Call the 50. Log every `outreach_touch`. Offer "5 jobs, pay per lead." | ≥3–5 verbal yeses OR clear, specific rejection patterns |
| **3–4** | Learn + decide | Re-fit `lead_score` weights from outcomes (which signals → yes). Deliver leads to the first payers. Decide: scale outbound, pivot offer, or greenlight LocalLens directory. | First £ collected; a data-backed go/no-go |

**North-star metric for this phase:** *cost per qualified conversation* and *% of conversations → paid yes*. Not RPM, not traffic — those come back when (if) you build the directory. Keep the repo's honesty discipline: one primary metric, log every outcome, promote what wins.

---

## 11. How this graduates into LocalLens (don't waste the repo)

You're not abandoning the master strategy — you're earning the right to build it:

- The **demand you generate for offer A** (the local ads + landing page) *is* the directory's first traffic and the affiliate-RPM proof the repo wanted — now with real conversion data behind it.
- Every **paying gardener** is a pre-sold "claimed operator" for the directory's CRM/featured rail (offer C) — supply secured *before* you build supply pages.
- The **signal + outcome data** trains exactly the Quality Score, Intent and Opportunity models the repo specifies — except now seeded with money-validated labels.
- At that point the repo's three-rail RevenueRouter is no longer a bet; it's an optimisation over a business you already know works.

Sequence, restated: **signals → cash from operators → proven demand + pre-sold supply → LocalLens directory.** Same destination as `00-MASTER-STRATEGY.md`, reached the way you asked: revenue and validation first.

---

*Principles, inherited and re-pointed: Sell the painkiller, not the database. Extract the shortlist, not the world. Compliance is a column, not a hope. Measure in money and yeses. Keep the signals that close deals. Repeat.*
