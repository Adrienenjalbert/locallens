-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0003_affiliate_revenue.sql — THE AFFILIATE RAIL + unified revenue spine ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- The first-class third revenue rail. Outbound affiliate monetisation:
-- the directory earns commission (CPC/CPL/CPA) by routing high-intent
-- traffic to relevant 3rd-party partners. Plus the unified attribution
-- ledger that lets ONE query answer "what did this session earn across
-- affiliate + lead + subscription?" — the data the RevenueRouter loop needs.

create type payout_model      as enum ('cpc', 'cpl', 'cpa', 'flat', 'revshare');
create type offer_status       as enum ('active', 'paused', 'dead', 'pending_review');
create type revenue_rail       as enum ('affiliate', 'lead', 'subscription', 'featured');
create type conversion_status  as enum ('pending', 'approved', 'rejected', 'paid');

-- ──────────────────────────────────────────────────────────────────────
-- Partner: an affiliate network or direct merchant we route traffic to.
-- ──────────────────────────────────────────────────────────────────────
create table affiliate_partner (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  network       text,                          -- awin | impact | cj | partnerstack | direct
  -- Server-side credentials reference (actual secrets live in Edge fn secrets):
  credential_ref text,
  default_payout_model payout_model not null default 'cpc',
  status        offer_status not null default 'active',
  created_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────
-- Offer: a specific monetisable unit a partner exposes, scoped to where it
-- is relevant. Relevance + targeting drive the RevenueRouter's choice.
-- ──────────────────────────────────────────────────────────────────────
create table affiliate_offer (
  id              uuid primary key default uuid_generate_v4(),
  partner_id      uuid not null references affiliate_partner(id) on delete cascade,
  slug            text unique not null,
  title           text not null,
  description     text,
  cta_label       text not null default 'View offer',
  -- Destination is resolved server-side at click time (deep-link + tracking id),
  -- never a raw exposed affiliate URL in the page source.
  landing_template text not null,              -- e.g. "https://partner/x?subid={subid}"
  payout_model    payout_model not null,
  payout_value    numeric(10,2),               -- expected £ per event (for E[rev] in router)
  currency        text not null default 'GBP',
  -- Targeting: where/when this offer is eligible.
  vertical_ids    uuid[] default '{}',          -- empty = all verticals
  funnel_targets  funnel_stage[] default '{}',  -- empty = all stages
  geo_scope       text,                         -- region/country filter, null = all
  keywords        text[] default '{}',          -- relevance matching terms
  -- Trust-floor metadata (compliance is data-driven + unskippable):
  disclosure_required boolean not null default true,
  rel_attribute   text not null default 'sponsored nofollow',
  -- Health + economics:
  status          offer_status not null default 'pending_review',
  epc             numeric(10,4),               -- earnings-per-click, learned from data
  last_health_check_at timestamptz,
  created_at      timestamptz not null default now()
);
create index affiliate_offer_status_idx on affiliate_offer (status);
create index affiliate_offer_kw_gin on affiliate_offer using gin (keywords);

-- ──────────────────────────────────────────────────────────────────────
-- Placement: where an offer is allowed to appear. The router fills a SLOT;
-- this table constrains which offers may compete for which slot/page-type.
-- ──────────────────────────────────────────────────────────────────────
create table affiliate_placement (
  id          uuid primary key default uuid_generate_v4(),
  offer_id    uuid not null references affiliate_offer(id) on delete cascade,
  slot        text not null,                   -- hero-cta | inline-after-shortlist | sidebar | tool-result-cta | sticky-mobile
  page_types  text[] default '{}',             -- empty = any page type
  priority    int not null default 0,          -- tiebreak; router primarily uses E[rev]
  cap_per_page int not null default 1,
  active      boolean not null default true
);
create index affiliate_placement_slot_idx on affiliate_placement (slot, active);

-- ──────────────────────────────────────────────────────────────────────
-- THE ATTRIBUTION SPINE — shared across ALL rails.
-- A `touch` is a monetisation interaction (impression/click) tied to a
-- session + the router decision that produced it. A `conversion` is money.
-- ──────────────────────────────────────────────────────────────────────
create table session (
  id           uuid primary key default uuid_generate_v4(),
  anon_id      text,                            -- first-party cookie/localStorage id
  first_page   text,
  vertical_id  uuid,
  location_id  uuid,
  device       text,
  intent_stage funnel_stage,
  intent_value intent_value,
  consent      jsonb,                           -- {analytics:bool, marketing:bool} (PECR/GDPR)
  utm          jsonb,
  created_at   timestamptz not null default now()
);
create index session_anon_idx on session (anon_id);

-- Every router decision is logged: which slot, what context, what it chose,
-- and why (the candidate scores). This is the training data for the bandit.
create table router_decision (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid references session(id),
  page_url     text,
  page_type    text,
  slot         text not null,
  context      jsonb,                           -- intent, geo-tier, device, supply-density…
  chosen_rail  revenue_rail,
  chosen_ref   uuid,                            -- offer_id | business_id | lead-slot
  candidates   jsonb,                           -- [{rail, ref, e_rev, allowed, reason}]
  policy_version text,
  created_at   timestamptz not null default now()
);
create index router_decision_slot_idx on router_decision (slot, created_at desc);

create table touch (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid references session(id),
  decision_id   uuid references router_decision(id),
  rail          revenue_rail not null,
  ref_id        uuid,                            -- offer/business/lead
  kind          text not null,                  -- impression | click
  subid         text,                            -- tracking id sent to partner (for postback match)
  created_at    timestamptz not null default now()
);
create index touch_session_idx on touch (session_id);
create index touch_subid_idx on touch (subid);

-- Money. One row per earned event, across rails, normalised to GBP.
create table conversion (
  id            uuid primary key default uuid_generate_v4(),
  rail          revenue_rail not null,
  touch_id      uuid references touch(id),
  session_id    uuid references session(id),
  ref_id        uuid,                            -- offer/business/lead/subscription
  subid         text,                            -- matched from partner postback
  amount        numeric(12,2) not null default 0,
  currency      text not null default 'GBP',
  status        conversion_status not null default 'pending',
  source        text,                            -- partner postback | stripe | internal
  occurred_at   timestamptz not null default now(),
  confirmed_at  timestamptz
);
create index conversion_rail_idx on conversion (rail, occurred_at desc);
create index conversion_subid_idx on conversion (subid);

-- ──────────────────────────────────────────────────────────────────────
-- Materialised-friendly view: RPM (revenue per 1000 sessions) per page type
-- × vertical — the directory North Star. The improvement-agent reads this.
-- ──────────────────────────────────────────────────────────────────────
create view revenue_per_session as
select
  rd.page_type,
  s.vertical_id,
  count(distinct s.id)                                   as sessions,
  coalesce(sum(c.amount) filter (where c.status in ('approved','paid')), 0) as revenue,
  case when count(distinct s.id) > 0
       then round(coalesce(sum(c.amount) filter (where c.status in ('approved','paid')),0)
                  / count(distinct s.id) * 1000, 2)
       else 0 end                                         as rpm
from session s
left join router_decision rd on rd.session_id = s.id
left join conversion c on c.session_id = s.id
group by rd.page_type, s.vertical_id;
