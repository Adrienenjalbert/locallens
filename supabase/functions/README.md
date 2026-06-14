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

Run order: `etl-extract → etl-normalise → etl-resolve → etl-score`. Each is idempotent and logs to `pipeline_run`.

### Affiliate + routing

| Function | Route | Purpose |
|---|---|---|
| `affiliate-redirect` | `GET /functions/v1/affiliate-redirect?offer=&dec=&sess=` | Resolve an affiliate click server-side: record a `touch`, mint a subid, 302 to the partner deep-link. Keeps affiliate URLs out of page source. |
| `affiliate-postback` | `POST /functions/v1/affiliate-postback/:network` | Verified conversion webhook: match subid → write a normalised `conversion` (GBP), idempotently. |
| `router-candidates` | `POST /functions/v1/router-candidates` | Build the scored `Candidate[]` (affiliate relevance + EPC, lead, subscription) the front-end RevenueRouter ranks. |

## Local dev

```bash
supabase start
supabase functions serve --no-verify-jwt        # serves all functions locally
```

## Deploy

```bash
for fn in etl-extract etl-normalise etl-resolve etl-score \
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
