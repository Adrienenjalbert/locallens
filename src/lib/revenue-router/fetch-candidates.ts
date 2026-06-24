import type { Candidate, FunnelStage, SlotName } from "./types";

// Client helper: fetch server-built candidates from the router-candidates Edge
// Function. The browser ranks them with the RevenueRouter (trust floor) — but
// the economics (EPC) and the safe click URL are computed server-side.
//
// `render` carries the data MonetisationSlot needs to draw the chosen unit
// without a second round-trip.
export interface ServerCandidate extends Candidate {
  render?: {
    offerId: string;
    title: string;
    description: string;
    ctaLabel: string;
    clickPath: string; // path on the Supabase functions origin
    disclosureRequired: boolean;
    relAttribute: string;
  };
}

export interface CandidateRequest {
  verticalSlug: string;
  pageType: string;
  funnelStage: FunnelStage;
  slot: SlotName;
  keywords?: string[];
  geoScope?: string | null;
  hasClaimedOperators?: boolean;
  sessionId?: string;
}

export async function fetchCandidates(req: CandidateRequest): Promise<ServerCandidate[]> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return []; // no backend configured → render nothing (honest default)

  const res = await fetch(`${base}/functions/v1/router-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { candidates: ServerCandidate[] };
  return data.candidates ?? [];
}
