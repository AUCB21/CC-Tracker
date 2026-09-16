import { handlerWithDb } from "@/lib/api";
import { dedupeKeyFor } from "@/lib/dedupe";
import { ensureSession } from "@/lib/ingest";

export const dynamic = "force-dynamic";

type TaskBody = {
  id?: string;
  session_id?: string;
  plan_id?: string | null;
  content?: string;
  description?: string | null;
  status?: "pending" | "in_progress" | "completed";
};

/**
 * Create or update a task.
 * POST { id?, session_id?, plan_id?, content?, status? }
 * Without an id, upserts by (session_id, content) so repeated calls don't duplicate.
 */
export const POST = handlerWithDb(
  (raw): TaskBody | null => (raw && typeof raw === "object" ? (raw as TaskBody) : null),
  async ({ db, body }) => {
    const now = new Date().toISOString();
    if (body.id) {
      const patch: Record<string, unknown> = { updated_at: now };
      if (body.content !== undefined) patch.content = body.content;
      if (body.description !== undefined) patch.description = body.description;
      if (body.plan_id !== undefined) patch.plan_id = body.plan_id;
      if (body.status !== undefined) {
        patch.status = body.status;
        patch.completed_at = body.status === "completed" ? now : null;
      }
      const { data, error } = await db
        .from("tasks")
        .update(patch)
        .eq("id", body.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) return Response.json({ error: "task not found" }, { status: 404 });
      return Response.json({ ok: true, task: data });
    }

    if (!body.content) {
      return Response.json({ error: "content is required" }, { status: 400 });
    }
    const sessionId = body.session_id ?? null;

    let projectId: string | null = null;
    let sessionActivePlanId: string | null = null;
    if (sessionId) {
      const { data: session } = await db
        .from("sessions")
        .select("project_id, active_plan_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (session) {
        projectId = session.project_id ?? null;
        sessionActivePlanId = (session.active_plan_id as string | null) ?? null;
      } else {
        // Self-heal: session isn't tracked (hooks not fired for it, or CLI used
        // before SessionStart). Create a bare row so the FK holds and the task lands.
        await ensureSession(db, sessionId, null, { source: "cli" });
      }
    }
    // If the caller didn't pass --plan, inherit the session's focused plan.
    const effectivePlanId = body.plan_id !== undefined ? body.plan_id : sessionActivePlanId;

    // Project-scoped (falling back to session when there's no project) so the same
    // task text continues as one row across sessions instead of duplicating per session.
    // Historical rows keep their old session-scoped dedupe_key; this is forward-only, no backfill.
    const scopeId = projectId ?? sessionId;
    const dedupeKey = scopeId ? dedupeKeyFor("cli", scopeId, body.content) : null;

    if (dedupeKey) {
      const { data: existing } = await db
        .from("tasks")
        .select("id")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();
      if (existing) {
        const patch: Record<string, unknown> = { updated_at: now };
        if (body.description !== undefined) patch.description = body.description;
        if (body.plan_id !== undefined) patch.plan_id = body.plan_id;
        if (body.status !== undefined) {
          patch.status = body.status;
          patch.completed_at = body.status === "completed" ? now : null;
        }
        const { data, error } = await db
          .from("tasks")
          .update(patch)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return Response.json({ ok: true, task: data, upserted: true });
      }
    }

    const status = body.status ?? "pending";
    const { data, error } = await db
      .from("tasks")
      .insert({
        plan_id: effectivePlanId ?? null,
        session_id: sessionId,
        project_id: projectId,
        content: body.content,
        description: body.description ?? null,
        status,
        source: "cli",
        dedupe_key: dedupeKey,
        completed_at: status === "completed" ? now : null,
      })
      .select()
      .single();
    if (error) throw error;
    return Response.json({ ok: true, task: data });
  },
);
