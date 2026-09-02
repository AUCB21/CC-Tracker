import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project, Plan, Task, TaskRun, RunLineage } from "./types";

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
    db.from("projects").select("name, path, per_run_budget_usd").eq("id", task.project_id).maybeSingle(),
    task.plan_id
      ? db.from("plans").select("title").eq("id", task.plan_id).maybeSingle()
      : Promise.resolve({ data: null } as { data: null }),
  ]);
  if (!project?.path) {
    return { error: "project has no path on file", status: 409 };
  }

  if (project.per_run_budget_usd != null) {
    const { data: spend } = await db
      .from("project_daily_spend")
      .select("spend_usd")
      .eq("project_id", task.project_id)
      .maybeSingle();
    if (Number(spend?.spend_usd ?? 0) > Number(project.per_run_budget_usd)) {
      return { error: "Daily project budget exceeded; new runs are blocked until tomorrow", status: 429 };
    }
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
    .select("id,task_id,status,verdict,verdict_reason,error,stdout_tail,diff_summary,parent_run_id,trigger,requested_at")
    .in("task_id", taskIds)
    .order("requested_at", { ascending: false });
  for (const r of (data as unknown as TaskRun[] | null) ?? []) {
    if (!r.task_id || out.has(r.task_id)) continue;
    out.set(r.task_id, r);
  }
  return out;
}

/**
 * Attempt N of M per task. `n` = depth of the LATEST run (walking parent_run_id
 * from that row up to a null parent). `m` = max depth over every run of the
 * same task (so re-Attending after a 3-deep chain reads "1/3" until the fresh
 * lineage grows). Only tasks whose latest run is part of a lineage (has a
 * parent or something above depth 1) appear in the returned map.
 */
export async function getLineageStatsByTask(
  db: SupabaseClient,
  taskIds: string[],
): Promise<Map<string, RunLineage>> {
  const out = new Map<string, RunLineage>();
  if (taskIds.length === 0) return out;
  const { data } = await db
    .from("task_runs")
    .select("id,task_id,parent_run_id,requested_at")
    .in("task_id", taskIds)
    .order("requested_at", { ascending: false });
  type Row = { id: string; task_id: string | null; parent_run_id: string | null; requested_at: string };
  const rows = (data as Row[] | null) ?? [];

  const byTask = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.task_id) continue;
    const list = byTask.get(r.task_id) ?? [];
    list.push(r);
    byTask.set(r.task_id, list);
  }

  for (const [taskId, taskRuns] of byTask) {
    const parentOf = new Map<string, string | null>();
    for (const r of taskRuns) parentOf.set(r.id, r.parent_run_id);
    const depthOf = (id: string): number => {
      let d = 1;
      const seen = new Set<string>([id]);
      let cur = parentOf.get(id) ?? null;
      while (cur && parentOf.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        d += 1;
        cur = parentOf.get(cur) ?? null;
      }
      return d;
    };
    const latest = taskRuns[0]; // ordered requested_at desc
    const n = depthOf(latest.id);
    let m = n;
    for (const r of taskRuns) m = Math.max(m, depthOf(r.id));
    if (n > 1 || m > 1 || latest.parent_run_id) out.set(taskId, { n, m });
  }
  return out;
}
