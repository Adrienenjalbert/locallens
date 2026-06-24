# Portfolio Builder — Build Spec
### Self-serve portfolio → SEO pages → ratings → social remix, on one SEO-consolidated domain

*v1.0 · June 2026 · companion to `cursor-build-handover.md` and the GreenList/LocalLens strategy docs*

This spec turns the "help clients build a portfolio from a simple form that auto-creates SEO pages, collects ratings, and remixes content into social posts" idea into a sequenced build. **Milestone P0–P1 is already implemented and verified** (see §4); the rest is the backlog.

---

## 1. The architecture decision (settled)

**Build portfolio content as native subfolder routes on the one root domain. Internal linking is the SEO moat.** This was chosen over the two alternatives that were on the table:

| Option | Verdict | Why |
|--------|---------|-----|
| **Subfolder routes on root** (`/[vertical]/[location]/[business]/work/[project]/`) | **Chosen** | All authority + internal-link equity consolidates on one domain; each project is unique content that compounds. No proxy needed because content is native to the app. |
| **Per-client subdomain** | Rejected (default) | Splits domain authority (the exact thing `blueprint §5.1` warns against); not the client's "own" domain either — worst of both. |
| **Per-client custom domain** | Deferred → paid vanity upsell only | Offer later as a 301 redirect (or proxy with `rel=canonical` → root) so the client gets a memorable URL while the root keeps the SEO credit. |
| **Reverse proxy** | Only if the builder is later split into a separate app | A proxy is for surfacing *off-domain* content in a subfolder. Unnecessary while the builder lives in this Next.js app. |

**Consequence for self-serve:** user-generated content is created at runtime, so pure static export (current GitHub Pages setup) must move to **on-demand ISR** (publish a project → revalidate just that page + its linked directory pages). That is the Vercel migration `cursor-build-handover.md` already anticipated. Until then, content is seeded and built statically (as in §4).

---

## 2. URL + internal-linking architecture

```
/[vertical]/[location]/                          location directory (hub)
/[vertical]/[location]/[business]/               business profile / mini-site (hub)
/[vertical]/[location]/[business]/work/[project]/ project page (spoke, UGC SEO surface)
/ideas/[style]/                                  cross-pro style gallery (aggregation)
```

**Hub-and-spoke links every project injects (both directions):**

```
project ──► business hub · location page · /ideas/[style] · 2–3 related projects
business hub ──► its project thumbnails
location page ──► "Recent work in {place}" strip → projects
/ideas/[style] ──► every matching project across all businesses
```

Each new project = one unique page + 4–5 fresh internal links into the directory grid. That is the compounding mechanism.

---

## 3. Data model

`PortfolioProject` (`src/lib/portfolio/projects.ts`) is a superset of the `portfolio_item` DB row (`supabase/migrations/0001_foundation.sql`) plus SEO/tagging fields the builder will populate:

- Identity: `slug`, `vertical`, `location`, `business`
- Copy: `title`, `summary` (40–60w answer-first), `description`
- Tags: `service`, `style`, `materials[]`
- Media: `images[]` (`url`, `alt`, `before?`, `after?`)
- Trust: `review?` (verified, post-job)
- Meta: `locationName`, `completedAt`, `lastModified`

DB follow-up (P2): add `slug`, `summary`, `service`, `style`, `materials`, `before/after` flags, and a project↔review FK to `portfolio_item` so the self-serve writes map 1:1 onto this shape.

---

## 4. What's implemented now (P0–P1) — verified

- **Data + helpers:** `src/lib/portfolio/projects.ts` (+ `projects.test.ts`) — model, seed (3 GreenThumb projects), `projectsForBusiness/Location/Style`, `relatedProjects`, path helpers.
- **Project page:** `src/app/[vertical]/[location]/[business]/work/[project]/page.tsx` + `src/views/PortfolioProjectView.tsx` — before/after gallery, tags, verified review, related projects, CTA.
- **Style gallery:** `src/app/ideas/[style]/page.tsx` + `src/views/IdeasGalleryView.tsx` — cross-pro aggregation.
- **Schema:** `buildCreativeWorkJsonLd` in `src/lib/tools/jsonld.ts` (CreativeWork + embedded Review/Rating) + `jsonld.test.ts`.
- **Internal linking:** real portfolio grid in `ProfileView`; "Recent work" strip in `LocationPage`.
- **Discoverability:** project + ideas pages registered in `src/lib/seo/pages.ts` → flow into `sitemap.xml`.
- **Social remix (P4.2):** `src/lib/portfolio/social.ts` (+ `social.test.ts`) — `buildSocialPack` turns a project into 6 ready-to-paste channel posts (Instagram, Facebook, Google Business Profile, Pinterest, X, Reel/TikTok script) with hashtags + link-back. `src/components/portfolio/SocialPackPanel.tsx` gives copy-per-channel; surfaced as "Promote this project" on the project page. Template-based → **zero marginal cost**.
- **Self-serve builder (P3.1):** `src/lib/portfolio/draft.ts` (+ `draft.test.ts`) — slug + auto-drafted summary/description + readiness ("confirm, don't compose"). `src/components/portfolio/ProjectBuilder.tsx` — pre-filled form with a **live preview** (page card + the social pack regenerating as you type), at `/app/portfolio` (added to `AppShell` nav). Writes to Supabase under RLS when connected, falls back to a confirmed preview otherwise.
- **Persistence (P2.1):** `supabase/migrations/0008_portfolio_projects.sql` — extends `portfolio_item` (slug, summary, service, style, materials, `images_meta` jsonb, published gate) + project↔review FK.

