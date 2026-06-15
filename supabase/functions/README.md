# Supabase Edge Functions

Deno functions that run the privileged, server-side parts of the engine. The
static GitHub Pages site calls these; all secrets stay here (never in the
browser bundle).

### ETL pipeline (raw → golden → scored)

| Function | Route | Stage | Purpose |
|---|---|---|---|
| `etl-extract` | `POST /functions/v1/etl-extract` | A | Pull Google Places + Apify → immutable `etl.raw_payload` (lineage). Idempotent + logged to `pipeline_run`. |
| `etl-normalise` | `POST /functions/v1/etl-normalise` | B | Map raw → `etl.staging_business` (UK phone E.164, postcode, taxonomy) with per-field provenance. |
| `etl-resolve` | `POST /functions/v1/etl-resolve` | C–F | Dedup (fuzzy name + geo + phone/web) → validate (hard/soft rules + `data_confidence`) → load golden `business` + `field_provenance`; low-confidence held. |
| `etl-score` | `POST /functions/v1/etl-score` | Score | Compute Quality Score (Bayesian) + `score_breakdown` + page-readiness; set status/noindex. |
| `etl-keywords` | `POST /functions/v1/etl-keywords` | Opportunity | Profit-aware page selection: score `keyword.opportunity_score` (volume × intent × gap × affiliate-RPM × supply) and queue buildable `page` rows. Live-loop counterpart of the `tools/seo/` CLI. |

Run order: `etl-extract → etl-normalise → etl-resolve → etl-score → etl-keywords`. Each is idempotent and logs to `pipeline_run`.

### Affiliate + routing

| Function | Route | Purpose |
|---|---|---|
| `affiliate-redirect` | `GET /functions/v1/affiliate-redirect?offer=&dec=&sess=` | Resolve an affiliate click server-side: record a `touch`, mint a subid, 302 to the partner deep-link. Keeps affiliate URLs out of page source. |
| `affiliate-postback` | `POST /functions/v1/affiliate-postback/:network` | Verified conversion webhook: match subid → write a normalised `conversion` (GBP), idempotently. |
| `router-candidates` | `POST /functions/v1/router-candidates` | Build the scored `Candidate[]` (affiliate relevance + EPC, lead, subscription) the front-end RevenueRouter ranks. |

### Monetisation + loop + verification

| Function | Route | Purpose |
|---|---|---|
| `stripe-checkout` | `POST /functions/v1/stripe-checkout` | Create a Stripe Checkout session for a paid plan (secret key server-side). |
| `stripe-webhook` | `POST /functions/v1/stripe-webhook` | Stripe events → upsert `subscription` (plan/status/MRR) for entitlements. |
| `improvement-agent` | `POST` (weekly cron) | CRISP-DM agent: score each surface vs rubric, auto-promote clear winners to config (decision_log.config_diff), pause losers, write the loop report + per-operator nudges. **Human-in-the-loop** for ranking/routing (proposes, never auto-applies). |
| `data-verify` | `POST` (scheduled) | Accuracy/freshness/dedup/completeness/provenance checks → `data_check`; can lower confidence + noindex. |
| `ui-verify` | `POST` (per-deploy + scheduled) | Screenshots × devices + visual-regression diff → `ui_snapshot`; broken = blocks release. |
| `seed-journeys` | `POST` | Upsert default comm templates + journeys for a business. |
| `bandit-update` | `POST` (scheduled) | Refresh RevenueRouter bandit posteriors: `router_decision` impressions + matched `conversion` successes → `bump_arm_stat` per (cell × arm). |

## Local dev

```bash
supabase start
supabase functions serve --no-verify-jwt        # serves all functions locally
```

## Deploy

```bash
for fn in etl-extract etl-normalise etl-resolve etl-score etl-keywords \
          affiliate-redirect affiliate-postback router-candidates; do
  supabase functions deploy "$fn"
done
```

## Secrets (never commit these)

```bash
supabase secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SITE_ORIGIN=https://<user>.github.io \
  GOOGLE_PLACES_API_KEY=... \
  APIFY_TOKEN=... \
  POSTBACK_SECRET_AWIN=... \
  POSTBACK_SECRET_IMPACT=...
```

> The ETL functions **gracefully no-op** without `GOOGLE_PLACES_API_KEY` / `APIFY_TOKEN`, so the pipeline and `pipeline_run` logging can be exercised locally before live keys exist.

## Flow

```
page → affiliate-redirect (touch:click + subid) → partner
partner → affiliate-postback (subid → conversion £) → revenue_per_session view → RevenueRouter loop
page → router-candidates (Candidate[]) → RevenueRouter.decide() → MonetisationSlot renders
```
