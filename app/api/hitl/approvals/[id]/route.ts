import { checkApiKey, getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** GET /api/hitl/approvals/[id] -> { status, tool_name, ... } for the polling hook. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase not configured" }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db
    .from("hitl_approvals")
    .select("id, status, tool_name, decided_at, decided_by")
    .eq("id", id)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(data);
}

/**
 * PATCH /api/hitl/approvals/[id]
 * Body: { status: "approved" | "denied" | "timeout", decided_by?: string }
 * Used by the hook to record timeouts, and by the /hitl UI if it ever needs
 * an API path (server actions cover the interactive flow).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase not configured" }, { status: 503 });

  const { id } = await params;
  let body: { status?: string; decided_by?: string } = {};
  try { body = await req.json(); } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const status = body.status;
  if (status !== "approved" && status !== "denied" && status !== "timeout") {
    return Response.json({ error: "invalid status" }, { status: 400 });
  }

  const { error } = await db
    .from("hitl_approvals")
    .update({
      status,
      decided_at: new Date().toISOString(),
      decided_by: body.decided_by ?? "hook",
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