**Evidence:** `typecheck` clean · 109 tests pass · `lint` clean (0 warnings) · static build emits 66 pages incl. 3 project pages, 3 galleries and `/app/portfolio` · sitemap contains all 6 portfolio URLs · project HTML carries BreadcrumbList + CreativeWork + Review + Rating, the hub-and-spoke links, and the generated social posts.

---

## 5. Self-serve onboarding (confirm, don't compose)

Non-technical pros never face a blank form — pre-fill from the existing scrape (Google Maps + Firecrawl brand tokens), then they confirm:

1. **Start** — pick "we found you" / magic link (reuse `/claim`).
2. **Confirm** pre-filled logo, colours, services, location, reviews.
3. **Add work** (the only effort) — mobile photo upload + "what / where / before-after?". AI does tagging + description + SEO title/meta.
4. **Publish** — generate project page, refresh hub, revalidate linked directory pages (ISR).
5. **Grow** — fire review-request email; generate the social pack.

"User vs enterprise" = one model (`Account → Business → Project[] + TeamMember[]`); enterprise adds bulk upload + seats.

---

## 6. AI pipeline (build/ingest-time, cached — never per pageview)

Per project, run once at publish and cache (per the §13 cost thesis):
- **Tag**: style + materials + service from photos + answers.
- **Describe**: `summary` (40–60w) + `description` body.
- **SEO**: title/meta/slug.
- **Social pack**: IG caption+hashtags, FB, **GBP post**, Pinterest pin, X, before/after reel script — each linking back to the project page (off-domain seeding).

All calls go through a single guarded `llm/` wrapper (cache + caps + cost log).

---

## 7. Ratings

Reuse the review engine (`review-email-template.ts`, `ReviewEmailOnboarding`): post-job request → happy to Google, unhappy private. Verified reviews attach to the business hub (`AggregateRating`) and the specific project (`Review` on the CreativeWork — already wired). Feeds `quality-score.ts` → ranking → visibility → leads → more jobs/reviews/projects.

---

## 8. Ticket backlog

**P0 — Foundations** ✅ done — data model + seed + helpers + tests.
**P1 — Static pages + linking** ✅ done — project route, ideas galleries, CreativeWork schema, ProfileView/LocationPage wiring, sitemap.
**P2 — Persistence**
- `P2.1` ✅ **done** — `portfolio_item` extended (slug/summary/service/style/materials/`images_meta`/published) + project↔review FK: `supabase/migrations/0008_portfolio_projects.sql`. Follow-up: add RLS policy for the new columns; apply migration to the live DB.
- `P2.2` Build pages from DB at build time (replace seed). *AC: `generateStaticParams` + `PUBLISHED_PAGES` read Supabase; no seed.*
**P3 — Self-serve onboarding**
- `P3.1` ✅ **done** — pre-filled builder with live preview + auto-drafted copy: `ProjectBuilder.tsx` at `/app/portfolio`. *No blank fields; readiness-gated publish; writes to Supabase or previews.*
- `P3.2` Mobile photo **upload** (Supabase Storage bucket) to replace URL inputs. *AC: upload N photos from phone; mark before/after; thumbnails.*
**P4 — Content pipeline**
- `P4.1` Tag+describe+SEO pass via `llm/` (cached). *AC: one project → tags + summary + meta; cost logged; cached by input hash.* (Until this lands, tags/summary are author-supplied on the project record.)
- `P4.2` ✅ **done** — Social pack generator (template-based, zero-cost): `src/lib/portfolio/social.ts` + `SocialPackPanel`, 6 channels, copy-per-channel, link-back, on the project page. Follow-ups: image/asset download bundle; direct scheduling (see P7).
**P5 — Ratings loop**
- `P5.1` Post-job review request → verified review → project + hub. *AC: review appears on both; feeds Quality Score.*
**P6 — Infra / publish loop**
- `P6.1` Move to Vercel + ISR on-demand revalidation. *AC: publishing a project revalidates its page + linked directory pages; serve static.*
- `P6.2` Custom-domain vanity upsell (301/canonical→root). *AC: client domain resolves; canonical stays root; SEO unaffected.*
**P7 — Scheduling (optional)**
- `P7.1` Direct posting to GBP/Meta/Pinterest. *AC: schedule a generated post; status tracked.*

---

## 9. Cost & SEO guardrails

- AI runs once at publish, cached; pages served static/ISR → flat cost as traffic grows.
- Image generation (if added) gated + capped.
- Thin-content guard: a project publishes only with ≥1 real photo + summary + tags.
- Canonical always on the root subfolder; custom domains never become canonical.
