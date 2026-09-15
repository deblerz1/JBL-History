import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createServerSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) throw new Error("Server-side Supabase environment variables are not configured.");
  return createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { "X-Client-Info": "jbl-history-server" } } });
}
