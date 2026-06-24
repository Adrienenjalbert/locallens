# The GreenList Blueprint
### A Vertical Directory + Portfolio Engine for Gardeners & Landscapers

*Strategy blueprint — v1.0 · June 2026*

> Working codename: **GreenList** (placeholder — swap for your real brand). This document is the master plan for a programmatically-built, review-and-portfolio-led directory for the gardening & landscaping vertical, engineered as a world-class SEO/AEO machine with free tools for both sides of the marketplace and a self-improving loop with human feedback.

---

## 0. How to read this document

The blueprint is organised so you can build it in order:

1. **Thesis & moat** — why this wins and what protects it.
2. **The market** — demand, competitors, and the gap.
3. **Positioning & messaging** — the product-marketing context every page and asset inherits.
4. **The data pipeline** — Apify (scrape), Firecrawl (design/extract), Semrush (market research), enrichment, and review analysis.
5. **The SEO + AEO engine** — programmatic page system, schema, internal linking, AI-citation strategy.
6. **Free tools** — engineering-as-marketing for *both* sides of the marketplace.
7. **Portfolio & website builder** — the supply-side moat and switching costs.
8. **The self-improving loop** — human-in-the-loop quality and ranking compounding.
9. **Business model & growth** — monetisation, GTM, social, referral.
10. **Roadmap & metrics** — what to build first, what to measure.
11. **Risks** — and how to defuse them.

---

## 1. The thesis & the moat

### 1.1 One-line thesis

> Most directories list businesses. **GreenList ranks them on the things buyers actually care about — proof of work (portfolios), what past customers really said (review analysis), and whether the company is even real (website + signal verification) — then gives both sides free tools that no competitor offers.**

### 1.2 Why "by vertical" beats horizontal

Horizontal players (Bark, Yell, Checkatrade, Houzz, Rated People, MyBuilder) cover every trade. That breadth is their weakness: their pages are templated thin, their reviews are unstructured star ratings, and their economics force them to spam pros with shared, low-quality, pay-per-lead offers. A vertical player can go ten times deeper on the *one* job — gardens — and out-rank, out-trust, and out-convert them on every garden query.

### 1.3 The five-layer moat

Directories are easy to copy. A *defensible* directory stacks moats so a fast-follower has to replicate all five:

| # | Moat layer | What it is | Why it's hard to copy |
|---|-----------|-----------|----------------------|
| 1 | **Proprietary review analysis** | NLP/LLM analysis of every review across every source into structured signals (reliability, tidiness, value, communication, specialisms, complaint patterns). Not a star average — a *fingerprint*. | Requires aggregated multi-source review data + an analysis layer competitors treat as a feature, not a product. The data compounds. |
| 2 | **Portfolio depth** | Real project photos/case studies per pro, tagged by style, plant, hardscape, budget band, before/after. | Supply-side content that takes relationship + tooling to collect. Once a pro builds their portfolio on you, they don't rebuild it elsewhere (IKEA + switching cost). |
| 3 | **Website/legitimacy verification** | Each pro scored on whether they have a real site, active socials, insurance, certifications, response time, recency of work. | This is *analysis*, not listing. It's the trust differentiator buyers can't get from a star count. |
| 4 | **Free tools on both sides** | Buyer-side: instant cost/design tools. Supply-side: free portfolio + mini-website + quote tools. | Engineering-as-marketing creates links, leads, and lock-in simultaneously. Most directories have none. |
| 5 | **Programmatic SEO/AEO surface area + self-improving loop** | Thousands of genuinely useful pages that compound, improved continuously by a human-feedback loop. | First-mover authority compounds (Lindy + flywheel). Late entrants fight your accumulated domain authority. |

**The defensibility hierarchy in play** (from the programmatic-SEO discipline): proprietary > product-derived > user-generated > licensed > public. GreenList's review-analysis and portfolio data are *proprietary + user-generated* — the two strongest tiers — which is exactly what prevents the "anyone can scrape Google Maps" race to the bottom.

### 1.4 The flywheel

```
   More pros build portfolios on GreenList
          │
          ▼
   Richer, more unique pages  ──►  Better SEO/AEO rankings & AI citations
          │                                     │
          ▼                                     ▼
   More buyer traffic & free-tool usage ──► More leads & reviews for pros
          │                                     │
          ▼                                     ▼
   Pros get value → upgrade & refer ──► More pros build portfolios  (loop)
```

This is a classic **network-effect + content flywheel**: hard to start, self-sustaining once it turns. The whole roadmap below is about reaching the **critical mass** in one region/sub-vertical before expanding (depth before breadth).

---

## 2. The market

### 2.1 Demand is large, local, and high-intent

Garden/landscaping search is dominated by "near me" and "[service] in [town]" patterns — the exact long-tail structure that programmatic SEO is built for. Nearly 90% of people searching a local service contact a business within 24 hours, and "landscaper near me" / "patio installer in [town]" searchers are bottom-of-funnel buyers ready to hire. Project values are high enough to support real lead economics: UK gardener jobs average ~£417 (range ~£299–£699), and landscaping projects run from ~£1,750 to £4,500+, at roughly £80–£100 per m² (budget £50, premium £150). High ticket + high intent = healthy unit economics for whoever owns the search result.

