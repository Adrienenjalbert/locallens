# Outreach Engine — find · audit · personalise (free-LLM)

A cost-effective prospecting engine for the UK "Trade-in-a-Box" GTM (`docs/02-BUSINESS-PLAN-UK-GTM.md`).

**What it does, end to end:**

1. **Discover** landscaper/gardener businesses (name, website, phone, email, rating, review count) via the Apify **`compass/crawler-google-places`** actor — one query per town.
2. **Audit** each prospect's website with a **free heuristic auditor** (plain HTTP fetch + checks — *no LLM cost*): finds real, concrete issues (no HTTPS, no mobile viewport, slow/oversized, missing GBP/booking CTA, no reviews shown, missing meta/title, no phone click-to-call, etc.).
3. **Personalise** an outreach message that leads with the 2–3 highest-impact improvements, using a **free LLM** (Groq → Gemini fallback). The LLM is called **once per prospect**, on a tiny prompt, so you stay on free tiers.
4. **Output** a ready-to-send CSV + JSON (business, contact, score, top issues, the message).

**Cost model:** Apify is the only paid input (~£1.50–£5 / 1,000 places). Website audit = free (HTTP). LLM = free tier. Everything degrades gracefully: with no keys it runs in **dry-run** mode on sample data so you can see the shape of the output.

## Quick start

```bash
# 1. Install deps (from repo root)
npm install

# 2. Set keys (free) — copy and fill
cp tools/outreach/.env.outreach.example tools/outreach/.env.outreach
#   APIFY_TOKEN   -> apify.com (paid input, cheap)
#   GROQ_API_KEY  -> console.groq.com (FREE, no card)   [primary LLM]
#   GEMINI_API_KEY-> aistudio.google.com (FREE, no card) [fallback LLM]

# 3. Run a dry-run (no keys needed — uses sample data)
npm run outreach -- --town "Edinburgh" --query "landscaping" --limit 5 --dry-run

# 4. Real run
npm run outreach -- --town "Edinburgh" --query "garden maintenance" --limit 25
```

Outputs land in `tools/outreach/out/<timestamp>/` as `prospects.csv` and `prospects.json`.

## Flags

| Flag | Default | Meaning |
|---|---|---|
| `--town` | (required) | Town/city to search (e.g. "Edinburgh") |
| `--query` | `landscaping` | Search term (e.g. "garden maintenance", "gardener") |
| `--limit` | `25` | Max prospects to process |
| `--country` | `gb` | Apify country code |
| `--dry-run` | off | Skip Apify + LLM; use bundled sample data |
| `--no-llm` | off | Audit only; skip message generation (zero LLM calls) |
| `--min-score` | `0` | Only output prospects whose audit score is **below** this (worse sites = better prospects). e.g. `--min-score 70` keeps sites scoring <70 |

## Notes
- The auditor scores 0–100 where **lower = more improvement headroom = better prospect**. We surface the *worst* sites because those are the easiest to win with a clear before/after pitch.
- Respects robots-style courtesy: short timeouts, one fetch per site, identifies a normal UA.
- This is the standalone version. The same discovery step mirrors `supabase/functions/etl-extract` so it can later fold into the ETL pipeline.
