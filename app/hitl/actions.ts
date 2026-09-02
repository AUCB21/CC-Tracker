"use server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";

export async function decideApproval(
  id: string,
  decision: "approved" | "denied" | "timeout",
): Promise<{ ok: true } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  // "timeout" comes from the hitl.mjs hook giving up on polling, not a human
  // click -- no decided_by in that case.
  const { data, error } = await db
    .from("hitl_approvals")
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      ...(decision === "timeout" ? {} : { decided_by: "ui" }),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  // `.eq("status", "pending")` matches zero rows once the row is already
  // terminal (approved/denied/timeout) -- without this check the UPDATE
  // "succeeds" with nothing changed and the caller wrongly reports success.
  if (!data) return { error: "already decided" };
  revalidatePath("/hitl");
  return { ok: true };
}
