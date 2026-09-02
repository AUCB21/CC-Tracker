import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

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

/**
 * Shared DELETE /api/<resource>/[id] handler: 404 on missing row, 204 on success.
 * Callers pass the table name and a lowercase noun for the error message.
 */
export async function deleteRow(table: string, id: string, notFoundLabel: string): Promise<Response> {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });
  const { data, error } = await db.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: `${notFoundLabel} not found` }, { status: 404 });
  return new Response(null, { status: 204 });
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
