// Discovery — find landscaper/gardener businesses via the Apify Google Maps
// actor `compass/crawler-google-places`. Mirrors the call shape in
// `supabase/functions/etl-extract/index.ts` so it can later fold into the ETL.
//
// Cost: Apify is pay-per-event (~£1.50-£5 / 1,000 places). This is the only
// paid input in the whole engine. Everything downstream is free.

import type { Prospect } from "./types";
import { SAMPLE_PROSPECTS } from "./sample-data";

const APIFY_ACTOR = "compass~crawler-google-places"; // `~` form for the REST path

interface DiscoverOptions {
  town: string;
  query: string;
  limit: number;
  country: string;
  dryRun: boolean;
}

/** Raw item shape we rely on from the actor (subset; the actor returns more). */
interface ApifyPlace {
  title?: string;
  website?: string;
  phone?: string;
  phoneUnformatted?: string;
  emails?: string[];
  address?: string;
  categoryName?: string;
  totalScore?: number;
  reviewsCount?: number;
  placeId?: string;
}

function mapPlace(p: ApifyPlace, town: string, query: string): Prospect {
  return {
    name: p.title ?? "(unknown)",
    website: cleanUrl(p.website),
    phone: p.phone ?? p.phoneUnformatted,
    email: p.emails?.[0],
    address: p.address,
    category: p.categoryName,
    rating: p.totalScore,
    reviewCount: p.reviewsCount,
    placeId: p.placeId,
    town,
    query,
  };
}

function cleanUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

export async function discover(opts: DiscoverOptions): Promise<Prospect[]> {
  if (opts.dryRun) {
    return SAMPLE_PROSPECTS.slice(0, opts.limit).map((p) => ({
      ...p,
      town: opts.town,
      query: opts.query,
    }));
  }

  const token = process.env.APIFY_TOKEN;
  if (!token) {
    console.warn(
      "[discover] APIFY_TOKEN not set — falling back to sample data. " +
        "Set it in tools/outreach/.env.outreach or use --dry-run.",
    );
    return SAMPLE_PROSPECTS.slice(0, opts.limit).map((p) => ({
      ...p,
      town: opts.town,
      query: opts.query,
    }));
  }

  // Run the actor synchronously and collect dataset items in one call.
  const input = {
    searchStringsArray: [`${opts.query} ${opts.town}`],
    locationQuery: opts.town,
    maxCrawledPlacesPerSearch: opts.limit,
    language: "en",
    countryCode: opts.country,
    // Enrich with website contact details (emails/socials) for outreach.
    scrapeContacts: true,
    skipClosedPlaces: true,
  };

  const url =
    `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items` +
    `?token=${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Apify run failed: ${res.status} ${text.slice(0, 300)}`);
  }

  const items = (await res.json()) as ApifyPlace[];
  return items
    .map((p) => mapPlace(p, opts.town, opts.query))
    .filter((p) => p.name !== "(unknown)")
    .slice(0, opts.limit);
}
