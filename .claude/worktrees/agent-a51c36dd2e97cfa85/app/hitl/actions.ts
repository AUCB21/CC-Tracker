"use server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export async function decideApproval(
  id: string,
  decision: "approved" | "denied",
): Promise<{ ok: true } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const { error } = await db
    .from("hitl_approvals")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      decided_by: "ui",
    })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/hitl");
  return { ok: true };
}
