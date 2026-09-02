import { checkApiKey, getSupabase } from "@/lib/supabase";
import { enqueueTaskRun } from "@/lib/attend";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/[id]/attend
 * Body: { override?: string }
 * Queues a task_run for a cctrack agent to pick up.
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
  let body: { override?: string } = {};
  try {
    if (req.headers.get("content-length") && req.headers.get("content-length") !== "0") {
      body = await req.json();
    }
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const result = await enqueueTaskRun(db, id, { override: body.override });
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ ok: true, run: result.run });
}
