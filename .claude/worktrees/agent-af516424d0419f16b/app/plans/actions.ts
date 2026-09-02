"use server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export async function renamePlan(
  planId: string,
  patch: { title?: string; description?: string | null },
): Promise<{ ok: true } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const title = patch.title?.trim();
  if (patch.title !== undefined && (!title || title.length > 200)) {
    return { error: "Title must be 1-200 characters" };
  }
  const update: Record<string, unknown> = {};
  if (title) update.title = title;
  if (patch.description !== undefined) {
    const desc = patch.description?.trim() ?? "";
    update.description = desc.length > 0 ? desc : null;
  }
  if (Object.keys(update).length === 0) return { error: "Nothing to update" };
  const { error } = await db.from("plans").update(update).eq("id", planId);
  if (error) return { error: error.message };
  revalidatePath("/plans");
  revalidatePath("/");
  return { ok: true };
}
