// CRM domain types — the shared contract for the owner workspace. Mirrors the
// CRM tables in supabase/migrations/0004_crm.sql. RLS scopes every row to the
// owner's business_id; the front end never passes business_id explicitly for
// reads (RLS enforces it) but includes it on writes.

export type LeadStatus = "new" | "quoted" | "won" | "lost";
export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined";
export type JobStatus = "booked" | "in_progress" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type CommChannel = "email" | "sms" | "whatsapp";

/** The job lifecycle — the spine of the CRM UI. */
export const LIFECYCLE_STAGES = [
  "lead",
  "quote",
  "job",
  "completed",
  "invoice",
  "paid",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export interface Lead {
  id: string;
  business_id: string;
  session_id: string | null;
  source: string | null;
  attributed_page: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message: string | null;
  job_type: string | null;
  location: string | null;
  status: LeadStatus;
  received_at: string;
  first_response_at: string | null;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  property_notes: string | null;
  photos: string[];
  tags: string[];
  status: string; // active | lapsed
  lifetime_value: number;
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface Quote {
  id: string;
  business_id: string;
  customer_id: string | null;
  lead_id: string | null;
  line_items: LineItem[];
  total: number;
  status: QuoteStatus;
  public_token: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
}

export interface Job {
  id: string;
  business_id: string;
  customer_id: string | null;
  quote_id: string | null;
  title: string | null;
  status: JobStatus;
  scheduled_at: string | null;
  recurrence: string | null; // iCal RRULE
  duration_min: number | null;
  route_order: number | null;
  completed_at: string | null;
  photos: string[];
  notes: string | null;
}

export interface Invoice {
  id: string;
  business_id: string;
  customer_id: string | null;
  job_id: string | null;
  line_items: LineItem[];
  total: number;
  status: InvoiceStatus;
  public_token: string | null;
  sent_at: string | null;
  due_at: string | null;
  paid_at: string | null;
}

export function lineItemsTotal(items: LineItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
}

/** Hours since a lead arrived without a first response — the speed-to-lead KPI. */
export function speedToLeadHours(
  lead: Pick<Lead, "received_at" | "first_response_at">,
): number {
  const end = lead.first_response_at ? new Date(lead.first_response_at) : new Date();
  return (end.getTime() - new Date(lead.received_at).getTime()) / 3_600_000;
}
