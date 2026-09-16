// Drives a single task_run to completion: spawns claude, tails stdio, works
// around the Windows DLL-init race, polls for cancellation, dispatches the
// Gap-2 verifier, and enqueues a retry on failure. Split from bin/agent.mts
// so the entry point stays a thin poll loop.
import { spawn, spawnSync } from "node:child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseTrailingJson } from "./agent-parse";
import { runVerifier } from "./agent-verify";
import { gitHead } from "./agent-git";
import { RESUMES } from "./types";
import type { TaskRun, TaskRunTrigger, TaskRunVerdict } from "./types";
import { ancestorTriggers, type LineageRow } from "./lineage";

export type RunOptions = {
  permissionMode: string; // "" means opt-out (no flag appended)
  claudeBin: string;
  agentId: string;
  pollMs: number;
  tailBytes?: number;
};

export type ProjectFields = {
  path: string;
  per_run_budget_usd: number | null;
  per_run_max_turns: number | null;
};

const TAIL_BYTES = 8 * 1024;

// 0xC0000142 STATUS_DLL_INIT_FAILED — Windows DLL initializer race, intermittent.
// Retry with backoff before giving up.
const DLL_INIT_FAIL = 3221225794;
const DLL_RETRIES = 3; // up to 3 extra attempts: delays 1s, 2s, 4s

const MAX_RETRIES_PER_LINEAGE = 2;

async function patch(db: SupabaseClient, runId: string, fields: Partial<TaskRun>): Promise<void> {
  await db.from("task_runs").update(fields).eq("id", runId);
}

function tail(buf: string, chunk: string, tailBytes: number): string {
  const merged = buf + chunk;
  return merged.length > tailBytes ? merged.slice(-tailBytes) : merged;
}

type SpawnResult =
  | { kind: "spawnerr"; msg: string }
  | { kind: "exit"; code: number | null };

function spawnOnce(
  bin: string,
  args: string[],
  cwd: string,
  onStdout: (chunk: string) => void,
  onStderr: (chunk: string) => void,
): { promise: Promise<SpawnResult>; kill: () => void } {
  let child: ReturnType<typeof spawn> | null = null;
  // No shell:true — the prompt is untrusted user text and could contain
  // shell metacharacters. spawn with argv is safe against injection.
  // stdio: ignore stdin — claude.exe (single-binary with bundled node)
  // fails DLL init (0xC0000142) if it inherits a piped-but-unused stdin
  // when launched directly (no shell). "ignore" makes it a null device.
  const promise = new Promise<SpawnResult>((resolve) => {
    child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout!.on("data", (d: Buffer) => onStdout(d.toString("utf8")));
    child.stderr!.on("data", (d: Buffer) => onStderr(d.toString("utf8")));
    child.on("error", (err) => resolve({ kind: "spawnerr", msg: err.message }));
    child.on("close", (code) => resolve({ kind: "exit", code }));
  });
  const kill = () => {
    if (!child) return;
    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    } else {
      child.kill();
    }
  };
  return { promise, kill };
}

// The final JSON blob claude emits with --output-format json. Only the fields
// we actually consume; unknown extras are fine (jsonb column keeps everything).
type ClaudeJsonResult = {
  session_id?: string;
  total_cost_usd?: number;
  usage?: Record<string, unknown>;
  result?: string;
};

async function planTitleForTask(db: SupabaseClient, taskId: string | null): Promise<string | null> {
  if (!taskId) return null;
  const { data } = await db
    .from("tasks")
    .select("plan:plans(title)")
    .eq("id", taskId)
    .maybeSingle();
  const plan = (data as { plan: { title: string } | null } | null)?.plan;
  return plan?.title ?? null;
}

async function taskContext(db: SupabaseClient, taskId: string | null): Promise<{ content: string; description: string | null } | null> {
  if (!taskId) return null;
  const { data } = await db
    .from("tasks")
    .select("content, description")
    .eq("id", taskId)
    .maybeSingle();
  if (!data) return null;
  return data as { content: string; description: string | null };
}

