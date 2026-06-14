import { createClient } from "@supabase/supabase-js";

// The browser client uses ONLY the anon key + RLS. Privileged operations
// (ETL, affiliate URL resolution, router persistence) run server-side in Edge
// Functions with the service role — never here.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase =
  url && anonKey
    ? createClient(url, anonKey)
    : // Allow the app to boot for local UI work before Supabase is wired up.
      null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
    );
  }
  return supabase;
}
