"use server";
import { getSupabase } from "@/lib/supabase";
import { enqueueTaskRun, getTaskRun } from "@/lib/attend";
import type { TaskRun } from "@/lib/types";

export async function queueAttend(
  taskId: string,
  override?: string,
): Promise<{ run: TaskRun } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const result = await enqueueTaskRun(db, taskId, { override });
  if ("error" in result) return { error: result.error };
  return { run: result.run };
}

export async function pollRun(runId: string): Promise<TaskRun | null> {
  const db = getSupabase();
  if (!db) return null;
  return getTaskRun(db, runId);
}

export async function cancelRun(runId: string): Promise<{ ok: true } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const { error } = await db
    .from("task_runs")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("id", runId)
    .in("status", ["queued", "claimed", "running"]);
  if (error) return { error: error.message };
  return { ok: true };
}
