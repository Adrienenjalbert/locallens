-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0008_portfolio_projects.sql — enrich portfolio_item for SEO project pages ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Aligns the portfolio_item row with the PortfolioProject model the front end
-- renders (src/lib/portfolio/projects.ts) so the self-serve builder writes the
-- fields that make each project a unique, slugged, internally-linked page.
-- Additive + idempotent: safe to run on an existing DB.

alter table portfolio_item
  add column if not exists slug        text,
  add column if not exists summary     text,                 -- 40–60w answer-first
  add column if not exists service     text,                 -- taxonomy service slug
  add column if not exists style       text,                 -- e.g. "modern"
  add column if not exists materials   text[] not null default '{}',
  add column if not exists images_meta jsonb  not null default '[]',  -- [{url,alt,before,after}]
  add column if not exists published   boolean not null default false; -- human-gate before public

comment on column portfolio_item.images_meta is
  'Structured images [{url,alt,before,after}] powering the before/after gallery + ImageObject schema. The legacy images text[] stays in sync as a flat URL list.';

-- One stable slug per business → clean /[vertical]/[location]/[business]/work/[slug]/ URLs.
create unique index if not exists portfolio_item_business_slug_uidx
  on portfolio_item (business_id, slug)
  where slug is not null;

-- Only published, slug-bearing projects are eligible to emit a page.
create index if not exists portfolio_item_published_idx
  on portfolio_item (business_id, published)
  where published;

-- Attach a verified post-job review to a specific project (Moat B → project page).
alter table review
  add column if not exists portfolio_item_id uuid references portfolio_item(id) on delete set null;
create index if not exists review_portfolio_item_idx on review (portfolio_item_id);
