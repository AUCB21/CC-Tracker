"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client (anon/publishable key). Used only for Realtime
 * subscriptions — never for writes. Returns null if the publishable key isn't
 * configured, in which case the caller should fall back to polling.
 *
 * Cached in a module-level singleton so multiple components share one channel
 * multiplex.
 */
let cached: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });
  return cached;
}
