import { createClient } from "@supabase/supabase-js";

// The browser client uses ONLY the anon key + RLS. Privileged operations
// (ETL, affiliate URL resolution, router persistence) run server-side in Edge
// Functions with the service role — never here. NEXT_PUBLIC_* vars are inlined
// at build time and safe to expose; the anon key is RLS-bounded by design.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : // Allow the app to boot for local UI work before Supabase is wired up.
      null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env",
    );
  }
  return supabase;
}
