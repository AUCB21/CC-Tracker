import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/plans/[id]
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("plans").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "plan not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
