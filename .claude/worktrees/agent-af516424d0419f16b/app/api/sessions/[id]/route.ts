import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/sessions/[id]
 * Body: { title?: string }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  let body: { title?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (body.title === undefined) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }
  const title = body.title.trim();
  if (!title || title.length > 200) {
    return Response.json({ error: "title must be 1-200 characters" }, { status: 400 });
  }

  const { data, error } = await db
    .from("sessions")
    .update({ title })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "session not found" }, { status: 404 });
  return Response.json({ ok: true, session: data });
}

/**
 * DELETE /api/sessions/[id]
 * Cascades to plans/tasks/events via schema FKs.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  const { error } = await db.from("sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