async function resumeSessionFor(db: SupabaseClient, run: TaskRun): Promise<string | null> {
  if (!run.parent_run_id || !run.trigger || !RESUMES[run.trigger as TaskRunTrigger]) return null;
  const { data } = await db
    .from("task_runs")
    .select("claude_session_id")
    .eq("id", run.parent_run_id)
    .maybeSingle();
  const sid = (data as { claude_session_id: string | null } | null)?.claude_session_id;
  return sid ?? null;
}

// Walk parent_run_id upward from `run` (exclusive) and count how many
// ancestors were themselves retry_on_fail rows. Used to cap retries per
// lineage rather than per task, so a task's retry budget doesn't reset when a
// new manual Attend starts a fresh chain.
//
// One round trip for the whole task's run history, then walk the parent
// chain in memory -- avoids a DB call per ancestor on long retry chains.
async function countAncestorRetries(db: SupabaseClient, run: TaskRun): Promise<number> {
  if (!run.task_id) return 0;
  const { data } = await db
    .from("task_runs")
    .select("id,parent_run_id,trigger")
    .eq("task_id", run.task_id);
  const rows = (data as LineageRow[] | null) ?? [];
  return ancestorTriggers(rows, run.id, "retry_on_fail");
}

async function enqueueRetry(db: SupabaseClient, run: TaskRun): Promise<void> {
  const priorRetries = await countAncestorRetries(db, run);
  if (priorRetries >= MAX_RETRIES_PER_LINEAGE) return;
  const { error } = await db.from("task_runs").insert({
    task_id: run.task_id,
    project_id: run.project_id,
    prompt: run.prompt,
    status: "queued",
    parent_run_id: run.id,
    trigger: "retry_on_fail",
  });
  if (error) console.error(`[agent] retry enqueue failed for ${run.id}: ${error.message}`);
}

// Verify pass (Gap 2) + task auto-completion. Best-effort: any verifier
// failure leaves verdict null and the task is still auto-completed as if the
// verifier didn't exist.
async function finishRun(
  db: SupabaseClient,
  run: TaskRun,
  projectPath: string,
  parentCommit: string | null,
  claudeBin: string,
  permissionMode: string,
  now: string,
): Promise<void> {
  let verdict: TaskRunVerdict | null = null;
  if (parentCommit) {
    const headCommit = gitHead(projectPath);
    if (headCommit) {
      const ctx = await taskContext(db, run.task_id);
      const planTitle = await planTitleForTask(db, run.task_id);
      const outcome = await runVerifier(
        ctx ? { content: ctx.content, description: ctx.description, planTitle } : null,
        projectPath,
        parentCommit,
        headCommit,
        claudeBin,
        permissionMode,
      );
      if (outcome) {
        await patch(db, run.id, {
          verdict: outcome.verdict,
          verdict_reason: outcome.reason,
          diff_summary: outcome.diffSummary,
        });
        verdict = outcome.verdict;
      }
    }
  }

  // Auto-complete the task unless the verifier is confident the run didn't
  // actually do it. `fail` and `needs_review` leave the task where it was so
  // a human can look at it. Null verdict (non-git project, verifier crash)
  // keeps the pre-Gap-2 best-effort behaviour.
  if (run.task_id && verdict !== "fail" && verdict !== "needs_review") {
    await db
      .from("tasks")
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq("id", run.task_id);
  }
}

