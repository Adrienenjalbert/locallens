-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0005_loop_quality.sql — CRISP-DM loop, experiments, authenticity, QA    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── Event spine: standardised {actor, surface, event, props} ──
create table event_log (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid references session(id),
  business_id uuid references business(id),
  actor       text not null,                       -- searcher | business | system
  surface     text not null,                       -- directory | tool | crm | affiliate | router
  event       text not null,                       -- view | click | lead_received | quote_sent | slot_decision …
  props       jsonb,
  created_at  timestamptz not null default now()
);
create index event_log_surface_idx on event_log (surface, event, created_at desc);
create index event_log_session_idx on event_log (session_id);

-- ── Experiments: every config default is the CHAMPION of an ongoing test ──
create table experiment (
  id            uuid primary key default uuid_generate_v4(),
  surface       text not null,                     -- ranking | pseo | tool | router | comms
  name          text not null,
  hypothesis    text,
  primary_metric text not null,
  guardrail_metric text,
  variants      jsonb not null default '[]',       -- [{key, config_patch, weight}]
  status        text not null default 'running',   -- running | won | lost | paused
  result        jsonb,
  min_exposure  int default 1000,
  started_at    timestamptz not null default now(),
  decided_at    timestamptz
);

create table experiment_assignment (
  id           uuid primary key default uuid_generate_v4(),
  experiment_id uuid not null references experiment(id) on delete cascade,
  session_id   uuid references session(id),
  variant_key  text not null,
  assigned_at  timestamptz not null default now()
);
create index exp_assignment_idx on experiment_assignment (experiment_id, variant_key);

-- ── Decision log: institutional memory (kept/killed/iterate + why) ──
create table decision_log (
  id           uuid primary key default uuid_generate_v4(),
  experiment_id uuid references experiment(id),
  surface      text,
  decision     text not null,                      -- promoted | retired | iterate
  rationale    text,
  config_diff  jsonb,
  created_at   timestamptz not null default now()
);

-- ── Authenticity: real signals, not AI slop ──
create table media_asset (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid references business(id) on delete cascade,
  url          text not null,
  type         text,                                -- photo | portfolio
  source       text,                                -- owner | google_places | licensed
  rights       text,
  is_ai        boolean not null default false,      -- HARD rule: never render AI as real work
  quality_score numeric(4,3),
  alt_text     text,
  verified     boolean not null default false
);

-- ── Page-readiness: never publish thin/ugly; now affiliate-aware ──
create table page_readiness (
  id                uuid primary key default uuid_generate_v4(),
  business_id       uuid references business(id),
  page_id           uuid references page(id),
  completeness_score numeric(4,3),
  affiliate_match    boolean default false,         -- a great affiliate match can make a low-supply page viable
  missing_fields    text[] default '{}',
  publishable       boolean not null default false,
  checked_at        timestamptz not null default now()
);

-- ── Constant verification (data + UI), both are release gates ──
create table data_check (
  id          uuid primary key default uuid_generate_v4(),
  target      text,                                 -- business/page id
  check_type  text not null,                        -- accuracy | freshness | dedup | completeness | provenance
  status      text not null,                        -- pass | fail | flag
  detail      jsonb,
  sampled_at  timestamptz not null default now()
);

create table ui_snapshot (
  id          uuid primary key default uuid_generate_v4(),
  page_type   text,
  url         text,
  device      text,
  screenshot_url text,
  diff_status text,                                 -- ok | changed | broken
  issues      jsonb,
  captured_at timestamptz not null default now()
);

-- ── Internal GTM: admin-only prospecting/outreach ──
create table prospect (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid references business(id),
  need_score   numeric(6,2),                        -- leads_received + unclaimed + weak presence + poor reviews
  signals      jsonb,
  owner_contact jsonb,
  enrichment_source text,
  status       text not null default 'new'          -- new | contacted | won | lost
);

create table outreach_log (
  id          uuid primary key default uuid_generate_v4(),
  prospect_id uuid references prospect(id) on delete cascade,
  channel     text,
  template    text,
  sent_at     timestamptz not null default now(),
  outcome     text,
  converted_to_business_id uuid references business(id)
);
