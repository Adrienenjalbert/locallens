# Supabase Edge Functions

Deno functions that run the privileged, server-side parts of the engine. The
static GitHub Pages site calls these; all secrets stay here (never in the
browser bundle).

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
supabase functions deploy affiliate-redirect
supabase functions deploy affiliate-postback
supabase functions deploy router-candidates
```

## Secrets (never commit these)

```bash
supabase secrets set \
  SUPABASE_URL=... \
  SUPABASE_SERVICE_ROLE_KEY=... \
  SITE_ORIGIN=https://<user>.github.io \
  POSTBACK_SECRET_AWIN=... \
  POSTBACK_SECRET_IMPACT=...
```

## Flow

```
page → affiliate-redirect (touch:click + subid) → partner
partner → affiliate-postback (subid → conversion £) → revenue_per_session view → RevenueRouter loop
page → router-candidates (Candidate[]) → RevenueRouter.decide() → MonetisationSlot renders
```
