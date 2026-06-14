// Shared contract for the outreach engine. Pure types; no runtime deps.

/** A business discovered via Apify Google Maps (compass/crawler-google-places). */
export interface Prospect {
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
  placeId?: string;
  /** Source town/query that surfaced this prospect (lineage). */
  town: string;
  query: string;
}

/** A single concrete, fixable problem found on a prospect's website. */
export interface AuditIssue {
  /** Stable id, e.g. "no_https". */
  id: string;
  /** Human label used in the outreach message, e.g. "Site isn't on HTTPS". */
  label: string;
  /** Why it matters to a tradesperson, in plain English. */
  impact: string;
  /** Improvement weight 1..5 (5 = biggest lead/ranking impact). Drives ordering. */
  severity: number;
}

export interface AuditResult {
  /** Reachable over HTTP at all? */
  reachable: boolean;
  httpStatus?: number;
  /** 0..100. LOWER = more headroom = better prospect. */
  score: number;
  issues: AuditIssue[];
  /** Raw signals captured for transparency / debugging. */
  signals: Record<string, string | number | boolean>;
}

/** A prospect enriched with its audit and (optionally) a personalised message. */
export interface OutreachRecord {
  prospect: Prospect;
  audit: AuditResult;
  /** Top 2-3 issues chosen for the pitch (by severity). */
  topIssues: AuditIssue[];
  /** The generated outreach message (email/DM ready). */
  message?: string;
  /** Which LLM produced the message, or "skipped"/"template-fallback". */
  messageSource: string;
}

export interface SenderInfo {
  name: string;
  business: string;
  proofUrl: string;
}
