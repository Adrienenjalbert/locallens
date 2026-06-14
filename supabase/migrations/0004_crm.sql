-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0004_crm.sql — supply-side product: leads → quote → job → invoice → paid ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Owned by a claimed business. RLS (0007) scopes everything to business_id.
-- The leads inbox is the directory tie-in: directory/tool enquiries land here.

create type lead_status    as enum ('new', 'quoted', 'won', 'lost');
create type quote_status   as enum ('draft', 'sent', 'viewed', 'accepted', 'declined');
create type job_status      as enum ('booked', 'in_progress', 'completed', 'cancelled');
create type invoice_status  as enum ('draft', 'sent', 'paid', 'overdue');
create type comm_channel    as enum ('email', 'sms', 'whatsapp');

create table lead (
  id              uuid primary key default uuid_generate_v4(),
  business_id     uuid not null references business(id) on delete cascade,
  session_id      uuid references session(id),     -- ties lead → attribution spine
  source          text,                            -- which directory page / tool
  attributed_page text,
  contact_name    text,
  contact_phone   text,
  contact_email   text,
  message         text,
  job_type        text,
  location        text,
  status          lead_status not null default 'new',
  received_at     timestamptz not null default now(),
  first_response_at timestamptz                     -- powers speed-to-lead metric
);
create index lead_business_idx on lead (business_id, received_at desc);

create table customer (
  id            uuid primary key default uuid_generate_v4(),
  business_id   uuid not null references business(id) on delete cascade,
  name          text not null,
  phone         text,
  email         text,
  address       text,
  property_notes text,
  photos        text[] default '{}',
  tags          text[] default '{}',
  status        text not null default 'active',     -- active | lapsed
  lifetime_value numeric(12,2) default 0,
  created_at    timestamptz not null default now()
);
create index customer_business_idx on customer (business_id);

create table quote (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  customer_id  uuid references customer(id),
  lead_id      uuid references lead(id),
  line_items   jsonb not null default '[]',
  total        numeric(12,2) not null default 0,
  status       quote_status not null default 'draft',
  public_token text unique,
  sent_at      timestamptz,
  viewed_at    timestamptz,
  accepted_at  timestamptz
);

create table job (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  customer_id  uuid references customer(id),
  quote_id     uuid references quote(id),
  title        text,
  status       job_status not null default 'booked',
  scheduled_at timestamptz,
  recurrence   text,                                -- iCal RRULE (recurring = key for gardening)
  duration_min int,
  route_order  int,
  completed_at timestamptz,
  photos       text[] default '{}',
  notes        text
);
create index job_business_sched_idx on job (business_id, scheduled_at);

create table invoice (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  customer_id  uuid references customer(id),
  job_id       uuid references job(id),
  line_items   jsonb not null default '[]',
  total        numeric(12,2) not null default 0,
  status       invoice_status not null default 'draft',
  public_token text unique,
  sent_at      timestamptz,
  due_at       timestamptz,
  paid_at      timestamptz
);

-- ── Automated comms & lifecycle journeys (the "powerful" layer) ──
create table comm_template (
  id          uuid primary key default uuid_generate_v4(),
  vertical_id uuid references vertical(id),
  business_id uuid references business(id),       -- null = vertical default
  journey     text not null,                       -- new_lead | quote_followup | review_request …
  channel     comm_channel not null,
  subject     text,
  body        text not null,
  is_default  boolean not null default false,
  variant     text                                  -- for A/B (loop)
);

create table journey (
  id          uuid primary key default uuid_generate_v4(),
  business_id uuid references business(id),
  trigger     text not null,
  enabled     boolean not null default true,
  steps       jsonb not null default '[]'           -- [{delay_min, template_id, channel}]
);

create table comm_log (
  id           uuid primary key default uuid_generate_v4(),
  business_id  uuid not null references business(id) on delete cascade,
  customer_id  uuid references customer(id),
  journey      text,
  template_id  uuid references comm_template(id),
  channel      comm_channel,
  status       text,                                -- queued|sent|delivered|opened|clicked|bounced
  sent_at      timestamptz not null default now(),
  outcome      jsonb
);
create index comm_log_business_idx on comm_log (business_id, sent_at desc);

create table subscription (
  id                uuid primary key default uuid_generate_v4(),
  business_id       uuid not null references business(id) on delete cascade,
  plan              text not null,                  -- free | crm | growth
  status            text not null default 'active',
  current_period_end timestamptz,
  provider_ref      text,                            -- stripe subscription id
  mrr               numeric(10,2) default 0          -- normalised for attribution to RPM
);
