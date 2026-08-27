import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, Plan, Task, TaskRun } from "./types";

/**
 * Build the prompt Claude Code will receive when the user hits "Attend" on a task.
 * Pure function so we can unit-test it without a DB.
 */
export function buildAttendPrompt(input: {
  task: Pick<Task, "content" | "description" | "status">;
  plan?: Pick<Plan, "title"> | null;
  project?: Pick<Project, "name" | "path"> | null;
  override?: string;
}): string {
  const { task, plan, project, override } = input;
  const lines = [
    `Task: ${task.content}`,
    `Details: ${task.description?.trim() || "(none)"}`,
    `Status: ${task.status}`,
  ];
  if (plan?.title) lines.push(`Plan: ${plan.title}`);
  if (project?.name) lines.push(`Project: ${project.name}${project.path ? ` @ ${project.path}` : ""}`);
  const trimmedOverride = override?.trim();
  if (trimmedOverride) {
    lines.push("", "Extra instructions:", trimmedOverride);
  }
  return lines.join("\n");
}

/**
 * Queue a task_run. Fetches the task + its plan + project so the prompt captures
 * everything the runner needs (project cwd, plan context) at request time.
 * The runner never has to re-hydrate context.
 */
export async function enqueueTaskRun(
  db: SupabaseClient,
  taskId: string,
  opts: { override?: string } = {},
): Promise<{ run: TaskRun } | { error: string; status: number }> {
  const { data: task, error: taskErr } = await db
    .from("tasks")
    .select("id, content, description, status, plan_id, project_id")
    .eq("id", taskId)
    .maybeSingle();
  if (taskErr) return { error: taskErr.message, status: 500 };
  if (!task) return { error: "task not found", status: 404 };
  if (task.status === "completed") {
    return { error: "task is already completed", status: 409 };
  }
  if (!task.project_id) {
    return { error: "task has no project, cannot resolve a cwd to run in", status: 409 };
  }

  const [{ data: project }, { data: plan }] = await Promise.all([
    db.from("projects").select("name, path").eq("id", task.project_id).maybeSingle(),
    task.plan_id
      ? db.from("plans").select("title").eq("id", task.plan_id).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  if (!project?.path) {
    return { error: "project has no path on file", status: 409 };
  }

  const prompt = buildAttendPrompt({
    task,
    plan: plan as { title: string } | null,
    project: project as { name: string; path: string },
    override: opts.override,
  });

  const { data: run, error: insErr } = await db
    .from("task_runs")
    .insert({
      task_id: task.id,
      project_id: task.project_id,
      prompt,
      status: "queued",
    })
    .select("*")
    .single();
  if (insErr) return { error: insErr.message, status: 500 };
  return { run: run as TaskRun };
}

export async function getTaskRun(db: SupabaseClient, id: string): Promise<TaskRun | null> {
  const { data } = await db.from("task_runs").select("*").eq("id", id).maybeSingle();
  return (data as TaskRun) ?? null;
}

/** Latest run per task, keyed by task_id. One round-trip for the whole tasks page. */
export async function getLatestRunsByTask(
  db: SupabaseClient,
  taskIds: string[],
): Promise<Map<string, TaskRun>> {
  const out = new Map<string, TaskRun>();
  if (taskIds.length === 0) return out;
  const { data } = await db
    .from("task_runs")
    .select("*")
    .in("task_id", taskIds)
    .order("requested_at", { ascending: false });
  for (const r of (data as TaskRun[] | null) ?? []) {
    if (!r.task_id || out.has(r.task_id)) continue;
    out.set(r.task_id, r);
  }
  return out;
}
