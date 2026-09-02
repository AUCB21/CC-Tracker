import { getSupabase } from "@/lib/supabase";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: Task["status"][] = ["pending", "in_progress", "completed"];

/**
 * PATCH /api/tasks/[id]
 * Body: { content?: string, status?: Task["status"], plan_id?: string | null }
 * Quick-edit from the /plans and /tasks UI. Only supplied fields are updated.
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

  const update: Record<string, unknown> = {};

  if (body.content !== undefined) {
    const content = body.content.trim();
    if (!content) return Response.json({ error: "content must not be empty" }, { status: 400 });
    update.content = content;
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status as Task["status"])) {
      return Response.json({ error: `status must be one of ${STATUSES.join(", ")}` }, { status: 400 });
    }
    update.status = body.status;
    update.completed_at = body.status === "completed" ? new Date().toISOString() : null;
  }

  if (body.plan_id !== undefined) {
    if (body.plan_id !== null && typeof body.plan_id !== "string") {
      return Response.json({ error: "plan_id must be a uuid string or null" }, { status: 400 });
    }
    update.plan_id = body.plan_id;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("tasks")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "task not found" }, { status: 404 });
  return Response.json({ ok: true, task: data as Task });
}

/**
 * DELETE /api/tasks/[id]
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("tasks").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "task not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
