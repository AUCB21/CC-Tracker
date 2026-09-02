import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "in_progress", "completed"]);

/**
 * PATCH /api/tasks/[id]
 * Body: { content?: string, status?: "pending"|"in_progress"|"completed", plan_id?: string|null }
 * Backs the task quick-edit modal. No auth (read/write, localhost app), same
 * as /api/sessions/[id]/events.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  let body: { content?: string; status?: string; plan_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.status !== undefined && !STATUSES.has(body.status)) {
    return Response.json({ error: "status must be pending, in_progress, or completed" }, { status: 400 });
  }
  if (body.content !== undefined && !body.content.trim()) {
    return Response.json({ error: "content cannot be empty" }, { status: 400 });
  }
  if (body.plan_id !== undefined && body.plan_id !== null && typeof body.plan_id !== "string") {
    return Response.json({ error: "plan_id must be a uuid string or null" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { updated_at: now };
  if (body.content !== undefined) patch.content = body.content.trim();
  if (body.plan_id !== undefined) patch.plan_id = body.plan_id;
  if (body.status !== undefined) {
    patch.status = body.status;
    patch.completed_at = body.status === "completed" ? now : null;
  }
  if (Object.keys(patch).length === 1) {
    return Response.json({ error: "nothing to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "task not found" }, { status: 404 });
  return Response.json({ ok: true, task: data });
}
