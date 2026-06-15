-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0007_bandit.sql — RevenueRouter contextual-bandit posteriors (R1)       ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- One Beta(alpha, beta) posterior per (context cell × arm). The bandit-update
-- function increments these from impressions (touch) and conversions; the
-- front-end loads the relevant cells to Thompson-sample arm selection. The
-- trust floor is enforced in code regardless — this only tunes which ALLOWED
-- arm to explore/exploit.

create table arm_stat (
  id          uuid primary key default uuid_generate_v4(),
  cell_key    text not null,                 -- "{pageType}|{intentStage}|{geoTier}"
  arm_key     text not null,                 -- "{rail}:{ref}"
  alpha       numeric(12,4) not null default 1,  -- 1 + conversions (successes)
  beta        numeric(12,4) not null default 1,  -- 1 + non-converting impressions
  impressions bigint not null default 0,
  conversions bigint not null default 0,
  policy_version text not null default 'bandit-v2',
  updated_at  timestamptz not null default now(),
  unique (cell_key, arm_key)
);
create index arm_stat_cell_idx on arm_stat (cell_key);

-- Public read so the front-end bandit can load posteriors for its cell (these
-- are non-sensitive aggregates; no per-user data). Writes are service-role only
-- (the bandit-update Edge Function), so enable RLS with a read-only policy.
alter table arm_stat enable row level security;
create policy arm_stat_public_read on arm_stat for select using (true);

-- Atomic posterior bump. delta_conversions counts successes; delta_impressions
-- counts trials. beta accrues trials that did NOT convert.
create or replace function bump_arm_stat(
  p_cell text,
  p_arm  text,
  p_impressions bigint,
  p_conversions bigint,
  p_policy text default 'bandit-v2'
) returns void as $$
begin
  insert into arm_stat (cell_key, arm_key, alpha, beta, impressions, conversions, policy_version)
  values (
    p_cell, p_arm,
    1 + p_conversions,
    1 + greatest(p_impressions - p_conversions, 0),
    p_impressions, p_conversions, p_policy
  )
  on conflict (cell_key, arm_key) do update set
    alpha       = arm_stat.alpha + p_conversions,
    beta        = arm_stat.beta + greatest(p_impressions - p_conversions, 0),
    impressions = arm_stat.impressions + p_impressions,
    conversions = arm_stat.conversions + p_conversions,
    policy_version = excluded.policy_version,
    updated_at  = now();
end;
$$ language plpgsql security definer;
