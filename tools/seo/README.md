# SEO/AEO research engine — research · score · rank (free tools)

The profit-aware page-selection feed for the CRISP-DM **pSEO + market-entry** loop
(`docs/01-DATA-SCIENCE.md` §4, Build Plan Prompt 9). It turns free keyword/question
research into a ranked set of `page` candidates — the rows the build's
page-selection step would queue — instead of the hard-coded gardeners×Manchester seed.

**What it does, end to end:**

1. **Research** keyword + question candidates from your seed terms using two
   **free** signals:
   - **Google Autocomplete** (the public suggest endpoint — no key, no cost): the
     long-tail, question-shaped queries AI answer engines extract.
   - **Offline question templates** ("People Also Ask"-style): deterministic
     expansion into `in {metro}`, `near me`, `best`, `cost`, `vs`, `do i need …`
     forms, each mapped to a page type + intent.
2. **Score** each candidate with the pure **Opportunity model**
   (`src/lib/scoring/opportunity.ts` — unit-tested source of truth):

   ```
   opportunity = volume × intent_weight × competition_gap   (demand)
               × affiliate_rpm_potential                    (earns day-one, no operators)
               × supply_readiness                            (enough data to be useful)
   ```

3. **Rank** into a build queue + compute a **market-entry score** (can this
   vertical×metro be entered and affiliate-funded *before* supply outreach?).
4. **Output** a ranked `page-candidates.csv` + `.json`.

**Cost model:** £0. Autocomplete is free; scoring is pure local code. Volume +
competition are **heuristic** estimates (clearly flagged in the code) — when you
wire **Google Search Console** (free, OAuth) or **Keyword Planner** for real
volumes, swap the `estimateVolume`/`estimateCompetition` calls in `research.ts`;
the scoring math downstream is unchanged.

## Quick start

```bash
# Dry-run — no keys, no network, bundled sample keywords
npm run seo -- --metro manchester --dry-run

# Real run — free autocomplete + offline templates
npm run seo -- --vertical gardeners --metro manchester --seeds "gardener,lawn care,garden clearance"

# Offline only (templates, no network calls)
npm run seo -- --metro leeds --seeds "gardener" --no-network
```

Outputs land in `tools/seo/out/<timestamp>/`.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--metro` | (required) | Town/city, e.g. `manchester` |
| `--vertical` | `gardeners` | Vertical slug (drives affiliate-RPM + supply defaults) |
| `--seeds` | the vertical | Comma-separated seed terms to expand |
| `--limit` | `50` | Max keyword candidates to process |
| `--dry-run` | off | Use bundled sample keywords; no network, no keys |
| `--no-network` | off | Offline template expansion only (skip autocomplete) |
| `--min-score` | `0` | Only output candidates at/above this opportunity score |

## How it plugs into LocalLens

- Scoring lives in `src/lib/scoring/opportunity.ts` so the **same function** can
  be mirrored into the Deno `etl-keywords` Edge function (like `quality-score`),
  keeping one source of truth for `keyword.opportunity_score`.
- The emitted `url` for each candidate matches the static-export route shape
  (trailing slash), so a buildable candidate maps directly to a `page` row.
- `affiliateFundable` in the market-entry output is the strategist's filter: a
  market can be validated by affiliate RPM with **zero operators** before any
  supply outreach (per the Master Strategy).
- Page selection stays **affiliate-aware + readiness-gated**: a candidate is only
  truly publishable once `computePageReadiness` (`page-readiness.ts`) also passes.
