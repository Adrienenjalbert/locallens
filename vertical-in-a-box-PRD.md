# PRD — "Vertical-in-a-Box"
### A repeatable engine + skill to spin up a trust-led local-service directory in any vertical

*v1.0 · June 2026 · companion to the gardener/landscaper blueprint & critical evaluation*

---

## 1. Summary

**Problem.** Building one directory (gardens) is a lot of bespoke work: research the market, scrape and clean supply, score trust, generate pages, build tools, seed liquidity. Doing it again for a second vertical (plumbers, roofers, photographers, wedding venues…) shouldn't start from zero.

**Product.** A **repeatable, configuration-driven engine** — and a Claude **skill** that drives it — that takes a single input (a vertical + a launch geography) and produces a production-ready, trust-led directory: cleaned/scored listings, programmatic SEO/AEO pages, two-sided free tools, a portfolio + marketing-material generator, and a seeded liquidity playbook — with a human-in-the-loop quality gate throughout.

**Thesis.** The *vertical* is a config file. The *engine* is the asset. Each new vertical inherits the same pipeline, scoring, templates, tools, and loop — only the vertical-specific knowledge (taxonomy, data sources, page patterns, pricing model, copy) changes.

**North-star outcome.** Time-to-launch a new vertical drops from *months* to *days*, at consistent quality, because 80% is shared infrastructure and 20% is a structured config the skill helps you fill.

---

## 2. Goals & non-goals

**Goals**
- One command/skill bootstraps a new vertical directory end-to-end.
- Shared, hardened modules (ingest, clean, score, generate, tools, loop) reused across verticals.
- Vertical-specific knowledge captured as **declarative config**, not code forks.
- Quality and legal safety enforced by default (scoring + human gate).
- Liquidity playbook is part of the output, not an afterthought.

**Non-goals (v1)**
- Not a no-code product for external users — it's *your* internal growth engine.
- Not full instant-booking of high-ticket jobs (estimate → brief → site visit; see eval doc §6).
- Not multi-language/international on day one (geo-clone within one country first).
- Not replacing human judgment on trust/risk flags — it augments it.

---

## 3. Users & jobs-to-be-done

| User | JTBD |
|------|------|
| **You / operator** | "Spin up a new vertical directory that's high quality and ready to seed, without rebuilding everything." |
| **Concierge / ops** | "Review and approve listings, match enquiries to pros, generate first-party reviews." |
| **Pro (supply)** | "Get a free portfolio, mini-site, and marketing pack, and qualified local work." |
| **Buyer (demand)** | "Find a trustworthy local pro with proof of work, get an honest estimate, book a site visit." |

---

## 4. The architecture: shared engine + vertical config

```
                       ┌──────────────────────────────┐
                       │   VERTICAL CONFIG (per niche) │   ← the only thing that changes
                       │  taxonomy · sources · page    │
                       │  patterns · pricing model ·   │
                       │  trust rules · copy/voice ·   │
                       │  tool set · geo               │
                       └───────────────┬──────────────┘
                                       │ feeds
   ┌───────────────────────────────────▼───────────────────────────────────┐
   │                         SHARED ENGINE (built once)                     │
   │                                                                        │
   │  1 INGEST  →  2 RESOLVE/CLEAN  →  3 SCORE  →  4 GENERATE  →  5 TOOLS    │
   │  Apify/        dedupe+validate    DQ +        pages+schema   2-sided    │
   │  Firecrawl/    canonical record   Legitimacy  +internal links free tools│
   │  Cos House/                       +Trust                     +portfolio/ │
   │  socials                          fingerprint               marketing gen│
   │                                                                        │
   │            6 HUMAN-IN-THE-LOOP QA GATE (publish control)               │
   │            7 LIQUIDITY PLAYBOOK (seed supply→demand→reviews)           │
   │            8 SELF-IMPROVING LOOP (measure→flag→feedback→learn)         │
   └────────────────────────────────────────────────────────────────────────┘
```

**Design principle:** every module reads the vertical config and the shared schema. Adding a vertical = writing a config + approving outputs, *not* editing engine code.

---

## 5. The Vertical Config (the heart of repeatability)

