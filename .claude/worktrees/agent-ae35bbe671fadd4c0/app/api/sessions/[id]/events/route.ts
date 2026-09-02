import type { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions/[id]/events?since=<eventId>&type=<comma>&tool=<comma>
 * Returns events with id > since, newest first, up to 100. Used by the live
 * timeline poll. No auth (read-only, localhost app).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) {
    return Response.json({ error: "supabase not configured" }, { status: 503 });
  }
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sinceRaw = searchParams.get("since");
  const since = sinceRaw ? Number.parseInt(sinceRaw, 10) : 0;
  const types = searchParams.get("type")?.split(",").filter(Boolean) ?? [];
  const tools = searchParams.get("tool")?.split(",").filter(Boolean) ?? [];

  let q = db
    .from("events")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  if (!Number.isNaN(since) && since > 0) q = q.gt("id", since);
  if (types.length > 0) q = q.in("type", types);
  if (tools.length > 0) q = q.in("tool_name", tools);

  const { data, error } = await q;
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ events: data ?? [] });
}
