-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║ 0006_rls.sql — Row-Level Security                                       ║
-- ╚══════════════════════════════════════════════════════════════════════╝
-- Principles:
--  • Public can READ published golden records only.
--  • An owner can WRITE only their claimed business + its CRM data.
--  • ETL / loop / affiliate-resolution run with the service role (bypasses RLS).
--  • Admin-only tables (prospect, outreach) are never exposed to anon/auth.

-- Helper: is the current user the owner of this business?
create or replace function owns_business(b_id uuid) returns boolean as $$
  select exists (
    select 1 from business b
    where b.id = b_id and b.claimed_by = auth.uid()
  );
$$ language sql security definer stable;

create or replace function is_admin() returns boolean as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$ language sql security definer stable;

-- ── Public read on published golden records ──
alter table business enable row level security;
create policy business_public_read on business
  for select using (status = 'published');
create policy business_owner_write on business
  for update using (owns_business(id)) with check (owns_business(id));
create policy business_admin_all on business
  for all using (is_admin()) with check (is_admin());

alter table location enable row level security;
create policy location_public_read on location for select using (true);

alter table review enable row level security;
create policy review_public_read on review for select using (true);

alter table portfolio_item enable row level security;
create policy portfolio_public_read on portfolio_item for select using (true);
create policy portfolio_owner_write on portfolio_item
  for all using (owns_business(business_id)) with check (owns_business(business_id));

-- ── Affiliate: offers/partners are public-read (so the FE router can rank
-- them) but only the LANDING URL is resolved server-side at click time. ──
alter table affiliate_offer enable row level security;
create policy offer_public_read on affiliate_offer
  for select using (status = 'active');
alter table affiliate_placement enable row level security;
create policy placement_public_read on affiliate_placement
  for select using (active = true);

-- ── CRM: business-scoped, owner-only ──
do $$
declare t text;
begin
  foreach t in array array['lead','customer','quote','job','invoice','comm_log','subscription','journey']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy %1$s_owner_all on %1$s
      for all using (owns_business(business_id)) with check (owns_business(business_id));$f$, t);
    execute format($f$create policy %1$s_admin_all on %1$s
      for all using (is_admin()) with check (is_admin());$f$, t);
  end loop;
end $$;

-- ── Admin-only: prospecting/outreach + loop internals are NOT public ──
do $$
declare t text;
begin
  foreach t in array array['prospect','outreach_log','experiment','decision_log','data_check','ui_snapshot','router_decision']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy %1$s_admin_only on %1$s
      for all using (is_admin()) with check (is_admin());$f$, t);
  end loop;
end $$;

-- Note: session/touch/conversion/event_log are written by the service role
-- via Edge Functions and are not directly writable by clients. Enable RLS
-- with no public policies so they are locked to service role + admin.
do $$
declare t text;
begin
  foreach t in array array['session','touch','conversion','event_log','experiment_assignment']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format($f$create policy %1$s_admin_read on %1$s
      for select using (is_admin());$f$, t);
  end loop;
end $$;
