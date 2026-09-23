import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Klient so secret kľúčom – obchádza RLS. Používať len na serveri (cron, Google tokeny). */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
