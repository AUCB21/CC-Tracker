import { checkApiKey, getSupabase } from "@/lib/supabase";
import { ensureSession } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * POST /api/sessions/[id]/focus
 * Body: { plan_id: string | null }
 * Sets (or clears with null) sessions.active_plan_id. Self-heals the session
 * row like the plan/task ingest routes so a CLI call from an un-tracked
 * session still lands.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  let body: { plan_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.plan_id !== null && typeof body.plan_id !== "string") {
    return Response.json({ error: "plan_id must be a uuid string or null" }, { status: 400 });
  }

  const { data: existing } = await db
    .from("sessions")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) await ensureSession(db, id, null, { source: "cli" });

  const { data, error } = await db
    .from("sessions")
    .update({ active_plan_id: body.plan_id })
    .eq("id", id)
    .select("id, active_plan_id")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "session not found" }, { status: 404 });
  return Response.json({ ok: true, session: data });
}