// Runs one task_run to completion (or cancellation). Never throws — errors
// are patched to the row. Returns when the run is in a terminal state.
export async function runOne(
  db: SupabaseClient,
  run: TaskRun,
  project: ProjectFields,
  opts: RunOptions,
): Promise<void> {
  try {
    const projectPath = project.path;
    const tailBytes = opts.tailBytes ?? TAIL_BYTES;

    await patch(db, run.id, { status: "running" });
    // Snapshot HEAD before spawning so the verifier can diff against it.
    // Null when the project is not a git repo; verifier just skips in that case.
    const parentCommit = gitHead(projectPath);
    const resumeSessionId = await resumeSessionFor(db, run);
    let stdoutTail = "";
    // Full stdout: --output-format json emits ONE json blob on stdout at the end.
    // stderr (info/debug lines) is not accumulated here, only in the ui-facing tail.
    let stdoutFull = "";
    let lastFlush = 0;
    const flushIfDue = async () => {
      const nowMs = Date.now();
      if (nowMs - lastFlush < 2000) return;
      lastFlush = nowMs;
      await patch(db, run.id, { stdout_tail: stdoutTail });
    };
    const onStdout = (chunk: string) => {
      stdoutFull += chunk;
      stdoutTail = tail(stdoutTail, chunk, tailBytes);
      void flushIfDue();
    };
    const onStderr = (chunk: string) => {
      stdoutTail = tail(stdoutTail, chunk, tailBytes);
      void flushIfDue();
    };
    // Retry-log messages: land in the ui tail only, never in stdoutFull (would
    // corrupt the trailing JSON parse).
    const onNote = (chunk: string) => {
      stdoutTail = tail(stdoutTail, chunk, tailBytes);
      void flushIfDue();
    };

    // Followup / retry_on_fail inherit the parent's claude session when
    // it's known, so context (files read, prior reasoning) is preserved. Falls
    // back to a fresh session when the parent finished before we captured its
    // session id.
    const args = resumeSessionId
      ? ["-p", "--resume", resumeSessionId, run.prompt, "--output-format", "json"]
      : ["-p", run.prompt, "--output-format", "json"];
    if (opts.permissionMode) args.push("--permission-mode", opts.permissionMode);
    if (project.per_run_budget_usd != null) args.push("--max-budget-usd", String(project.per_run_budget_usd));
    if (project.per_run_max_turns != null) args.push("--max-turns", String(project.per_run_max_turns));

    let cancelled = false;
    let currentKill: (() => void) | null = null;

    // Poll the owned row; if the UI cancels it, kill the child and bail.
    const cancelPoller = setInterval(async () => {
      if (cancelled) return;
      const { data } = await db.from("task_runs").select("status").eq("id", run.id).maybeSingle();
      if (data?.status === "cancelled") {
        cancelled = true;
        clearInterval(cancelPoller);
        currentKill?.();
      }
    }, opts.pollMs);

    let result: SpawnResult = { kind: "exit", code: null };
    for (let i = 0; i <= DLL_RETRIES; i++) {
      if (cancelled) break;
      if (i > 0) {
        // ponytail: simple exponential backoff, good enough for a 3-attempt race-condition fix.
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (i - 1)));
        onNote(`\n[agent] 0xC0000142 on attempt ${i}, retrying (${i}/${DLL_RETRIES})…\n`);
        // Fresh attempt should not have the previous try's partial JSON leaking in.
        stdoutFull = "";
      }
      const spawned = spawnOnce(opts.claudeBin, args, projectPath, onStdout, onStderr);
      currentKill = spawned.kill;
      result = await spawned.promise;
      currentKill = null;
      if (cancelled) break;
      if (result.kind === "spawnerr") break;
      if (result.code !== DLL_INIT_FAIL) break;
    }

    clearInterval(cancelPoller);

    // Row already has 'cancelled' status set by the server action; don't overwrite.
    if (cancelled) return;

    const now = new Date().toISOString();
    if (result.kind === "spawnerr") {
      await patch(db, run.id, {
        status: "error",
        error: result.msg,
        stdout_tail: stdoutTail,
        finished_at: now,
      });
      await enqueueRetry(db, run);
      return;
    }
    const code = result.code;
    const ok = code === 0;
    const parsed = ok ? (parseTrailingJson(stdoutFull) as ClaudeJsonResult | null) : null;
    await patch(db, run.id, {
      status: ok ? "done" : "error",
      error: ok ? null : `claude exited with code ${code}`,
      exit_code: code,
      stdout_tail: stdoutTail,
      finished_at: now,
      // Only overwrite when the parse succeeded; otherwise leave nulls.
      ...(parsed?.session_id ? { claude_session_id: parsed.session_id } : {}),
      ...(typeof parsed?.total_cost_usd === "number" ? { total_cost_usd: parsed.total_cost_usd } : {}),
      ...(parsed?.usage ? { usage: parsed.usage } : {}),
    });

    if (!ok) {
      await enqueueRetry(db, run);
      return;
    }

    await finishRun(db, run, projectPath, parentCommit, opts.claudeBin, opts.permissionMode, now);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await patch(db, run.id, {
      status: "error",
      error: msg,
      finished_at: new Date().toISOString(),
    });
    console.error(`[agent] execute crashed: ${msg}`);
  }
}