> ⚠️ **Verify locally before committing budget.** Treat the figures above as directional (sourced June 2026 — see Sources). Pull exact monthly search volumes, CPCs and trends for your launch region in **Semrush/Ahrefs** before locking the page plan. The *pattern* (huge long-tail, high intent, high ticket) is robust; the *numbers* shift by geography and season.

### 2.2 The competitor landscape and where each falls short

| Competitor | Model | Where they're weak (your opening) |
|-----------|-------|----------------------------------|
| **Checkatrade** | Subscription for visibility; vetting + reviews | All-trades, generic profiles; star reviews not structured; no portfolio depth; no free buyer tools beyond a quote request |
| **Bark** | Pay-per-lead (~£10–£50/lead, charged even if pro loses) | Pros resent shared/wasted leads; thin profiles; reputation problem on the supply side |
| **Rated People / MyBuilder** | Pay-per-lead + subscription (leads ~£2–£65; ~£35/mo) | Multiple pros pay for one job; commoditised; weak content/SEO depth per niche |
| **Houzz** | Flat-rate Pro + concierge; design-led | Strong on inspiration photos but US-centric economics, broad home-improvement, not a focused UK garden play; weak on structured review intelligence |
| **Yell / generic directories** | Listing/ads | Low trust, low engagement, poor UX, no proof of work |

**The synthesis:** every incumbent is either (a) all-trades and shallow, (b) hated by pros for lead spam, or (c) inspiration-only without trust intelligence. **None** combines structured review analysis + portfolio proof + legitimacy scoring + free two-sided tools in a single garden-focused brand. That is the wedge.

### 2.3 Jobs to be done

- **Buyer JTBD:** "Help me find a gardener/landscaper I can *trust*, see proof they've done my kind of project, and know roughly what it'll cost — without filling in a form and getting hounded by ten companies."
- **Pro JTBD:** "Get me qualified local work and make me look credible online without me having to build a website or learn marketing."

Everything GreenList builds should map to one of these two jobs.

---

## 3. Positioning & product-marketing context

This is the canonical context that every page template, tool, ad, and social post should inherit. (In build, store it at `.agents/product-marketing-context.md` so all marketing skills reference it automatically.)

**One-liner:** The trusted way to find — and the easiest way to become — a sought-after garden professional.

**Category:** Vertical directory + reputation/portfolio platform for gardeners & landscapers (a "two-sided garden marketplace").

**Two audiences:**

- **Homeowners / property buyers** (demand). Care about: trust, proof, price clarity, low hassle. Anti-persona: pure bargain-hunters who'll never pay for quality.
- **Garden pros** (supply): solo gardeners, landscaping firms, garden designers, lawn-care specialists. Care about: qualified leads, credibility, looking professional, not being ripped off on lead fees.

**Differentiators (say these everywhere):**
1. *Reviews, decoded.* We don't show a star average — we show what customers actually praised and complained about, analysed across every review they've ever received.
2. *Proof, not promises.* Real portfolios, tagged by style/budget/plant/hardscape, with before/afters.
3. *Real businesses only.* Every pro carries a legitimacy score (website, socials, insurance, certifications, recency).
4. *Free tools for everyone.* Instant cost & design tools for homeowners; free portfolio + mini-site + quote tools for pros.

**Brand voice:** trustworthy, plain-spoken, a little warm and outdoorsy. Expert without jargon. Confident enough to admit trade-offs (pratfall effect — "we're not the cheapest list, we're the most honest one").

**Psychology to bake in** (from marketing-psychology):
- *Social proof / bandwagon* — counts everywhere ("3,412 verified garden projects").
- *Authority* — legitimacy badges, certifications, "verified portfolio".
- *Zero-price + reciprocity* — free tools give first, then ask for the email/signup.
- *Paradox of choice / default effect* — always surface a single "best match for you" pro, not 40 blue links.
- *Goal-gradient + IKEA effect* — pro onboarding shows a profile-completeness bar; the effort they invest deepens lock-in.
- *Loss aversion* — for pros: "Your profile is 60% complete — incomplete profiles get 4x fewer enquiries."

---

## 4. The data pipeline

This is the engine room. Four stages: **acquire → extract/enrich → analyse → structure**. Run it as an idempotent pipeline so it can re-run weekly and feed the self-improving loop (Section 8).

### 4.1 Acquire — Apify (scraping)

Use Apify Actors to build the seed dataset and keep it fresh. Candidate sources per region:

