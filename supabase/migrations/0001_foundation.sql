-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0001_foundation.sql — extensions, enums, verticals, geo, golden records ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- LocalLens canonical data spine. The front end ONLY reads golden tables.
-- Raw/staging live in a separate schema (0002) and are never exposed.

create extension if not exists "postgis";
create extension if not exists "pg_trgm";        -- fuzzy name matching for dedup
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────────────
-- Enums (kept narrow; statuses that the loop reasons about)
-- ──────────────────────────────────────────────────────────────────────
create type business_status as enum ('published', 'held', 'rejected', 'duplicate');
create type page_status      as enum ('queued', 'generated', 'published', 'held', 'noindex');
create type funnel_stage      as enum ('research', 'compare', 'hire_now');
create type intent_value      as enum ('low', 'medium', 'high');

-- ──────────────────────────────────────────────────────────────────────
-- Vertical: the engine is config-driven. Everything that re-skins or
-- re-tunes a vertical lives in these jsonb blobs (see /config in the repo).
-- ──────────────────────────────────────────────────────────────────────
create table vertical (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  theme_config  jsonb not null default '{}',   -- design tokens
  score_weights jsonb not null default '{}',   -- Quality Score weights
  taxonomy      jsonb not null default '{}',   -- services/categories
  tool_config   jsonb not null default '{}',   -- per-vertical tool inputs
  router_policy jsonb not null default '{}',   -- RevenueRouter weights/thresholds (NEW)
  created_at    timestamptz not null default now()
);

create table location (
  id         uuid primary key default uuid_generate_v4(),
  slug       text not null,
  name       text not null,
  type       text not null default 'town',     -- city/town/borough
  lat        double precision,
  lng        double precision,
  geo        geography(Point, 4326),
  region     text,
  parent_id  uuid references location(id),
  unique (slug, region)
);
create index location_geo_gix on location using gist (geo);

-- ──────────────────────────────────────────────────────────────────────
-- Business: ONE golden record per real business (post entity-resolution).
-- ──────────────────────────────────────────────────────────────────────
create table business (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text not null,
  vertical_id         uuid not null references vertical(id),
  primary_location_id uuid references location(id),
  name                text not null,
  status              business_status not null default 'held',
  phone               text,
  website             text,
  address             text,
  postcode            text,
  geo                 geography(Point, 4326),
  hours               jsonb,
  categories          text[] default '{}',
  quality_score       numeric(5,2),            -- 0..100, computed
  score_breakdown     jsonb,                   -- stored, for "why ranked here" + audit
  badges              text[] default '{}',
  data_confidence     numeric(4,3) default 0,  -- 0..1
  last_verified_at    timestamptz,
  claimed_by          uuid,                    -- auth.users id when claimed
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (vertical_id, slug)
);
create index business_vertical_idx  on business (vertical_id);
create index business_location_idx  on business (primary_location_id);
create index business_geo_gix       on business using gist (geo);
create index business_name_trgm     on business using gin (name gin_trgm_ops);
create index business_score_idx     on business (vertical_id, quality_score desc);

create table service (
  id          uuid primary key default uuid_generate_v4(),
  vertical_id uuid not null references vertical(id),
  slug        text not null,
  name        text not null,
  unique (vertical_id, slug)
);

create table business_service (
  business_id uuid not null references business(id) on delete cascade,
  service_id  uuid not null references service(id) on delete cascade,
  price_band  text,
  primary key (business_id, service_id)
);

create table review_source (
  id             uuid primary key default uuid_generate_v4(),
  business_id    uuid not null references business(id) on delete cascade,
  source         text not null,
  external_rating numeric(3,2),
  review_count   int default 0,
  url            text,
  fetched_at     timestamptz not null default now()
);

create table review (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references business(id) on delete cascade,
  source      text not null,
  author      text,
  rating      numeric(3,2),
  text        text,
  sentiment   numeric(4,3),
  created_at  timestamptz
);
create index review_business_idx on review (business_id);

create table portfolio_item (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  title        text,
  images       text[] default '{}',
  description  text,
  location     text,
  completed_at date
);

create table credential (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references business(id) on delete cascade,
  type        text not null,
  identifier  text,
  verified    boolean not null default false,
  verified_at timestamptz
);

-- Per-field provenance powers trust badges + conflict resolution
-- (owner-verified > Google Places > scraped).
create table field_provenance (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid not null references business(id) on delete cascade,
  field       text not null,
  source      text not null,
  value       text,
  confidence  numeric(4,3),
  fetched_at  timestamptz not null default now()
);
create index field_provenance_business_idx on field_provenance (business_id, field);

-- ──────────────────────────────────────────────────────────────────────
-- Keywords & pages: demand-driven, now PROFIT-aware (see opportunity_score).
-- ──────────────────────────────────────────────────────────────────────
create table keyword (
  id           uuid primary key default uuid_generate_v4(),
  vertical_id  uuid not null references vertical(id),
  pattern      text,
  query        text not null,
  volume       int default 0,
  intent       intent_value not null default 'medium',
  funnel       funnel_stage not null default 'research',
  ai_overview  boolean default false,
  competition  numeric(4,3),
  opportunity_score numeric(6,2),  -- volume × intent × gap × affiliate-RPM-potential × supply
  page_id      uuid,
  created_at   timestamptz not null default now()
);

create table page (
  id                uuid primary key default uuid_generate_v4(),
  type              text not null,                 -- location/profile/service-location/best-of/tool/compare/guide
  url               text unique not null,
  vertical_id       uuid references vertical(id),
  location_id       uuid references location(id),
  business_id       uuid references business(id),
  status            page_status not null default 'queued',
  noindex           boolean not null default true, -- safe default; promoted on readiness
  funnel            funnel_stage not null default 'research',
  last_generated_at timestamptz,
  last_updated_at   timestamptz
);
create index page_type_idx on page (type, status);

-- updated_at trigger helper
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;
create trigger business_updated_at before update on business
  for each row execute function set_updated_at();
