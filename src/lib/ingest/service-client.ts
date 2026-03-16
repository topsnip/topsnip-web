import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client for cron/ingestion routes.
 * Uses service role key — bypasses RLS.
 * Throws immediately if env vars are missing (fail fast, not fail confusing).
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing required Supabase environment variables");
  }

  return createClient(url, key);
}