A single declarative spec per vertical. The skill helps you generate a first draft (via market research) and you refine it. Example (abridged, YAML-style):

```yaml
vertical:
  id: gardeners-landscapers
  display_name: "Gardeners & Landscapers"
  country: GB
  launch_geo: "Greater Manchester"
  buyer: "homeowners planning a garden project"
  supply: "gardeners, landscapers, garden designers, lawn-care firms"

taxonomy:
  services: [garden-design, patios, decking, fencing, artificial-grass,
             drainage, turfing, planting, driveways, pergolas, lawn-care]
  styles:   [modern, cottage, japanese, mediterranean, low-maintenance]
  materials:[porcelain, sandstone, composite-decking, resin]

data_sources:
  primary:   { actor: "compass/crawler-google-places", search_terms: ["landscaper","gardener","garden designer"], categories: ["landscaper","gardener"] }
  reviews:   { actor: "compass/Google-Maps-Reviews-Scraper" }
  website:   { tool: "firecrawl.extract", schema: brand+services+trust }
  registry:  { source: "companies-house", country: GB }
  social:    [instagram, facebook]

scoring:
  data_quality:  { min_publish: 0.6, weights: {completeness:0.4, freshness:0.3, corroboration:0.3} }
  legitimacy:    { signals: [website, domain_age, registry_age, insurance_mention, cert_mention, social_recency, review_corroboration] }
  trust_fingerprint: { min_text_reviews: 5, dimensions: [reliability, tidiness, communication, value, finish] }

page_patterns:                       # programmatic SEO/AEO grid
  - "/[service]/in/[location]/"
  - "/[service]/in/[location]/[style]/"
  - "/cost/[service]/"
  - "/best/[service]/in/[location]/"
  - "/pro/[slug]/"
  - "/compare/[competitor]-alternative/"
  - "/ideas/[style]-garden-ideas/"

pricing_model:                       # powers the estimate tool
  unit: "per_m2"
  bands: { budget: 50, mid: 90, premium: 150, currency: GBP }
  drivers: [size_m2, features, access, region_multiplier]

tools:
  buyer:  [cost-estimator, brief-builder, style-quiz, design-preview]
  supply: [portfolio-builder, mini-site, marketing-pack, review-request-kit, pricing-benchmark]

funnel: estimate -> brief -> matched_site_visit -> verified_review
brand_voice: { tone: "trustworthy, warm, plain-spoken", avoid: [jargon, hype] }
competitors: [checkatrade, bark, ratedpeople, mybuilder, houzz]
```

**Why this works:** plumbers vs. gardeners differ in taxonomy, search terms, pricing unit, and competitors — all of which live in this file. The engine modules don't change.

---

## 6. Module specs (functional requirements)

### M1 — Ingest
- **In:** vertical config (sources, search terms, geo).
- **Do:** run Apify actors (Maps, Reviews); Firecrawl-extract each pro's site; pull Companies House + socials. Stamp `source` + `fetched_at` on every field.
- **Out:** raw multi-source records.
- **Proven:** live test confirmed `compass/crawler-google-places` returns clean core fields at ~$4/1k places; `rag-web-browser`/Firecrawl returns clean site Markdown + brand assets.
- **Reqs:** paginate large datasets; respect ToS/robots; store provenance; idempotent re-runs.

### M2 — Resolve & Clean
- Entity-resolve the same pro across sources (name+phone+address+domain fuzzy match) → one canonical record.
- Validate/clean: fix impossible values (e.g. the live "5:30 AM" hours bug), normalise categories to the config taxonomy, sanitise keyword-stuffed display names.
- Flag conflicts for the QA gate.

### M3 — Score
- **Data-Quality Score** (publish gate): completeness × freshness × corroboration; below `min_publish` → enrichment queue, **not** published.
- **Legitimacy Score** from configured signals.
- **Trust/Review Fingerprint**: LLM synthesis across all review text where ≥ `min_text_reviews`; else explicit "limited data" state. Always show coverage/confidence.
- All negative/low-confidence outputs routed to M6.

