import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/prompts/[id]
 * Prompts are versioned rows grouped into families by (project_id, kind,
 * name); deleting a single row would orphan its sibling versions, so this
 * looks up the row's family key and deletes every row that shares it.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const { data: row, error: lookupError } = await db
    .from("prompts")
    .select("project_id, kind, name")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return Response.json({ error: lookupError.message }, { status: 500 });
  if (!row) return Response.json({ error: "prompt not found" }, { status: 404 });

  let deleteQuery = db.from("prompts").delete().eq("kind", row.kind).eq("name", row.name);
  deleteQuery = row.project_id
    ? deleteQuery.eq("project_id", row.project_id)
    : deleteQuery.is("project_id", null);
  const { error } = await deleteQuery;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
