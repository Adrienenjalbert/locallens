// etl-normalise (Stage B) — map raw payloads to the canonical staging schema
// with per-field source attribution. Reads etl.raw_payload, writes
// etl.staging_business. Handles Google Places + generic Apify shapes.
//
// POST /functions/v1/etl-normalise
//   body: { verticalId, categoryMap?: Record<string,string>, since?: ISO }

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";
import { ukPhoneToE164, ukPostcode, mapCategory, normaliseHours } from "../_shared/uk-normalise.ts";

interface Body {
  verticalId: string;
  categoryMap?: Record<string, string>;
  since?: string;
}

interface StagingRecord {
  vertical_id: string;
  source: string;
  source_ref: string | null;
  name: string | null;
  phone_e164: string | null;
  website: string | null;
  address: string | null;
  postcode: string | null;
  lat: number | null;
  lng: number | null;
  hours: unknown;
  categories: string[];
  field_sources: Record<string, string>;
}

// deno-lint-ignore no-explicit-any
function normaliseGooglePlace(p: any, verticalId: string, catMap: Record<string, string>): StagingRecord {
  const address = p.formattedAddress ?? null;
  const pc = address ? ukPostcode(extractPostcode(address)) : null;
  return {
    vertical_id: verticalId,
    source: "google_places",
    source_ref: p.id ?? null,
    name: p.displayName?.text ?? null,
    phone_e164: ukPhoneToE164(p.nationalPhoneNumber),
    website: p.websiteUri ?? null,
    address,
    postcode: pc,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    hours: normaliseHours(p.regularOpeningHours),
    categories: (p.types ?? []).map((t: string) => mapCategory(t, catMap)),
    field_sources: fieldSources("google_places", {
      name: p.displayName?.text,
      phone: p.nationalPhoneNumber,
      website: p.websiteUri,
      address,
    }),
  };
}

// deno-lint-ignore no-explicit-any
function normaliseApify(p: any, verticalId: string, catMap: Record<string, string>): StagingRecord {
  return {
    vertical_id: verticalId,
    source: "apify",
    source_ref: p.id ?? p.url ?? null,
    name: p.name ?? p.title ?? null,
    phone_e164: ukPhoneToE164(p.phone ?? p.phoneNumber),
    website: p.website ?? p.url ?? null,
    address: p.address ?? null,
    postcode: ukPostcode(p.postcode ?? (p.address ? extractPostcode(p.address) : null)),
    lat: numeric(p.lat ?? p.latitude),
    lng: numeric(p.lng ?? p.longitude),
    hours: normaliseHours(p.hours ?? p.openingHours),
    categories: (p.categories ?? []).map((c: string) => mapCategory(c, catMap)),
    field_sources: fieldSources("apify", {
      name: p.name ?? p.title,
      phone: p.phone ?? p.phoneNumber,
      website: p.website,
      address: p.address,
    }),
  };
}

function fieldSources(source: string, fields: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (v != null && v !== "") out[k] = source;
  return out;
}

function extractPostcode(address: string): string | null {
  const m = address.match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/i);
  return m ? m[0] : null;
}
function numeric(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  const catMap = body.categoryMap ?? {};

  const { data: run } = await supabase
    .from("pipeline_run")
    .insert({ vertical_id: body.verticalId, source: "all", stage: "normalise" })
    .select("id")
    .single();

  let query = supabase
    .schema("etl")
    .from("raw_payload")
    .select("id, source, payload, fetched_at")
    .eq("vertical_id", body.verticalId);
  if (body.since) query = query.gte("fetched_at", body.since);

  const { data: raws, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const staging: StagingRecord[] = [];
  for (const r of raws ?? []) {
    if (r.source === "google_places") {
      staging.push(normaliseGooglePlace(r.payload, body.verticalId, catMap));
    } else if (r.source.startsWith("apify")) {
      staging.push(normaliseApify(r.payload, body.verticalId, catMap));
    }
  }

  // Only keep records with at least a name.
  const valid = staging.filter((s) => s.name);
  if (valid.length > 0) {
    await supabase.schema("etl").from("staging_business").insert(valid);
  }

  await supabase
    .from("pipeline_run")
    .update({
      finished_at: new Date().toISOString(),
      status: "ok",
      counts: { extracted: raws?.length ?? 0, normalised: valid.length, rejected: staging.length - valid.length },
    })
    .eq("id", run?.id);

  return json({ ok: true, normalised: valid.length, rejected: staging.length - valid.length });
});
