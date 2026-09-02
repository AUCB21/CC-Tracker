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
