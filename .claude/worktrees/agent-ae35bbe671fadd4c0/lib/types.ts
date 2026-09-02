export type Project = {
  id: string;
  name: string;
  path: string;
  repo: string | null;
  per_run_budget_usd: number | null;
  per_run_max_turns: number | null;
  allowed_tools: string[] | null;
  created_at: string;
};

export type PromptKind = "system" | "template";

export type PromptRow = {
  id: string;
  project_id: string | null;
  kind: PromptKind;
  name: string;
  body: string;
  version: number;
  created_at: string;
};

export type Session = {
  id: string;
  project_id: string | null;
  cwd: string | null;
  git_branch: string | null;
  model: string | null;
  source: string | null;
  title: string | null;
  status: "active" | "ended";
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  prompt_count: number;
  tool_use_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  estimated_cost_usd: number;
  tool_breakdown: Record<string, number>;
};

export type Plan = {
  id: string;
  session_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  status: "active" | "completed" | "abandoned";
  source: string;
  created_at: string;
  completed_at: string | null;
};

export type Task = {
  id: string;
  plan_id: string | null;
  session_id: string | null;
  project_id: string | null;
  content: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  source: string;
  dedupe_key: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type TaskRunStatus = "queued" | "claimed" | "running" | "done" | "error" | "cancelled";

export type TaskRunVerdict = "pass" | "fail" | "needs_review";

export type DiffSummary = {
  files_changed: number;
  insertions: number;
  deletions: number;
};

export type TaskRun = {
  id: string;
  task_id: string | null;
  project_id: string | null;
  prompt: string;
  status: TaskRunStatus;
  agent_id: string | null;
  claude_session_id: string | null;
  stdout_tail: string | null;
  error: string | null;
  exit_code: number | null;
  total_cost_usd: number | null;
  usage: Record<string, unknown> | null;
  verdict: TaskRunVerdict | null;
  verdict_reason: string | null;
  diff_summary: DiffSummary | null;
  parent_run_id: string | null;
  trigger: string | null;
  requested_at: string;
  claimed_at: string | null;
  finished_at: string | null;
};

/**
 * Lineage stats for a task_run within its retry/followup chain.
 * `n` = this run's position (root = 1); `m` = max position seen across
 * every run of the same task (so a fresh manual attend after a 3-deep
 * chain reads as "1/3" until it grows its own tail).
 */
export type RunLineage = { n: number; m: number };

export const TASK_RUN_TERMINAL: TaskRunStatus[] = ["done", "error", "cancelled"];

export type EventRow = {
  id: number;
  session_id: string | null;
  type: string;
  tool_name: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
};

/** A session is considered "live" when it had activity recently. */
export const ACTIVE_WINDOW_MINUTES = 30;

export function isLive(s: { last_activity_at: string; status: string }): boolean {
  if (s.status === "ended") return false;
  const last = new Date(s.last_activity_at).getTime();
  return Date.now() - last < ACTIVE_WINDOW_MINUTES * 60_000;
}
