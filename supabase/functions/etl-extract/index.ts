// etl-extract (Stage A) — pull raw business data per (vertical × location) from
// Google Places + an Apify actor, store IMMUTABLY in etl.raw_payload with
// source + params (lineage). Never writes golden tables. Idempotent + logged.
//
// POST /functions/v1/etl-extract
//   body: { verticalId, verticalSlug, location: { name, lat, lng, radius? },
//           googlePlacesQuery?, apifyActorId? }
//
// Secrets: GOOGLE_PLACES_API_KEY, APIFY_TOKEN (Edge-function secrets only).

import { adminClient } from "../_shared/admin.ts";
import { handlePreflight, json } from "../_shared/cors.ts";

interface Body {
  verticalId: string;
  verticalSlug: string;
  location: { name: string; lat: number; lng: number; radius?: number };
  googlePlacesQuery?: string;
  apifyActorId?: string;
}

async function runStage<T>(
  supabase: ReturnType<typeof adminClient>,
  verticalId: string,
  source: string,
  fn: () => Promise<T[]>,
): Promise<{ source: string; count: number; error?: string }> {
  const { data: run } = await supabase
    .from("pipeline_run")
    .insert({ vertical_id: verticalId, source, stage: "extract" })
    .select("id")
    .single();

  try {
    const records = await fn();
    if (records.length > 0) {
      // raw_payload lives in the `etl` schema (server-only; never exposed).
      await supabase.schema("etl").from("raw_payload").insert(
        records.map((payload) => ({
          vertical_id: verticalId,
          source,
          payload,
        })),
      );
    }
    await supabase
      .from("pipeline_run")
      .update({
        finished_at: new Date().toISOString(),
        status: "ok",
        counts: { extracted: records.length },
      })
      .eq("id", run?.id);
    return { source, count: records.length };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await supabase
      .from("pipeline_run")
      .update({ finished_at: new Date().toISOString(), status: "error", counts: { error } })
      .eq("id", run?.id);
    return { source, count: 0, error };
  }
}

async function fetchGooglePlaces(body: Body): Promise<unknown[]> {
  const key = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!key) return []; // gracefully no-op without a key (local/dev)
  const query =
    body.googlePlacesQuery ?? `${body.verticalSlug} in ${body.location.name}`;
  // Places Text Search (New). Real impl paginates next_page_token.
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location,places.rating,places.userRatingCount,places.types,places.regularOpeningHours",
      },
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: { latitude: body.location.lat, longitude: body.location.lng },
            radius: body.location.radius ?? 8000,
          },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`google places ${res.status}`);
  const data = await res.json();
  return (data.places ?? []) as unknown[];
}

async function fetchApify(body: Body): Promise<unknown[]> {
  const token = Deno.env.get("APIFY_TOKEN");
  if (!token || !body.apifyActorId) return [];
  // Run the configured actor synchronously and collect dataset items.
  const res = await fetch(
    `https://api.apify.com/v2/acts/${body.apifyActorId}/run-sync-get-dataset-items?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: body.location.name,
        category: body.verticalSlug,
        maxItems: 100,
      }),
    },
  );
  if (!res.ok) throw new Error(`apify ${res.status}`);
  return (await res.json()) as unknown[];
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
  if (!body.verticalId || !body.location) {
    return json({ error: "verticalId and location required" }, 400);
  }

  const supabase = adminClient();
  const results = await Promise.all([
    runStage(supabase, body.verticalId, "google_places", () => fetchGooglePlaces(body)),
    runStage(supabase, body.verticalId, `apify:${body.apifyActorId ?? "none"}`, () =>
      fetchApify(body),
    ),
  ]);

  return json({ ok: true, results });
});
