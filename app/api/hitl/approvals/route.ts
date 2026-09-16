import { handlerWithDb } from "@/lib/api";

export const dynamic = "force-dynamic";

type ApprovalBody = {
  tool_name?: string;
  tool_input?: unknown;
  session_id?: string | null;
  task_run_id?: string | null;
};

/**
 * POST /api/hitl/approvals
 * Body: { tool_name?, tool_input?, session_id?, task_run_id? }
 * Called by the hitl.mjs hook to open a pending approval. Returns { id }.
 */
export const POST = handlerWithDb(
  (raw): ApprovalBody | null => (raw && typeof raw === "object" ? (raw as ApprovalBody) : null),
  async ({ db, body }) => {
    const { data, error } = await db
      .from("hitl_approvals")
      .insert({
        tool_name: body.tool_name ?? null,
        tool_input: body.tool_input ?? null,
        session_id: body.session_id ?? null,
        task_run_id: body.task_run_id ?? null,
      })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ id: (data as { id: string }).id });
  },
);
