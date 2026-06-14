// etl-score (Stage: Score + Publish gate) — for each business in a vertical,
// gather signals, compute the Quality Score (+ stored breakdown for "why ranked
// here") and page-readiness, then set status/noindex accordingly. Recomputed on
// every ETL load and by the scheduled freshness/loop jobs.
//
// POST /functions/v1/etl-score
//   body: { verticalId }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import { computeQualityScore, computePageReadiness, type ScoreWeights } from "../_shared/scoring.ts";

interface Body {
  verticalId: string;
}

function daysSince(iso: string | null): number {
  if (!iso) return 9999;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 86400000);
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  if (!body.verticalId) return json({ error: "verticalId required" }, 400);

  const supabase = adminClient();

  const { data: vertical } = await supabase
    .from("vertical")
    .select("score_weights")
    .eq("id", body.verticalId)
    .single();
  const weights = (vertical?.score_weights ?? {}) as ScoreWeights;

  const { data: businesses, error } = await supabase
    .from("business")
    .select(
      "id, data_confidence, hours, categories, phone, website, claimed_by, last_verified_at",
    )
    .eq("vertical_id", body.verticalId);
  if (error) return json({ error: error.message }, 500);

  let scored = 0;
  let published = 0;

  for (const b of businesses ?? []) {
    // Aggregate review signals across sources.
    const { data: rs } = await supabase
      .from("review_source")
      .select("external_rating, review_count, fetched_at")
      .eq("business_id", b.id);
    const totalReviews = (rs ?? []).reduce((a, r) => a + (r.review_count ?? 0), 0);
    const weightedRating =
      totalReviews > 0
        ? (rs ?? []).reduce((a, r) => a + (r.external_rating ?? 0) * (r.review_count ?? 0), 0) / totalReviews
        : 0;
    const ratings = (rs ?? []).map((r) => r.external_rating ?? 0).filter((x) => x > 0);
    const consistency =
      ratings.length > 1 ? 1 - (Math.max(...ratings) - Math.min(...ratings)) / 5 : 0.7;
    const latestReview = (rs ?? [])
      .map((r) => r.fetched_at)
      .sort()
      .pop() ?? null;

    const { count: portfolioCount } = await supabase
      .from("portfolio_item")
      .select("id", { count: "exact", head: true })
      .eq("business_id", b.id);
    const { count: credCount } = await supabase
      .from("credential")
      .select("id", { count: "exact", head: true })
      .eq("business_id", b.id)
      .eq("verified", true);

    const completeness =
      [b.phone, b.website, b.hours, (b.categories ?? []).length > 0].filter(Boolean).length / 4;

    const breakdown = computeQualityScore(
      {
        review: {
          rating: weightedRating,
          reviewCount: totalReviews,
          daysSinceLatest: daysSince(latestReview),
          crossSourceConsistency: consistency,
        },
        portfolioItems: portfolioCount ?? 0,
        portfolioDaysSinceLatest: 30,
        claimed: !!b.claimed_by,
        verifiedContact: !!b.phone,
        verifiedCredentials: credCount ?? 0,
        completeness,
        dataConfidence: b.data_confidence ?? 0,
      },
      weights,
    );

    const readiness = computePageReadiness({
      hasRealPhotos: (portfolioCount ?? 0) > 0,
      reviewCount: totalReviews,
      hasHours: !!b.hours,
      serviceCount: (b.categories ?? []).length,
      hasContact: !!(b.phone || b.website),
      credentialCount: credCount ?? 0,
      affiliateMatch: false, // set by router-candidates context in a later pass
    });

    const badges = breakdown.tier === "top_rated" ? ["Top Rated"] : breakdown.tier === "verified" ? ["Verified"] : [];
    const noindex = !readiness.publishable;
    if (!noindex) published++;

    await supabase
      .from("business")
      .update({
        quality_score: breakdown.score,
        score_breakdown: breakdown,
        badges,
        status: noindex ? "held" : "published",
      })
      .eq("id", b.id);

    await supabase.from("page_readiness").insert({
      business_id: b.id,
      completeness_score: readiness.completenessScore,
      affiliate_match: readiness.affiliateMatch,
      missing_fields: readiness.missingFields,
      publishable: readiness.publishable,
    });

    scored++;
  }

  return json({ ok: true, scored, published });
});