- **Google Maps / Places** Actors → business name, category, address, phone, rating, review count, hours, website URL, photos. This is the spine of the listing.
- **Review sources** → pull full review *text* (not just stars) from Google, Trustpilot, Checkatrade-style pages where permitted, Facebook. Review text is the raw material for the moat.
- **Companies House (UK)** → incorporation status, age, directors → legitimacy signal.
- **Social profiles** → Instagram/Facebook presence and post recency (garden pros live on Instagram — it's where portfolios already exist).

> **Compliance guardrail:** scrape only public data, respect each source's terms and robots, store provenance per field, and prefer official APIs where they exist (e.g. Google Places API for core business data). Build a "source + fetched-at" stamp into every record so you can re-verify and defend data quality. Don't republish third-party review *text* verbatim where terms forbid it — store it for *analysis*, and surface your *derived* signals.

**Practical Apify flow:** `search-actors` → `fetch-actor-details` (read input schema) → `call-actor` (async for big runs) → `get-actor-output` (paginate dataset) → load into your DB.

### 4.2 Extract & enrich — Firecrawl + enrichment

- **Firecrawl** crawls each pro's own website to extract: services, service area, "about" copy, team size, certifications, project pages, and — critically — **design/brand assets** (logo, colour palette, hero imagery, fonts). This powers two things: (a) the legitimacy score, and (b) auto-theming the pro's GreenList portfolio/mini-site to match their real brand (Section 7).
- **Image pipeline:** collect project photos, de-dupe, and run vision tagging (style: modern/cottage/Japanese; elements: patio, decking, pergola, pond, artificial lawn; before/after detection). Tags become portfolio filters *and* programmatic page fuel.
- **Enrichment:** insurance/certification mentions, response-time signals, awards (e.g. trade-association membership).

### 4.3 Market research — Semrush

Semrush (and/or Ahrefs) drives the *page plan*, not guesswork:

- **Keyword universe:** harvest every `[service] + [location]`, `[service] cost`, `[style] garden ideas`, `best [service] in [town]`, `[competitor] alternative`, and question keywords. Pull volume, difficulty, intent, and SERP features (does an AI Overview / local pack appear?).
- **Gap analysis:** where do Checkatrade/Houzz/Bark rank that you could beat with a deeper page?
- **AI Overview tracking:** flag queries already showing AI answers — those are AEO targets (Section 5.4).
- **Prioritisation:** score each page pattern by `volume × intent × winnability`, build the highest-ROI 20% first (Pareto).

### 4.4 Analyse — the review-intelligence layer (the crown jewel)

For every pro, run all their review text through an LLM analysis pass that outputs a **structured reputation fingerprint**, e.g.:

```json
{
  "pro_id": "…",
  "reviews_analysed": 137,
  "sources": ["google", "facebook", "trustpilot"],
  "scores": {
    "reliability": 0.92, "tidiness": 0.88, "communication": 0.79,
    "value_for_money": 0.71, "quality_of_finish": 0.95
  },
  "specialisms_detected": ["patios", "drainage", "cottage planting"],
  "praise_themes": ["turned up on time", "left garden spotless", "great with plant choices"],
  "complaint_themes": ["slow to send final invoice"],
  "risk_flags": [],
  "summary": "Consistently praised for tidy, reliable patio and drainage work; minor admin delays.",
  "confidence": "high",
  "last_analysed": "2026-06-16"
}
```

This is what makes pages *unique* (no thin-content penalty), what makes them *AI-citable* (structured, statistic-rich, original analysis), and what no competitor replicates without rebuilding the whole pipeline. Always show review count + confidence so the signal is honest (and defensible). **Human review is mandatory before publishing risk flags** — see Section 8.

### 4.5 Structure — the data model (sketch)

Core entities: `Pro`, `Review`, `ReviewFingerprint`, `Project` (portfolio item, with tags + before/after), `Location`, `Service`, `Certification`, `LegitimacyScore`, `ToolSubmission` (leads from free tools), `Feedback` (human-loop events). Everything keys off `Pro × Service × Location` — which is also your programmatic page grid.

---

## 5. The SEO + AEO engine

Goal: be the page Google ranks **and** the source ChatGPT/Perplexity/AI Overviews **cite**. Traditional SEO gets you ranked; AI SEO gets you cited — you want both, and they share the same foundation.

### 5.1 URL architecture (subfolders, never subdomains)

```
greenlist.com/
├─ /[service]/in/[location]/              ← core programmatic grid (highest volume)
│     e.g. /landscapers/in/manchester/
├─ /[service]/in/[location]/[style]/      ← long-tail layer (e.g. /patios/in/leeds/modern/)
├─ /pro/[slug]/                           ← individual pro profile (proprietary review fingerprint)
├─ /pro/[slug]/portfolio/                 ← portfolio (supply moat + image SEO)
├─ /cost/[service]/                       ← cost guides (feeds the calculator + AEO)
├─ /ideas/[style]-garden-ideas/           ← inspiration (image + AI Overview magnet)
├─ /compare/[competitor]-alternative/     ← "Checkatrade alternative" capture
├─ /tools/[tool-name]/                    ← free tools (links + leads)
└─ /guides/[question]/                    ← glossary/how-to (AEO)
```

Subfolders consolidate domain authority; subdomains split it. Keep everything on one root.

### 5.2 The programmatic page playbooks (layered)

From the 12 pSEO playbooks, GreenList stacks **Locations + Directory + Profiles + Curation + Comparisons + Glossary + Cost/Calculators**:

| Page type | Pattern | Unique value that avoids thin-content penalty |
|-----------|---------|----------------------------------------------|
| Service-in-location | `landscapers in [town]` | Real ranked pros, *aggregated local review themes* ("Leeds homeowners most praise drainage work"), local price band, local style trends |
| Pro profile | `[business name]` | Proprietary review fingerprint, portfolio, legitimacy score — found nowhere else |
| Cost guide | `[service] cost` | Calculator + real price distribution derived from your data, not generic ranges |
| Best-of curation | `best [service] in [town]` | Transparent ranking methodology + structured comparison of top pros |
| Style ideas | `[style] garden ideas` | Tagged real project photos from your portfolio data |
| Comparison | `[competitor] alternative` | Honest, balanced feature comparison (AI loves these — ~33% of AI citations are comparison content) |
| Glossary/How-to | `what is [term]` / `how to [task]` | 40–60 word direct-answer blocks + FAQ schema |

**Quality gate:** better 500 genuinely useful pages than 50,000 thin ones. Each page must answer real intent and carry data unique to it. Noindex thin variants (e.g. a town with zero pros) until they have content.

### 5.3 On-page structure for extraction

Every template ships with:
- A **direct-answer opening** (lead with the answer, don't bury it).
- **Self-contained answer blocks** (40–60 words) that work if an AI lifts them out of context.
- **Comparison tables** over prose wherever choosing between pros/options.
- **Statistics with provenance** ("Based on 1,284 analysed reviews across 96 Manchester landscapers…") — original data is the single biggest AI-citation booster (~+37–40%).
- **FAQ section** with natural-language questions.
- Visible **"Last updated"** date and an attributed methodology/author — freshness + E-E-A-T.

### 5.4 Schema markup (structured data)

Ship JSON-LD on every relevant template:
- `LocalBusiness` / `Service` on profiles.
- `AggregateRating` + `Review` on profiles (your derived signals).
- `ItemList` on listing & best-of pages.
- `FAQPage` on guides and cost pages.
- `HowTo` on task guides.
- `BreadcrumbList` site-wide.
- `Organization` for GreenList itself (entity recognition in Knowledge Graph).

Structured content with schema shows materially higher AI visibility.

### 5.5 AEO / GEO — getting cited by AI

- **Allow the AI crawlers** in `robots.txt`: GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended, Bingbot. (Optionally block training-only crawlers like CCBot.) If they're blocked, those platforms literally cannot cite you.
- **Be where AI looks** (third-party presence): a Wikipedia-worthy entity over time, authentic Reddit (r/gardening, r/landscaping, UK local subs) participation, YouTube how-to/cost content, and guest features in gardening publications. Brands are ~6.5× more likely to be cited via third-party sources than their own domain — so seeding presence off-site matters as much as on-site.
- **Comparison + cost + "best" pages** are your highest-citation formats — prioritise them for AEO.
- **Monitor**: track citation share monthly (manually at first: run your top 20 queries through ChatGPT/Perplexity/Google; later tools like Otterly/Peec/ZipTie).

### 5.6 Internal linking (hub & spoke)

- Hubs: service pages and location hubs.
- Spokes: individual pro profiles, style pages, cost pages.
- Cross-link related spokes (a Manchester profile links to "landscapers in Manchester", "patios in Manchester", relevant style ideas, and the cost guide).
- No orphan pages; per-type XML sitemaps; breadcrumbs with schema.

---

## 6. Free tools — engineering as marketing, both sides

Free tools are the reciprocity-and-links engine. Each must: solve a real problem, sit adjacent to the core product, do one thing well, and create a natural path to the marketplace. Build buyer-side tools for *traffic + leads*, supply-side tools for *supply acquisition + lock-in*.

### 6.1 Buyer-side tools (demand)

| Tool | What it does | Why it wins | Lead capture |
|------|-------------|------------|--------------|
| **Garden Cost Estimator** ⭐ flagship | Enter size, features (patio/decking/lawn/planting), region → instant price band from *your* data | Huge "[service] cost" search demand; powered by proprietary price distribution, not generic ranges | Ungated estimate → optional "get matched with 3 verified local pros for a real quote" (email) |
| **Instant Quote / Brief Builder** | Guided spec → a clean project brief | Reduces buyer activation energy; produces a qualified lead | Email to receive brief + matches |
| **Garden Style Quiz** | "What's your garden style?" → modern/cottage/Japanese + matched local pros & ideas | Shareable, social-friendly, mimetic | Soft email gate for full results |
| **AI Garden Design Preview** | Upload a photo → AI-generated redesign concepts in chosen style | High share-worthiness + links; showcases pros who do that style | Gate the high-res/extra concepts |
| **Maintenance Calendar Generator** | Postcode + garden type → seasonal to-do calendar | Recurring utility = repeat visits + email list | Email to receive/subscribe |

### 6.2 Supply-side tools (the acquisition + moat flywheel)

| Tool | What it does | Why it wins |
|------|-------------|------------|
| **Free Portfolio Builder** ⭐ | Pro uploads projects; auto-tagged, before/after, hosted on `/pro/[slug]/portfolio/` | The IKEA-effect lock-in. Their proof-of-work now lives on GreenList. |
| **Free Mini-Website** | One-page site auto-themed from their brand (via Firecrawl-extracted colours/logo) on a GreenList subfolder, upgradeable to custom domain | Most solo gardeners have no website; you become their web presence (huge switching cost) |
| **Free Quote/Invoice Generator** | Branded quote & invoice PDFs | Daily-use utility → habit → stickiness |
| **Reputation Report** | "Here's what your reviews say about you" — their own fingerprint, free | Reciprocity + demonstrates the analysis moat + a natural upsell to "respond/improve" |
| **Pricing Benchmark** | "Pros like you in [town] charge £X–£Y/m²" | Gives pros something they can't easily get; pulls them into the platform |

**Tool → product path:** every buyer tool ends in "get matched with verified local pros"; every supply tool ends in "claim your free profile / complete your portfolio." Score each idea on the free-tool scorecard (search demand, audience match, uniqueness, path to product, build feasibility, maintenance, link potential, shareability) and build 25+ scorers first.

**Build approach (AI-assisted):** these are well-suited to single-file HTML/React tools you can generate quickly, embed on `/tools/*`, and iterate. Start with the **Garden Cost Estimator** and **Free Portfolio Builder** — one per side — as the wedge.

---

## 7. Portfolio & website builder (the supply moat)

This is what turns a directory (low pro engagement) into a platform (high pro lock-in).

- **Auto-themed:** Firecrawl extracts the pro's real logo, colours and imagery so their GreenList portfolio/mini-site looks like *them* on day one — minimal effort to start (low activation energy), then they refine (IKEA effect).
- **Structured projects:** each project = photos (before/after), style tags, budget band, location, plants/materials, a short story. This same structured data powers `/ideas/*` and location pages — supply work *is* SEO fuel.
- **Completeness mechanics:** a progress bar + "profiles with portfolios get Nx more enquiries" (goal-gradient + loss aversion) drives them to finish.
- **Switching cost:** once their portfolio, reviews fingerprint, mini-site, and quote history live here, leaving means rebuilding their entire online presence. That's the retention moat.
- **UX/UI research:** run lightweight usability passes (5-user tests) on both the buyer match-flow and the pro onboarding; apply the design/accessibility and ux-writing disciplines (clear empty states, microcopy, WCAG AA). Customise template colours/design per pro from extracted brand tokens, with sensible accessible defaults when extraction is thin.

---

## 8. The self-improving loop (human-in-the-loop)

The system must get better every week without a full rebuild. Design it as a closed loop with **humans on the high-stakes decisions**.

```
        ┌─────────────────────────────────────────────┐
        │ 1. GENERATE / REFRESH                        │
        │  pipeline rebuilds fingerprints, scores,     │
        │  pages; SEO/AEO templates regenerate         │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │ 2. MEASURE                                   │
        │  rankings, indexation, AI-citation share,    │
        │  tool conversions, lead quality, pro signups │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │ 3. FLAG (automatic)                          │
        │  thin pages, low-confidence fingerprints,    │
        │  risk flags, pages losing rank, bad leads    │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │ 4. HUMAN FEEDBACK  ◄── the moat & the safety │
        │  reviewers approve/correct: risk flags,      │
        │  ranking methodology, page quality, disputes,│
        │  tone. Pros can dispute their fingerprint.   │
        └──────────────────┬──────────────────────────┘
                           ▼
        ┌─────────────────────────────────────────────┐
        │ 5. LEARN                                     │
        │  corrections become rules/prompts/training   │
        │  signals; winning patterns get scaled,       │
        │  losers pruned → back to step 1              │
        └─────────────────────────────────────────────┘
```

Why humans are non-negotiable here:
- **Legal/reputational:** publishing an AI-derived "risk flag" about a real business without review is dangerous. A human approves anything negative; pros get a right of reply.
- **Quality compounding:** every human correction is a labelled example that improves the next generation's prompts/rules — the loop literally trains your moat.
- **SEO safety:** humans catch thin/cannibalising pages before Google does.

**Operationalise it:** a simple internal review queue (approve/edit/reject + reason), feedback stored as structured `Feedback` events, weekly "what moved / what to scale / what to prune" review. This is also where you avoid the **cobra effect** — watch that incentives (e.g. "publish more pages") don't quietly produce thin junk.

---

## 9. Business model & growth

### 9.1 Monetisation (avoid the pay-per-lead trap incumbents are hated for)

Layer revenue so pros never feel ripped off:

1. **Freemium pro profiles** — free listing + portfolio + mini-site (acquisition engine). 
2. **Pro subscription** (the core) — enhanced placement, unlimited portfolio, custom domain, lead inbox, reputation tools, analytics. Three tiers, middle tier as the target (good-better-best + decoy).
3. **Verified/featured placement** — capped per location so it stays credible (scarcity).
4. **Qualified-match fees or flat lead packages** — *quality over quantity*, the anti-Bark positioning ("we don't sell one job to ten people").
5. **Adjacent:** insurance/finance/supplier referrals, premium homeowner tools later.

Pricing psychology: anchor with the top tier, charm-price value tiers, frame as "£X/day", offer a no-risk guarantee to beat regret aversion.

### 9.2 Go-to-market — depth before breadth

1. **Pick one region + one hero sub-vertical** (e.g. *landscapers in Greater Manchester*). Reach critical mass of supply + content there before expanding. A dense, excellent regional graph ranks and converts far better than a thin national one.
2. **Seed supply** via the free tools: cold/warm outreach offering pros a *free* reputation report + portfolio + mini-site (give-first reciprocity). Their content makes your pages non-thin.
3. **Seed demand** via the programmatic cost/ideas/best-of pages + the cost estimator capturing "[service] cost in [town]" intent.
4. **Expand** region-by-region only once the loop is turning.

### 9.3 Social & content (social-content discipline)

- **Instagram/Pinterest/TikTok** are where garden inspiration already lives — repurpose portfolio before/afters and AI-design previews into reels/pins (each links back to a pro + a page).
- **Reddit/YouTube** for AEO presence (cost breakdowns, "how to choose a landscaper", project tours).
- **Pro spotlights** — featuring a pro's project is content for you, social proof for them, and a referral hook.
- Turn every cost guide and "best-of" into a carousel and a short video — one research effort, many channel outputs.

### 9.4 Referral / virality

- **Pro referral:** pros invite peers (more supply = more content). Watch for cobra-effect gaming; reward *completed, verified* profiles, not signups.
- **Buyer virality:** shareable quiz results, AI design previews, and "I found my gardener on GreenList" review prompts.

---

## 10. Roadmap & metrics

### 10.1 Phased build

**Phase 0 — Foundations (weeks 1–4)**
- Lock positioning context (`.agents/product-marketing-context.md`), brand, one launch region.
- Stand up the data model + Apify ingestion for the region; Semrush page plan (top 20% patterns).
- Ship the **Garden Cost Estimator** (buyer wedge) and a basic listing + profile template with schema.

**Phase 1 — The moat (weeks 5–10)**
- Review-intelligence pipeline → fingerprints (with human-review queue).
- **Free Portfolio Builder + auto-themed mini-site** (supply wedge) via Firecrawl extraction.
- Programmatic location + cost + best-of pages live; AEO blocks + FAQ/HowTo schema; AI crawlers allowed.

**Phase 2 — The loop (weeks 11–16)**
- Self-improving loop wired: measure → flag → human feedback → learn.
- Comparison ("[competitor] alternative") and ideas pages; AI design preview tool.
- Pro subscription + matched-lead monetisation; referral mechanics.

**Phase 3 — Scale (post-16 weeks)**
- Expand region by region once the regional loop is turning and unit economics are proven.
- Add more free tools by scorecard; deepen AEO third-party presence; monitor AI citation share.

### 10.2 North Star + metric tree

**North Star:** *number of verified garden projects completed through GreenList* (captures value to both sides; resists vanity).

| Layer | Metrics |
|-------|---------|
| SEO/AEO | Indexation rate, ranked keywords, AI-citation share, organic sessions, % pages above thin-content threshold |
| Tools | Tool sessions, completion rate, email capture rate, tool→match conversion |
| Supply | Pros listed, % with completed portfolios, % with mini-site, pro retention |
| Demand | Matches requested, lead quality score, buyer satisfaction |
| Loop | # human-feedback events, correction rate trending down, pages pruned/scaled |
| Revenue | Free→paid conversion, MRR, ARPU, payback period |

Watch for: thin-content/manual-action warnings, keyword cannibalisation, lead-quality complaints, fingerprint dispute rate.

---

## 11. Risks & how to defuse them

| Risk | Defuse |
|------|--------|
| **Thin-content / Google penalty** | Quality gate per page; unique data (fingerprints, local review themes, portfolios); noindex empty variants; human QA in the loop |
| **Scraping legality / source terms** | Public data only, respect robots/ToS, prefer official APIs, store provenance, publish *derived* signals not raw third-party text |
| **Defamation from auto "risk flags"** | Human approval on all negative signals; pro right-of-reply; show review count + confidence; conservative thresholds |
| **Cold-start (no supply → thin pages)** | Region-by-region; seed supply with free reputation report + portfolio + mini-site before going wide |
| **Incumbent response** | Vertical depth + two-sided free tools they can't quickly match; first-mover authority compounding |
| **AI Overviews reduce clicks** | Win the citation (AEO) and capture intent inside tools/matches, not just blue-link clicks |
| **Pro churn** | Lock-in via portfolio + mini-site + reputation tools (switching cost); quality leads, not spam |
| **Incentive backfire (cobra effect)** | Reward verified/completed actions; monitor for gaming in referrals and page generation |

---

## 12. Deepening value on both sides (what AI now makes possible)

The directory's job is no longer "list businesses." With AI, GreenList can give each side something they'd otherwise pay multiple vendors for — which is the real reason both sides show up and stay. Think of it as **two products sharing one data spine.**

### 12.1 For buyers — from "find a pro" to "plan my garden"

| Value | What it does | Why it's sticky / hard to copy |
|-------|-------------|-------------------------------|
| **AI Garden Visualiser** ⭐ | Upload a photo of your garden → photoreal redesigns in chosen styles, with an itemised plant + materials list and a real local cost band | The hero magnet. Turns a vague dream into a concrete, costed brief — and silently produces a perfect lead for matched pros |
| **Project Copilot** | A chat that scopes the job: asks the right questions, flags planning permission, drainage, sun/aspect, soil/postcode-appropriate plants, realistic sequencing | Replaces hours of anxious Googling; demonstrates expertise; no incumbent offers guided scoping |
| **Visual match (not keyword match)** | "Show me pros who've actually built *this*" — matches your saved design to portfolios by image similarity | Only works because you hold structured portfolio data — pure proprietary advantage |
| **Honest price intelligence** | Local price bands from aggregated real data + "here's what drives your price up/down" | Calms the #1 buyer anxiety; calibrated on many pros, not one |
| **Living maintenance plan** | Detects plants from the photo → a personalised seasonal calendar + reminders | Recurring engagement → email list → retention → repeat referrals |

The throughline: buyers come for the **free visualiser/copilot**, get a costed plan, and convert into a high-quality matched enquiry. The tool *is* the lead-gen.

### 12.2 For pros — a "business-in-a-box" that replaces 4–5 tools

The live test found a telling detail: even 5-star pros get dinged on **admin** ("slow to send the final invoice"). Most solo gardeners have no website, no CRM, no marketing, and hate paperwork. AI lets GreenList be all of it:

| Value | Replaces | Why pros onboard even with zero buyers |
|-------|----------|----------------------------------------|
| **AI Receptionist / lead qualifier** ⭐ | Missed calls, slow replies | Answers & qualifies enquiries 24/7 and books site visits — directly wins the "first responder gets the job" race |
| **Portfolio + auto-themed mini-site** | A £1–3k website project | Their whole web presence, built from data you already scraped, in minutes |
| **Instant quote/invoice builder** | Manual quoting, the admin complaint | Photos + site visit → branded itemised quote/invoice fast; fixes the exact thing reviews complain about |
| **Reputation autopilot** | Review chasing + reputation tools | Auto-requests verified reviews post-job, drafts replies, surfaces improvement themes |
| **Marketing engine** | An agency / freelancer | Social before/afters, Google Business posts, ad copy, local case-study blog — auto-generated from completed jobs |
| **Win-rate intelligence** | Guesswork | "Pros like you charge £X, respond in Y, win Z%" benchmarking |

This is the supply moat made concrete: once a pro runs their **leads, quotes, reviews, portfolio, mini-site and marketing** through GreenList, leaving means rebuilding their entire operation. And every one of these features *generates the unique content and verified data* (§3 of the evaluation doc) that powers your SEO/AEO. **Value creation and moat creation are the same actions.**

> Cost note: the text-LLM features (receptionist, copilot, quote drafting, marketing copy) are cheap per use. The expensive one is image generation (visualiser) — gate, cap, and cache it (see §13).

---

## 13. The low-ongoing-cost AI traffic engine

The goal: **high, compounding traffic where AI does the expensive work once (at build/ingest time) and visitors are then served near-free.** Avoid the trap of paying an LLM on every page view, and avoid mass-producing thin AI pages Google will penalise.

### 13.1 The core principle: pay at build time, serve static

```
  EXPENSIVE (occasional)              CHEAP / FREE (every visit)
  ─────────────────────              ──────────────────────────
  Apify ingest (cents/pro)     ──►   Static pages (SSG/ISR) on edge CDN
  LLM synthesis at ingest      ──►   Pre-rendered, cached HTML
  Image gen (capped/cached)    ──►   Client-side tools (compute in browser)
  Re-run only on data deltas   ──►   $0 marginal cost per pageview
```

Every programmatic page is generated **once** from proprietary data, stored static, and regenerated only when the underlying data changes. The LLM cost is amortised across thousands of visits. Hosting static pages on an edge CDN is effectively free at scale.

### 13.2 Six compounding, low-cost traffic sources

1. **Proprietary-data programmatic pages (SSG).** Location/cost/best-of/style pages backed by your trust graph + price index. Unique because of *your* data, so they rank and dodge thin-content penalties. Generated once, served static.
2. **Client-side free tools.** The cost estimator, quiz, and maintenance-calendar run entirely in the browser → zero marginal cost, infinitely scalable, and link-magnets. (Only the image visualiser hits a server — cap it.)
3. **Pro- and user-generated content network.** Every portfolio, case study, mini-site and verified review is a fresh, unique page you didn't write. The marketplace **produces its own SEO fuel** — the cheapest content of all.
4. **Original-data content / PR linkbait.** From data you already hold: a quarterly "UK Garden Price Index", "most-requested styles by region", "State of Garden Hiring". Journalists and bloggers link to original data; AI engines cite statistics. One generation, years of backlinks.
5. **AEO / GEO (free + compounding).** Structured, stat-rich, FAQ/HowTo pages get cited by ChatGPT/Perplexity/AI Overviews at no ongoing cost. As AI search grows, this share compounds. (Allow the AI crawlers; lead with extractable answer blocks.)
6. **Off-domain seeding.** Repurpose portfolios/visualiser outputs to Pinterest/Instagram/YouTube/Reddit — where garden inspiration already lives — each linking back. Mostly a one-time content cost.

### 13.3 The runtime self-improving loop, made cheap

The "self-improving loop with human feedback" runs on **batch jobs, not live inference**: a scheduled pass re-ingests deltas, re-scores, regenerates only changed pages, flags anomalies for human review, and folds corrections into the next batch. Visitors never trigger an LLM call. This keeps the loop's cost proportional to *data change*, not *traffic* — so traffic can grow 100× with almost flat cost.

### 13.4 What to spend on vs. not

| Spend (worth it) | Don't spend (trap) |
|------------------|--------------------|
| One-time LLM synthesis at ingest | Per-pageview LLM calls |
| Capped/cached image generation for the visualiser | Uncapped image gen open to the world |
| Periodic data refresh (Apify, cents) | Mass-generating thin pages with no proprietary data |
| Edge/static hosting | Heavy server rendering per request |

**Bottom line:** the engine's ongoing cost is roughly *hosting (static, cheap) + periodic re-ingest (cents) + capped image gen*. Traffic and the content moat compound; cost stays roughly flat. That is the asymmetry to build around — and it's exactly what the Cursor handover (`cursor-build-handover.md`) is architected to deliver.

---

## Appendix A — First-week build checklist (AI-assisted)

1. Confirm brand name + launch region; write the product-marketing-context file.
2. Apify: identify + test the Google Maps/Places Actor for the region; load ~100 seed pros.
3. Semrush: export the keyword universe; score and pick the first 20% of page patterns.
4. Generate the **Garden Cost Estimator** (single-file tool) using your seed price data.
5. Stand up listing + profile templates with `LocalBusiness`/`AggregateRating`/`FAQPage` schema and the direct-answer/40–60-word block structure.
6. Draft the review-intelligence prompt → produce a fingerprint for 10 pros → **human-review the output** before anything publishes.
7. Set `robots.txt` to allow AI crawlers; submit per-type sitemaps.

## Appendix B — Skills/disciplines this blueprint draws on

programmatic-seo · ai-seo (AEO/GEO) · free-tool-strategy · marketing-psychology · product-marketing-context · social-content · marketing-ideas · site-architecture · page-cro · design/ux-writing/accessibility · competitor analysis. Pull each in during build for the relevant module.

---

## Sources

- [Checkatrade — Landscapers in the UK](https://www.checkatrade.com/Search/Landscaper/in/Uk)
- [Checkatrade — Gardeners in the UK](https://www.checkatrade.com/Search/Gardener/in/Uk)
- [Houzz Pro — Landscape contractor leads](https://pro.houzz.com/for-pros/software-landscape-contractor-leads)
- [Privyr — Best platforms to get leads in the UK](https://www.privyr.com/blog/best-platforms-to-get-handyman-leads-in-the-uk/)
- [BuildPartner — Best UK lead generation companies for contractors](https://buildpartner.com/7-best-lead-generation-companies-for-uk-building-contractors/)
- [LandscapingCost.co.uk — Garden landscaping cost 2025](https://landscapingcost.co.uk/cost-to-landscape-a-garden/)
- [SmartSpender — Landscape gardener cost per m²](https://smartspender.uk/landscape-gardener-cost/)
- [The Outdoor Living Co — Garden budget calculator](https://theoutdoorliving.co.uk/budget-calculator/)
- [Comrade — SEO for landscapers](https://comradeweb.com/blog/seo-for-landscapers/)
- [Pro Landscaper UK — Landscaping SEO strategy](https://www.prolandscapermagazine.com/2026/05/21/landscaping-seo-strategy-how-landscapers-can-win-more-local-jobs-from-google/)

*Market figures are directional (sourced June 2026); validate exact local volumes, CPCs and price bands in Semrush/Ahrefs before committing budget.*
