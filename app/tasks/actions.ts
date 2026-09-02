"use server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import { enqueueTaskRun, getTaskRun } from "@/lib/attend";
import type { TaskRun } from "@/lib/types";
import { TASK_RUN_TERMINAL } from "@/lib/types";

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

/**
 * Follow-up prompt for a run that has already finished. Inserts a child
 * task_runs row whose `trigger='followup'`; the runner picks it up and
 * spawns `claude -p --resume <parent.claude_session_id>` so the follow-up
 * inherits the parent's session context.
 *
 * Guarded (permissively): parent must exist and be in a terminal state.
 * Empty / whitespace text is rejected so blank submits don't burn a run.
 */
export async function followUp(
  runId: string,
  text: string,
): Promise<{ ok: true; run_id: string } | { ok: false; error: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "follow-up text is empty" };
  const db = getSupabase();
  if (!db) return { ok: false, error: "Supabase not configured" };
  const parent = await getTaskRun(db, runId);
  if (!parent) return { ok: false, error: "parent run not found" };
  if (!TASK_RUN_TERMINAL.includes(parent.status)) {
    return { ok: false, error: "parent run is still active; wait for it to finish" };
  }
  const { data, error } = await db
    .from("task_runs")
    .insert({
      task_id: parent.task_id,
      project_id: parent.project_id,
      prompt: trimmed,
      status: "queued",
      parent_run_id: parent.id,
      trigger: "followup",
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/live");
  return { ok: true, run_id: (data as { id: string }).id };
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