### M4 — Generate (SEO/AEO)
- Render `page_patterns` into pages with: direct-answer openings, 40–60-word extractable blocks, comparison tables, FAQ, **stats with provenance** ("based on N analysed reviews across M local pros"), schema (LocalBusiness, AggregateRating, ItemList, FAQPage, HowTo, BreadcrumbList), hub-and-spoke internal links, per-type sitemaps.
- **Thin-content guard:** a page only renders if it clears a uniqueness/coverage threshold (else noindex).
- `robots.txt` allows AI crawlers (GPTBot, PerplexityBot, ClaudeBot, Google-Extended, Bingbot).

### M5 — Tools (two-sided)
- Instantiate the configured buyer + supply tools from shared components.
- **Buyer:** cost-estimator (driven by `pricing_model`), brief-builder, style-quiz, design-preview.
- **Supply:** **portfolio-builder, mini-site (auto-themed from Firecrawl brand tokens), marketing-pack (social/GBP/ads via `ad-creative`+`social-content`+`copywriting` skills), review-request-kit (feeds first-party verified reviews), pricing-benchmark.**
- Each buyer tool ends in "get matched with verified local pros"; each supply tool ends in "claim/complete your free profile."

### M6 — Human-in-the-loop QA gate
- Queue of: low-DQ records, negative/risk flags, low-confidence fingerprints, disputes.
- Actions: approve / edit / reject + reason. Pros get right-of-reply on their profile.
- Every correction is stored as a labelled `Feedback` event → trains M3/M4 prompts (the loop).

### M7 — Liquidity playbook (generated, not assumed)
- Output a concrete seed plan per the eval doc §4: one geo × one hero service; concierge-seed 50–100 profiles; supply onboards for single-player tool value; manufacture demand via long-tail + estimate tool; route enquiries to human concierge; generate verified reviews; densify before cloning.
- Includes target supply density, outreach list (from M1 data), and the demand-page priority list (from Semrush).

### M8 — Self-improving loop
- Weekly: measure (rankings, indexation, AI-citation share, tool conversion, lead quality, supply density, verified reviews/wk) → flag → human feedback → learn (scale winners, prune losers) → regenerate.

---

## 7. Data model (shared, vertical-agnostic)

Core entities (vertical config only changes enums/taxonomy, not shape):
`Pro · SourceRecord(provenance) · Review · TrustFingerprint · LegitimacyScore · DataQualityScore · Project(portfolio) · MiniSite · Service · Location · ToolSubmission(lead) · Match · Booking(site visit) · VerifiedReview · FeedbackEvent`.

Everything keys off `Pro × Service × Location` — which is also the programmatic page grid and the liquidity unit.

---

## 8. The Skill: `vertical-directory-builder`

Productise the engine as a Claude skill so spinning up a vertical is a guided, repeatable flow.

**Trigger:** "spin up a new directory for [vertical] in [geo]", "clone the directory engine for [vertical]", "build a vertical directory."

**Skill flow:**
1. **Intake & research** — ask the few things that aren't derivable; auto-research the rest (market size, competitors, taxonomy, pricing unit, search-term seeds, page patterns) using web/Semrush. Draft the **Vertical Config**.
2. **Confirm config** — present the draft config; user corrects taxonomy/sources/pricing/competitors.
3. **Pilot ingest** — run M1 on a small sample (like the live test: a few pros in the geo) to validate sources and data quality *before* a full run. Show the user real sample records + a data-quality readout.
4. **Generate plan + assets** — produce: the page-pattern plan, tool list, liquidity playbook, and a starter set of pages/tools.
5. **QA & publish gate** — route everything through M6; nothing public without approval.
6. **Handoff** — output the config, the seed supply outreach list, the demand-page priority list, and the metrics dashboard spec.

**Skill structure (mirrors the skills you already use):**
```
vertical-directory-builder/
  SKILL.md                      # orchestration + when-to-use
  references/
    config-schema.md            # the Vertical Config spec (§5)
    ingest-playbook.md          # which Apify actors/Firecrawl schemas per source
    scoring-rubrics.md          # DQ / legitimacy / trust fingerprint rules
    page-patterns.md            # programmatic SEO/AEO templates + schema
    tool-catalog.md             # buyer + supply tool components
    liquidity-playbook.md       # the seed sequence (eval §4)
    qa-and-legal.md             # human-gate rules, right-of-reply, ToS guardrails
  assets/
    page-templates/             # render-ready templates
    tool-templates/             # estimator, portfolio-builder, etc.
    schema/                     # JSON-LD snippets
```

