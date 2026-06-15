# LocalLens — AEO + Smart-SEO Strategy (free-tool, evidence-led)

**Author:** Adrien Enjalbert · **Status:** Strategy + build record · **Companion to:** `00-MASTER-STRATEGY.md` (content loop), `01-DATA-SCIENCE.md` §4 (Opportunity model), `02-CRISP-DM-LOOP.md` (pSEO + market-entry surface), `04-BUILD-PROMPT-PLAN.md` (Prompts 6, 9, 10).

> Build-status honesty (same convention as the loop doc): ✅ = built in this repo · ◻ = specified, not yet built · 🔁 = wired into the CRISP-DM loop.

---

## 1. The thesis (why AEO *is* SEO for us)

For a **local service directory**, "AEO" is not a separate rail to chase — it is the downstream payoff of doing classic technical SEO well, because that is literally the prerequisite for AI citation in our category. The 2026 evidence is unusually clear and unusually favourable to LocalLens:

- **AI Overviews now trigger on ~78% of local / "near me" queries** (up from ~10% recently). Local search has been structurally rewritten — this is our category.
- **Google AI Mode/Overviews require top-~20 organic ranking before they will cite you.** "SEO gets you found, AEO gets you cited." Google's own May 2026 guidance: *AEO is still SEO*. There is no shortcut that skips organic ranking.
- **Reviews are the dominant local trust signal**: AI engines reference reviews in a majority of local answers (Perplexity ~100%). Our **Quality Score** — built on real reviews, verified credentials and portfolio quality — is therefore an AEO weapon, not only a ranking device.
- **`llms.txt` is, as of mid-2026, effectively dead for citations.** Across large-scale bot-traffic studies the crawlers that drive AI citations (GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot, Google-Extended) almost never fetch it; Google has stated on the record that no AI system currently uses it. **We deliberately do not invest in it as a visibility lever.** (See §6.)

**Win condition:** rank in the top ~20 organically for winnable local-intent queries, with machine-extractable structured data and freshness signals. The AI-citation payoff then follows automatically.

```
   Free keyword/intent research  ─►  profit-aware page selection (Opportunity model)
              │                              │
              ▼                              ▼
   Top-~20 organic ranking  ──────►  AI Overview / ChatGPT / Perplexity citation
        (technical SEO floor)              (the "AEO" payoff is automatic)
              ▲                              ▲
              │                              │
   Structured data + freshness  ◄──  Quality Score (reviews/credentials = E-E-A-T)
```

This maps directly onto the Master Strategy's **content loop** (data → pages → citations → traffic) and the CRISP-DM **pSEO + market-entry** surface.

---

## 2. Technical AEO/SEO floor (Build Prompt 10) — ✅ built

The plumbing that makes a statically-exported page eligible for AI citation. All emitted into the static export (`output: 'export'`), verified against a real build.

| Capability | Where | Note |
|---|---|---|
| **AI-crawler allow-list** + private-surface disallow + sitemap ref | `src/app/robots.ts` | Explicitly names GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, etc. An explicit allow signals consent and raises crawl priority. `/app`, `/admin`, `/claim`, `/r` disallowed. |
| **Sitemap** from a single registry | `src/app/sitemap.ts` + `src/lib/seo/pages.ts` | Absolute URLs + `lastmod`/`changefreq`/`priority`. The registry is the single source of truth so the sitemap can't drift from what's pre-rendered. |
| **`LocalBusiness` schema** (`areaServed`, `aggregateRating`, `priceRange`, `dateModified`) | `src/lib/tools/jsonld.ts` → location & profile pages | Required for local AI Overviews to consider citing a business; carries the review trust signal. |
| **`BreadcrumbList`** + **`ItemList`** (ranked shortlist) | same | `ItemList` is the unit AI Overviews extract for "best {vertical} in {location}"; built from the same data the UI renders. |
| **`FAQPage`** + **`Product`/`AggregateOffer`** | `FaqBlock`, tool pages | Pre-existing; FAQ-marked content is the highest-leverage single schema for extraction. |
| **Canonical + OpenGraph + Twitter + `metadataBase`** | `src/lib/seo/metadata.ts`, `layout.tsx`, all page `generateMetadata` | De-dupes the `/vertical/location` ↔ `/tools` overlap; controls how AI/social render us. |
| **Freshness** — visible "Updated {date}" + `dateModified` in JSON-LD | location & profile views, driven by the registry | AI engines weight recency heavily (AI-cited URLs run materially fresher than classic results). |

