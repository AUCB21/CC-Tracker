import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/projects/[id]
 * Body: { name?: string }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.name === undefined) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }
  const name = body.name.trim();
  if (!name || name.length > 200) {
    return Response.json({ error: "name must be 1-200 characters" }, { status: 400 });
  }

  const { data, error } = await db
    .from("projects")
    .update({ name })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "project not found" }, { status: 404 });
  return Response.json({ ok: true, project: data });
}

/**
 * DELETE /api/projects/[id]
 * Sessions detach (project_id -> null) via schema ON DELETE SET NULL; they
 * are not deleted.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const { data, error } = await db.from("projects").delete().eq("id", id).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "project not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