**Composes existing skills:** `programmatic-seo`, `ai-seo`, `free-tool-strategy`, `marketing-psychology`, `product-marketing-context`, `social-content`, `ad-creative`, `site-architecture`, `page-cro`, `design`/`ux-writing`. The new skill *orchestrates* them per vertical.

> Build note: you can't author skills in this chat session — they're created in Settings → Capabilities (or via the skill-creator skill in a dev session). This PRD is the spec to build it from.

---

## 9. Build sequence (phased)

| Phase | Deliverable | Notes |
|-------|------------|-------|
| **P0** | Vertical Config schema + gardener config | Hand-write the gardens config; it's your reference vertical |
| **P1** | M1 Ingest + M2 Resolve/Clean | Hardened on Apify/Firecrawl (already proven live) |
| **P2** | M3 Score + M6 QA gate | Quality + legal safety before anything publishes |
| **P3** | M4 Generate + M5 Tools (estimator + portfolio-builder first) | The two highest-leverage tools |
| **P4** | M7 Liquidity + M8 Loop | Seed geo #1; wire measurement |
| **P5** | Wrap as `vertical-directory-builder` skill | Only after the engine works manually once |
| **P6** | Clone to vertical #2 (e.g. roofers/plumbers) | Proves repeatability; should take days, not months |

**Sequencing rule:** *productise only after you've done it once by hand.* Build the gardener directory with the engine, learn what's truly shared vs. vertical-specific, then freeze the config boundary and wrap the skill. Premature abstraction is the main risk here.

---

## 10. Success metrics

**Engine/repeatability**
- Time-to-launch a new vertical (target: < 1 week by vertical #3).
- % of a new vertical that's config vs. custom code (target: > 80% config).
- Data-quality pass rate at first ingest (target: improving each vertical).

**Per-directory health** (the real product)
- Supply density per postcode; % profiles complete (portfolio + verified reviews).
- Enquiry→match→booked rates; time-to-first-response.
- Verified reviews generated / week (Moat B velocity).
- Organic sessions, ranked keywords, **AI-citation share**, % pages above thin-content threshold.
- Free→paid pro conversion; MRR; demand/supply ratio per area (liquidity).

---

## 11. Risks & mitigations (repeatability-specific)

| Risk | Mitigation |
|------|-----------|
| **Premature abstraction** (engine that fits gardens only) | Build gardens by hand first; freeze the config boundary only after |
| **Vertical leakage** (vertical logic creeps into shared code) | Hard rule: anything vertical-specific lives in config/references, enforced in review |
| **Data source variance across verticals** | `data_sources` is config; ingest-playbook documents per-source actors/schemas; pilot-ingest before full run |
| **Quality/legal at scale** | M6 human gate + right-of-reply are non-optional defaults in every vertical |
| **Liquidity assumed, not seeded** | M7 ships a concrete seed plan per vertical; don't launch demand pages before supply density |
| **Thin programmatic pages → penalty** | M4 uniqueness threshold + noindex guard built into the engine |

---

## 12. Open questions for you

1. **Country focus** for the clone — stay UK for vertical #2, or prove geo-clone within gardens first (e.g. Manchester → Birmingham → London) before vertical-clone?
2. **Monetisation per vertical** — same subscription + qualified-intro model everywhere, or does it flex by ticket size (e.g. roofers vs. lawn-care)?
3. **Build stack** — confirm the framework so M4/M5 templates target it (Next.js is the natural fit for programmatic SEO + tools; I can scaffold it).
4. **First two tools to build for real** — I recommend **cost-estimator** (demand) + **portfolio/marketing generator** (supply); confirm and I'll prototype one as working code.

---

### Where this leaves you
You now have: a stress-tested strategy (blueprint), an evidence-based critique and fix (evaluation), and a spec to turn the whole thing into a **repeatable engine + skill** (this PRD). The fastest next concrete step is to **prototype one tool as working code** against real scraped data — say the **cost-estimator** or the **portfolio + marketing generator** — so the engine is proven on something tangible before you wrap the skill.
