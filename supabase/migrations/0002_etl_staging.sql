-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0002_etl_staging.sql — raw + staging layers (server-side only)          ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- These tables are written ONLY by Edge Functions (service role). The front
-- end never reads them. raw_* is immutable (lineage); staging_* is the
-- normalised-but-not-yet-resolved layer feeding dedup → validate → load.

create schema if not exists etl;

create table etl.raw_payload (
  id           uuid primary key default uuid_generate_v4(),
  vertical_id  uuid not null,
  source       text not null,                 -- google_places | apify:<actor> | semrush
  request_params jsonb,
  payload      jsonb not null,                -- immutable original
  fetched_at   timestamptz not null default now()
);
create index raw_payload_source_idx on etl.raw_payload (source, fetched_at desc);

create table etl.staging_business (
  id            uuid primary key default uuid_generate_v4(),
  vertical_id   uuid not null,
  source        text not null,
  source_ref    text,                         -- e.g. google place_id
  name          text,
  phone_e164    text,
  website       text,
  address       text,
  postcode      text,
  lat           double precision,
  lng           double precision,
  hours         jsonb,
  categories    text[],
  field_sources jsonb,                         -- per-field source attribution
  golden_id     uuid,                          -- set by dedup when resolved
  fetched_at    timestamptz not null default now()
);
create index staging_business_golden_idx on etl.staging_business (golden_id);

create table pipeline_run (
  id          uuid primary key default uuid_generate_v4(),
  vertical_id uuid,
  source      text,
  stage       text not null,                  -- extract|normalise|dedup|validate|enrich|load
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  counts      jsonb,                          -- {extracted,new,updated,rejected,flagged}
  status      text not null default 'running' -- running|ok|error
);