**Verified in `out/`:** `robots.txt`, `sitemap.xml`, and per-page JSON-LD (`BreadcrumbList` + `ItemList` + `LocalBusiness` + `AggregateRating`), canonical, OG/Twitter, and `dateModified` all present. Typecheck + tests + clean static build pass.

---

## 3. Content/AEO patterns (extend the answer-first design)

The answer-first `AnswerBlock` is already the right call (it leads every page before any monetisation unit — trust floor #3). Three patterns the evidence specifically rewards, layered on top:

1. **Answer-first, 40–60 words, one cited statistic.** `AnswerBlock` already supports a `stat` with source + date. Keep every page carrying one attributed number — it is the #1 extraction pattern.
2. **Comparison tables for "X vs Y".** `ComparatorView` / `ComparatorTable` exist; ensure a real HTML `<table>` renders — AI Overviews frequently extract entire tables for comparison queries.
3. **5+ question FAQ** on every location/profile/tool page via `buildFaqPageJsonLd` (`FaqBlock`). FAQ-marked Q&A is preferred for extraction by both AI Overviews and ChatGPT.
4. **Reviews as E-E-A-T.** Surface real review counts + `aggregateRating` in schema (now wired). For a directory, third-party validation is *the* signal.

---

## 4. Profit-aware page selection (Build Prompt 9) — ✅ 🔁 built

Page selection is now data-driven, not the hard-coded gardeners×Manchester seed. Implements `01-DATA-SCIENCE.md` §4. The model runs in **two places off one source of truth**: the `tools/seo/` CLI (off-platform exploration) and the `etl-keywords` Edge function (live loop — writes `keyword.opportunity_score` and queues `page` rows; §8.1).

**The Opportunity model** (`src/lib/scoring/opportunity.ts`, unit-tested source of truth — mirrors the `quality-score.ts` pattern, ready to copy into a Deno `etl-keywords` Edge fn):

```
opportunity = volume × intent_weight × competition_gap   (demand)
            × affiliate_rpm_potential                    (earns day-one, no operators)
            × supply_readiness                            (enough data to be useful)
```

- **Multiplicative** — a zero on any axis (no demand, locked SERP, no way to earn, no usable data) correctly zeroes the opportunity. Demand alone is never enough; this is the profit-aware filter.
- **Calibration note:** because the score is a product of five [0,1] factors, realistic values compress low — a strong local hire-now page lands ~0.12–0.16; a near-perfect one ~0.5. `BUILD_THRESHOLD = 0.08` cleanly separates genuine commercial location/tool pages from marginal research/guide queries. The threshold is tunable via the loop (promote a winner into config).
- **Market entry** — `computeMarketEntry()` aggregates per-keyword opportunity into a single vertical×metro entry score and an **`affiliateFundable`** verdict: a market can be validated by affiliate RPM with **zero operators** before any supply outreach (the strategist's market-entry filter). Every output stores its inputs (`breakdown`) for auditability and the loop.

**Affiliate-aware + readiness-gated:** a candidate is only truly publishable once `computePageReadiness` (`page-readiness.ts`) also passes — a thin-supply page with a strong affiliate match is still viable; a page with neither is genuinely thin.

---

## 5. The free-tool stack + orchestration (`tools/seo/`) — ✅

The research engine that feeds the Opportunity model. £0 of tooling; mirrors the cost model and dry-run discipline of `tools/outreach/`. Run `npm run seo -- --metro manchester --dry-run`.

| Job | Free tool | How it plugs in |
|---|---|---|
| Question/long-tail discovery | **Google Autocomplete** (public suggest endpoint, no key) + offline PAA-style templates | `tools/seo/research.ts` — the long-tail, question-shaped queries AI engines extract |
| First-party truth | **Google Search Console** (free, OAuth) | swap point documented in `.env.seo.example` — real impressions/positions replace heuristic volume once there's traffic |
| Volume validation | **Google Keyword Planner** (free w/ Ads account) | replaces `estimateVolume` |
| Buyer language | **Reddit / ChatGPT prompt-mining** | manual seed input to `--seeds` |
| Trend/seasonality | **Google Trends** | gardening is seasonal — times publishing + offers |
| Technical/schema audit | **Lumina** (browser; validates schema + AI-crawler robots.txt) + **PageSpeed Insights** + **Screaming Frog** (≤500 URLs) | validate the §2 output; CWV is a tool-conversion guardrail |
| AI-citation tracking | **manual monthly sampling** across ChatGPT / Perplexity / AI Mode | the only honest AEO KPI today (§7) |
| AI-bot reality check | Cloudflare **Bot Analytics** / server logs | confirm GPTBot/PerplexityBot actually crawl — don't guess |

**Orchestration into the loop:** the engine emits ranked `page` candidates (CSV/JSON) whose URLs match the static-export route shape, so a buildable candidate maps directly to a `page` row. Heuristic volume/competition are clearly flagged with documented swap points for GSC/Keyword Planner — the scoring math downstream is unchanged when real data arrives.

```
seeds ─► research.ts (autocomplete + templates)  ─►  computeOpportunity()
   (free)                                              × affiliate-RPM × supply
                                                            │
                                              ranked page candidates + market-entry score
                                                            │
                                              page-readiness gate ─► queue `page` row
                                                            │
                                              GSC positions + monthly AI-citation sample ─► loop
```

---

## 6. Decisions on record

- **We do NOT ship `llms.txt` as a visibility strategy.** Mid-2026 evidence: the citation-driving crawlers don't fetch it and no major provider uses it. It may be added later as cheap hygiene, but it is explicitly *not* a lever. Crawler control stays in `robots.txt`.
- **Heuristic volume/competition are placeholders, not the product.** They let the engine run at £0 today; GSC/Keyword Planner are the documented upgrade path. We do not pretend the heuristics are real volume data.
- **Threshold lives in code now, config later.** `BUILD_THRESHOLD` is a constant today; per `01-DATA-SCIENCE.md` it graduates to a config value the loop can tune once there's traffic.
- **AEO is downstream of organic ranking.** We don't build an "AEO rail." We build the technical floor + winnable pages; citation follows.

---

## 7. Measurement

- **Page selection:** Opportunity score per candidate; market-entry score + `affiliateFundable` per vertical×metro.
- **Ranking:** GSC average position for target queries (free, first-party).
- **AEO (the honest KPI):** monthly manual citation sampling — for our category queries across ChatGPT, Perplexity and Google AI Mode, are we cited, and against which competitors? Logged as the pSEO surface's qualitative read.
- **North Star (unchanged):** RPM per page type × vertical × geo, with qualified-actions/1k as the honesty guardrail (`01-DATA-SCIENCE.md`).

---

## 8. What's left (sequenced)

1. ~~Mirror `opportunity.ts` into a Deno `etl-keywords` Edge fn writing `keyword.opportunity_score`.~~ — ✅ 🔁 `supabase/functions/etl-keywords/` (mirror in `_shared/scoring.ts`, kept in sync by `opportunity.sync.test.ts`). Derives `affiliate_rpm_potential` from active-offer EPC and `supply_readiness` from published-business density per vertical; scores every `keyword` and queues buildable `page` rows. Run order: `… → etl-score → etl-keywords`.
2. **Wire GSC** (replace heuristic volume with real impressions/positions) once the site has traffic — ◻. The `etl-keywords` fn already reads `keyword.volume`; populate it from GSC.
3. **Comparison `<table>` audit** on `ComparatorView`; ensure native table markup — ◻.
4. **Monthly AI-citation sampling** as a standing pSEO-surface ritual — ◻.

*Principle, unchanged: earn from the asset you already have; rank honestly within a fixed trust floor; measure in money and user value; let the loop keep only what wins.*
