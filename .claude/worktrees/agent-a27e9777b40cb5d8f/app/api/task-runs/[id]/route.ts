import { checkApiKey, getSupabase } from "@/lib/supabase";
import { getTaskRun } from "@/lib/attend";

export const dynamic = "force-dynamic";

/**
 * GET /api/task-runs/[id]
 * Returns the task_run row so the UI (or a caller) can poll for status.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const run = await getTaskRun(db, id);
  if (!run) return Response.json({ error: "task_run not found" }, { status: 404 });
  return Response.json({ ok: true, run });
}
