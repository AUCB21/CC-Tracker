import { getSupabase, deleteRow } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/plans/[id]
 * Body: { title?: string, description?: string | null }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const db = getSupabase();
  if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });

  const { id } = await params;
  let body: { title?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title || title.length > 200) {
      return Response.json({ error: "title must be 1-200 characters" }, { status: 400 });
    }
    update.title = title;
  }

  if (body.description !== undefined) {
    const desc = body.description?.trim() ?? "";
    update.description = desc.length > 0 ? desc : null;
  }

  if (Object.keys(update).length === 0) {
    return Response.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await db
    .from("plans")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "plan not found" }, { status: 404 });
  return Response.json({ ok: true, plan: data });
}

/** DELETE /api/plans/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return deleteRow("plans", id, "plan");
}
