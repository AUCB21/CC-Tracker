import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Server-side only. Uses the service-role key, which bypasses RLS.
 * Never import this file from client components.
 */
/**
 * Server-side Supabase secret. Prefers the modern `SUPABASE_SECRET`
 * (sb_secret_*), falls back to the legacy `SUPABASE_SERVICE_ROLE_KEY` so
 * old clones keep working. Both bypass RLS; keep server-side only.
 */
function serverSecret(): string | undefined {
  return process.env.SUPABASE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serverSecret();
  if (!url || !key) return null;
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serverSecret());
}

export function ingestionKeyConfigured(): boolean {
  return Boolean(process.env.CC_TRACKER_API_KEY);
}

/** Shared guard for all /api/ingest/* routes. Returns an error Response or null. */
export function checkApiKey(req: Request): Response | null {
  const expected = process.env.CC_TRACKER_API_KEY;
  if (!expected) {
    return Response.json(
      { error: "CC_TRACKER_API_KEY is not set on the server" },
      { status: 503 }
    );
  }
  const provided =
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  if (provided !== expected) {
    return Response.json({ error: "invalid api key" }, { status: 401 });
  }
  return null;
}
