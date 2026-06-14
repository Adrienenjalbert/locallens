-- Seed: gardeners in one UK metro (the wedge) + a couple of affiliate offers so
-- the RevenueRouter has inventory and the directory earns from day one.

insert into vertical (slug, name, score_weights, taxonomy, tool_config, router_policy)
values (
  'gardeners', 'Gardeners',
  '{"review_quality":0.35,"portfolio_quality":0.25,"verification":0.20,"completeness":0.10,"data_confidence":0.10}',
  '{"services":["lawn-care","hedge-trimming","garden-clearance","landscaping","tree-surgery"]}',
  '{"calculator":{"inputs":["garden_size","scope"]}}',
  '{"trust_floor":{"max_featured_above_fold":1,"affiliate_relevance_min":0.55,"answer_first":true},
    "weights":{"affiliate":1.0,"lead":1.2,"subscription_nudge":0.8},
    "policy_version":"rules-v1"}'
);

insert into location (slug, name, type, region, lat, lng, geo)
values ('manchester','Manchester','city','Greater Manchester',53.4808,-2.2426,
        st_setsrid(st_makepoint(-2.2426,53.4808),4326)::geography);

-- Affiliate inventory: relevant, labelled, day-one revenue with zero operators.
insert into affiliate_partner (slug, name, network, default_payout_model, status)
values
  ('gardening-insurance','GreenCover Insurance','awin','cpl','active'),
  ('garden-supplies','GrowDirect Supplies','impact','cpa','active');

insert into affiliate_offer
  (partner_id, slug, title, description, cta_label, landing_template, payout_model, payout_value, vertical_ids, funnel_targets, keywords, status, epc)
select p.id, 'public-liability-cover',
  'Public liability cover for garden work',
  'Compare cover for hiring or being a gardener. We may earn a commission.',
  'Compare cover',
  'https://greencover.example/q?subid={subid}',
  'cpl', 12.00,
  array(select id from vertical where slug='gardeners'),
  array['research','compare']::funnel_stage[],
  array['insurance','liability','cover','quote'],
  'active', 0.42
from affiliate_partner p where p.slug='gardening-insurance';

insert into affiliate_offer
  (partner_id, slug, title, description, cta_label, landing_template, payout_model, payout_value, vertical_ids, funnel_targets, keywords, status, epc)
select p.id, 'lawn-care-kit',
  'Lawn care starter kit',
  'Seed, feed and tools for a healthy lawn. We may earn a commission.',
  'Shop the kit',
  'https://growdirect.example/lawn?subid={subid}',
  'cpa', 8.50,
  array(select id from vertical where slug='gardeners'),
  array['research']::funnel_stage[],
  array['lawn','seed','feed','tools','maintenance'],
  'active', 0.31
from affiliate_partner p where p.slug='garden-supplies';

insert into affiliate_placement (offer_id, slot, page_types, priority, cap_per_page)
select o.id, 'inline-after-shortlist', array['location','best-of','guide'], 10, 1
from affiliate_offer o where o.slug='public-liability-cover';

insert into affiliate_placement (offer_id, slot, page_types, priority, cap_per_page)
select o.id, 'sidebar', array['location','guide','tool'], 5, 1
from affiliate_offer o where o.slug='lawn-care-kit';
