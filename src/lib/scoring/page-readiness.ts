// Page-readiness — never publish thin/ugly pages. Now AFFILIATE-AWARE: a page
// with sparse operator data but a strong affiliate match still delivers value
// and earns, so it can be publishable; a page with neither is genuinely thin.
// Pure + shared (front end + ETL).

export interface ReadinessInputs {
  hasRealPhotos: boolean;
  reviewCount: number;
  hasHours: boolean;
  serviceCount: number;
  hasContact: boolean;
  credentialCount: number;
  /** A relevant affiliate offer cleared the relevance floor for this page. */
  affiliateMatch: boolean;
}

export interface ReadinessResult {
  completenessScore: number; // 0..1
  missingFields: string[];
  affiliateMatch: boolean;
  publishable: boolean;
}

// Weights sum to 1.0; each field contributes when present.
const WEIGHTS = {
  photos: 0.25,
  reviews: 0.25,
  hours: 0.1,
  services: 0.15,
  contact: 0.15,
  credentials: 0.1,
} as const;

const PUBLISH_THRESHOLD = 0.55;
/** With a strong affiliate match, a thinner page is still worth publishing. */
const AFFILIATE_ASSISTED_THRESHOLD = 0.4;

export function computePageReadiness(inputs: ReadinessInputs): ReadinessResult {
  const missing: string[] = [];
  let score = 0;

  if (inputs.hasRealPhotos) score += WEIGHTS.photos;
  else missing.push("photos");

  if (inputs.reviewCount > 0) score += WEIGHTS.reviews;
  else missing.push("reviews");

  if (inputs.hasHours) score += WEIGHTS.hours;
  else missing.push("hours");

  if (inputs.serviceCount > 0) score += WEIGHTS.services;
  else missing.push("services");

  if (inputs.hasContact) score += WEIGHTS.contact;
  else missing.push("contact");

  if (inputs.credentialCount > 0) score += WEIGHTS.credentials;
  else missing.push("credentials");

  const completenessScore = Math.round(score * 1000) / 1000;
  const threshold = inputs.affiliateMatch
    ? AFFILIATE_ASSISTED_THRESHOLD
    : PUBLISH_THRESHOLD;

  return {
    completenessScore,
    missingFields: missing,
    affiliateMatch: inputs.affiliateMatch,
    publishable: completenessScore >= threshold,
  };
}
