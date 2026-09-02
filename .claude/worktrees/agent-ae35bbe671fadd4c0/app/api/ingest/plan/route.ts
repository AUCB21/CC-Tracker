import { checkApiKey, getSupabase } from "@/lib/supabase";
import { ensureSession } from "@/lib/ingest";

export const dynamic = "force-dynamic";

/**
 * Create or update a plan.
 * POST { id?, session_id, title?, description?, status? }
 */
export async function POST(req: Request) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  let body: {
    id?: string;
    session_id?: string;
    title?: string;
    description?: string;
    status?: "active" | "completed" | "abandoned";
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  try {
    if (body.id) {
      const patch: Record<string, unknown> = {};
      if (body.title !== undefined) patch.title = body.title;
      if (body.description !== undefined) patch.description = body.description;
      if (body.status !== undefined) {
        patch.status = body.status;
        patch.completed_at = body.status === "completed" ? new Date().toISOString() : null;
      }
      const { data, error } = await db
        .from("plans")
        .update(patch)
        .eq("id", body.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: "plan not found" }, { status: 404 });
      // Auto-unfocus any session whose active_plan_id points at this plan once
      // it's terminal (completed or abandoned) - a focus pointer to a done plan
      // is a data smell and causes new TodoWrite items to keep rolling into it.
      if (body.status === "completed" || body.status === "abandoned") {
        await db
          .from("sessions")
          .update({ active_plan_id: null })
          .eq("active_plan_id", body.id);
      }
      return Response.json({ ok: true, plan: data });
    }

    if (!body.session_id || !body.title) {
      return Response.json({ error: "session_id and title are required" }, { status: 400 });
    }
    const { data: session } = await db
      .from("sessions")
      .select("project_id")
      .eq("id", body.session_id)
      .maybeSingle();
    if (!session) {
      // Self-heal: unknown session_id (hooks not installed for it). Create a bare
      // row so the FK holds and the plan lands.
      await ensureSession(db, body.session_id, null, { source: "cli" });
    }
    const { data, error } = await db
      .from("plans")
      .insert({
        session_id: body.session_id,
        project_id: session?.project_id ?? null,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? "active",
        source: "cli",
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ ok: true, plan: data });
  } catch (e) {
    console.error("[ingest/plan]", e);
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
