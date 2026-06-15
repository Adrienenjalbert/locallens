"use client";

// Admin data-access. All reads are RLS-gated to admins (is_admin()); non-admins
// get []. Returns [] gracefully without a backend so the admin UI renders.

import { supabase } from "@/lib/supabase";

export interface RpmRow {
  page_type: string | null;
  vertical_id: string | null;
  sessions: number;
  revenue: number;
  rpm: number;
}

export interface ExperimentRow {
  id: string;
  surface: string;
  name: string;
  hypothesis: string | null;
  primary_metric: string;
  guardrail_metric: string | null;
  status: string;
  result: unknown;
  started_at: string;
  decided_at: string | null;
}

export interface DecisionRow {
  id: string;
  surface: string | null;
  decision: string;
  rationale: string | null;
  created_at: string;
}

export interface DataCheckRow {
  id: string;
  target: string | null;
  check_type: string;
  status: string;
  detail: unknown;
  sampled_at: string;
}

export interface UiSnapshotRow {
  id: string;
  page_type: string | null;
  url: string | null;
  device: string | null;
  screenshot_url: string | null;
  diff_status: string | null;
  issues: unknown;
  captured_at: string;
}

export interface ProspectRow {
  id: string;
  business_id: string | null;
  need_score: number | null;
  signals: unknown;
  owner_contact: unknown;
  status: string;
}

async function read<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    console.error("admin.read", error);
    return [];
  }
  return data ?? [];
}

export const admin = {
  async rpm(): Promise<RpmRow[]> {
    if (!supabase) return [];
    return read<RpmRow>(supabase.from("revenue_per_session").select("*"));
  },
  async experiments(): Promise<ExperimentRow[]> {
    if (!supabase) return [];
    return read<ExperimentRow>(
      supabase.from("experiment").select("*").order("started_at", { ascending: false }),
    );
  },
  async decisions(): Promise<DecisionRow[]> {
    if (!supabase) return [];
    return read<DecisionRow>(
      supabase.from("decision_log").select("*").order("created_at", { ascending: false }),
    );
  },
  async dataChecks(): Promise<DataCheckRow[]> {
    if (!supabase) return [];
    return read<DataCheckRow>(
      supabase.from("data_check").select("*").order("sampled_at", { ascending: false }),
    );
  },
  async uiSnapshots(): Promise<UiSnapshotRow[]> {
    if (!supabase) return [];
    return read<UiSnapshotRow>(
      supabase.from("ui_snapshot").select("*").order("captured_at", { ascending: false }),
    );
  },
  async prospects(): Promise<ProspectRow[]> {
    if (!supabase) return [];
    return read<ProspectRow>(
      supabase.from("prospect").select("*").order("need_score", { ascending: false }),
    );
  },
};
