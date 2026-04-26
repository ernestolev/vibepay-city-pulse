import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
      anon &&
      !url.includes("your-project") &&
      !anon.includes("your_anon_key") &&
      url.startsWith("https://"),
  );
}

/**
 * Supabase client for browser use only — anon key, subject to RLS.
 * Do not add service_role or other secrets to Vite env.
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url!, anon!, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
