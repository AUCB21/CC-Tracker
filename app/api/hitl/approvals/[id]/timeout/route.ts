import { checkApiKey } from "@/lib/supabase";
import { decideApproval } from "@/app/hitl/actions";

export const dynamic = "force-dynamic";

/**
 * POST /api/hitl/approvals/[id]/timeout
 * Called by the hitl.mjs hook when it gives up polling for a decision.
 * Thin wrapper over decideApproval so hooks (which can't call server
 * actions directly) and the UI share one pending->terminal write path.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;
  const { id } = await params;
  const result = await decideApproval(id, "timeout");
  if ("error" in result) {
    const status = result.error === "already decided" ? 409 : 500;
    return Response.json({ error: result.error }, { status });
  }
  return Response.json({ ok: true });
}
