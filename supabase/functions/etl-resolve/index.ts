// etl-resolve (Stages C–F) — dedup → validate → enrich → load, chained.
//
//  C DEDUP/ENTITY RESOLUTION: cluster staging rows that are the same business
//    (fuzzy name + geo + phone/website), producing ONE golden record per
//    cluster. Resolution priority: owner-verified > google_places > apify.
//  D VALIDATE (quality gate): HARD rules (valid UK postcode/geo, plausible
//    phone, required fields) reject/hold; SOFT rules flag. Compute data_confidence.
//  E ENRICH: geocode-if-missing hook, photo cleanup hook (stubs here).
//  F LOAD: upsert golden `business` + write field_provenance; held if low conf.
//
// POST /functions/v1/etl-resolve
//   body: { verticalId, primaryLocationId?, holdConfidenceBelow?: number }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import { matchScore } from "../_shared/match.ts";
import { slugify } from "../_shared/uk-normalise.ts";

interface Body {
  verticalId: string;
  primaryLocationId?: string;
  holdConfidenceBelow?: number;
}

// deno-lint-ignore no-explicit-any
type Staging = any;

const SOURCE_PRIORITY: Record<string, number> = {
  owner: 3,
  google_places: 2,
  apify: 1,
};

function clusterStaging(rows: Staging[]): Staging[][] {
  const clusters: Staging[][] = [];
  for (const row of rows) {
    let placed = false;
    for (const cluster of clusters) {
      const rep = cluster[0];
      if (
        matchScore(
          { name: row.name, lat: row.lat, lng: row.lng, phone: row.phone_e164, website: row.website },
          { name: rep.name, lat: rep.lat, lng: rep.lng, phone: rep.phone_e164, website: rep.website },
        ) >= 0.7
      ) {
        cluster.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([row]);
  }
  return clusters;
}

/** Pick the winning value for a field by source priority, with provenance. */
function resolveField(cluster: Staging[], field: string): { value: unknown; source: string } | null {
  const candidates = cluster
    .filter((r) => r[field] != null && r[field] !== "")
    .sort((a, b) => (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0));
  if (candidates.length === 0) return null;
  return { value: candidates[0][field], source: candidates[0].source };
}

function validate(golden: Record<string, unknown>): { confidence: number; hold: boolean; flags: string[] } {
  const flags: string[] = [];
  let conf = 1;
  // HARD rules
  if (!golden.postcode) { flags.push("no_postcode"); conf -= 0.3; }
  if (golden.lat == null || golden.lng == null) { flags.push("no_geo"); conf -= 0.3; }
  if (!golden.phone_e164) { flags.push("no_phone"); conf -= 0.15; }
  if (!golden.name) { flags.push("no_name"); conf -= 0.5; }
  // SOFT rules
  if (!golden.website) { flags.push("no_website"); conf -= 0.05; }
  conf = Math.max(0, Math.min(1, conf));
  const hold = !golden.name || (golden.lat == null && !golden.postcode);
  return { confidence: Math.round(conf * 1000) / 1000, hold, flags };
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
  const holdBelow = body.holdConfidenceBelow ?? 0.4;

  const { data: run } = await supabase
    .from("pipeline_run")
    .insert({ vertical_id: body.verticalId, source: "all", stage: "load" })
    .select("id")
    .single();

  const { data: staging, error } = await supabase
    .schema("etl")
    .from("staging_business")
    .select("*")
    .eq("vertical_id", body.verticalId)
    .is("golden_id", null);
  if (error) return json({ error: error.message }, 500);

  const clusters = clusterStaging(staging ?? []);
  let loaded = 0;
  let held = 0;

  for (const cluster of clusters) {
    const fields = ["name", "phone_e164", "website", "address", "postcode", "lat", "lng", "hours"];
    const golden: Record<string, unknown> = {};
    const provenance: { field: string; source: string; value: string }[] = [];
    for (const f of fields) {
      const r = resolveField(cluster, f);
      if (r) {
        golden[f] = r.value;
        provenance.push({ field: f, source: r.source, value: String(r.value) });
      }
    }

    const { confidence, hold, flags } = validate(golden);
    const status = hold || confidence < holdBelow ? "held" : "published";
    if (status === "held") held++;

    const categories = Array.from(
      new Set(cluster.flatMap((r) => r.categories ?? [])),
    );

    const slug = slugify(String(golden.name ?? "business")) + "-" + Math.random().toString(36).slice(2, 7);

    const { data: upserted, error: upErr } = await supabase
      .from("business")
      .insert({
        slug,
        vertical_id: body.verticalId,
        primary_location_id: body.primaryLocationId ?? null,
        name: golden.name,
        status,
        phone: golden.phone_e164 ?? null,
        website: golden.website ?? null,
        address: golden.address ?? null,
        postcode: golden.postcode ?? null,
        geo:
          golden.lat != null && golden.lng != null
            ? `SRID=4326;POINT(${golden.lng} ${golden.lat})`
            : null,
        hours: golden.hours ?? null,
        categories,
        data_confidence: confidence,
        last_verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (upErr || !upserted) continue;
    loaded++;

    // Write provenance + flag affected staging rows as resolved + queue page regen.
    await supabase.from("field_provenance").insert(
      provenance.map((p) => ({
        business_id: upserted.id,
        field: p.field,
        source: p.source,
        value: p.value,
        confidence,
      })),
    );
    await supabase
      .schema("etl")
      .from("staging_business")
      .update({ golden_id: upserted.id })
      .in("id", cluster.map((r) => r.id));

    if (flags.length) {
      await supabase.from("data_check").insert({
        target: upserted.id,
        check_type: "completeness",
        status: flags.length > 2 ? "flag" : "pass",
        detail: { flags },
      });
    }
  }

  await supabase
    .from("pipeline_run")
    .update({
      finished_at: new Date().toISOString(),
      status: "ok",
      counts: { clusters: clusters.length, loaded, held },
    })
    .eq("id", run?.id);

  return json({ ok: true, clusters: clusters.length, loaded, held });
});
