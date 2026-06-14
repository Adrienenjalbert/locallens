import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Service-role client for privileged server-side work (writing the attribution
// spine, reading offers, etc.). The service-role key is an Edge-function secret
// (`supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`) and NEVER reaches the
// browser. RLS is bypassed here by design — this is trusted server code.
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceRole, {
    auth: { persistSession: false },
  });
}

/** Generate an opaque tracking sub-id sent to the partner for postback match. */
export function mintSubid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
