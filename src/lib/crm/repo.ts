"use client";

// CRM data-access layer. All reads/writes go through the RLS-bounded anon
// client — a business only ever sees its own rows (enforced by Postgres, not
// here). Functions return [] / null gracefully when Supabase isn't configured
// so the UI can render empty states during local development.

import { supabase } from "@/lib/supabase";
import type { Customer, Invoice, Job, Lead, Quote } from "./types";

async function list<T>(table: string, order = "created_at"): Promise<T[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order(order, { ascending: false });
  if (error) {
    console.error(`crm.list(${table})`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export const crm = {
  leads: () => list<Lead>("lead", "received_at"),
  customers: () => list<Customer>("customer"),
  quotes: () => list<Quote>("quote", "id"),
  jobs: () => list<Job>("job", "scheduled_at"),
  invoices: () => list<Invoice>("invoice", "id"),

  async updateLeadStatus(id: string, status: Lead["status"]): Promise<boolean> {
    if (!supabase) return false;
    const patch: Partial<Lead> = { status };
    if (status !== "new") patch.first_response_at = new Date().toISOString();
    const { error } = await supabase.from("lead").update(patch).eq("id", id);
    return !error;
  },

  async createCustomerFromLead(lead: Lead): Promise<string | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("customer")
      .insert({
        business_id: lead.business_id,
        name: lead.contact_name ?? "New customer",
        phone: lead.contact_phone,
        email: lead.contact_email,
      })
      .select("id")
      .single();
    return error ? null : (data?.id ?? null);
  },

  async insert<T extends { id?: string }>(table: string, row: object): Promise<T | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.from(table).insert(row).select("*").single();
    return error ? null : (data as T);
  },

  async update(table: string, id: string, patch: object): Promise<boolean> {
    if (!supabase) return false;
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    return !error;
  },
};
