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
