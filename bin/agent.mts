// cctrack agent — polls task_runs and executes claude -p in the correct cwd.
//
// Run: npm run agent  (loads .env.local)
//
// Requires (same env as the web app):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SECRET or SUPABASE_SERVICE_ROLE_KEY
//
// Optional:
//   CC_TRACK_AGENT_ID    friendly name to stamp on claimed rows (default: hostname)
//   CC_TRACK_PROJECT_ID  only pick up runs for this project id
//   CC_TRACK_POLL_MS     poll interval (default 3000)
//   CC_TRACK_CLAUDE_BIN  path to the claude executable (default: "claude")
//
// The runner spawns `claude -p <prompt>` with cwd = project.path. That child
// emits normal cc-track hooks, so its work still surfaces in the dashboard;
// this row just tracks the one-off remote request.

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { hostname, homedir } from "node:os";
import { join } from "node:path";
import { getSupabase } from "../lib/supabase";
import { parseTrailingJson } from "../lib/agent-parse";
import {
  parseShortstat,
  parseVerdict,
  buildVerifyPrompt,
} from "../lib/agent-verify";
import type { DiffSummary, TaskRun, TaskRunVerdict } from "../lib/types";

const AGENT_ID = process.env.CC_TRACK_AGENT_ID ?? hostname();
const POLL_MS = Number(process.env.CC_TRACK_POLL_MS ?? 3000);
const PROJECT_FILTER = process.env.CC_TRACK_PROJECT_ID?.trim() || null;
// Headless claude has no one to approve permission prompts, so remote-attend
// runs need a non-interactive permission mode. Defaults to "acceptEdits"
// (auto-approves Write/Edit) so the child can actually change files. Override
// with CC_TRACK_PERMISSION_MODE=bypassPermissions for full autonomy, or set
// it to an empty string to opt out entirely.
const PERMISSION_MODE =
  process.env.CC_TRACK_PERMISSION_MODE === undefined
    ? "acceptEdits"
    : process.env.CC_TRACK_PERMISSION_MODE.trim();
const TAIL_BYTES = 8 * 1024;

// 0xC0000142 STATUS_DLL_INIT_FAILED — Windows DLL initializer race, intermittent.
// Retry with backoff before giving up.
const DLL_INIT_FAIL = 3221225794;
const DLL_RETRIES = 3; // up to 3 extra attempts: delays 1s, 2s, 4s

function resolveClaudeBin(): string {
  const override = process.env.CC_TRACK_CLAUDE_BIN?.trim();
  if (override) return override;
  const win = process.platform === "win32";
  // Try `where`/`which` for a PATH lookup.
  const finder = spawnSync(win ? "where" : "which", ["claude"], { encoding: "utf8" });
  if (finder.status === 0) {
    const first = finder.stdout.split(/\r?\n/).map((l) => l.trim()).find(Boolean);
    if (first) return first;
  }
  // Fall back to the default Anthropic installer location.
  const fallback = join(homedir(), ".local", "bin", win ? "claude.exe" : "claude");
  if (existsSync(fallback)) return fallback;
  return "claude";
}

const CLAUDE_BIN = resolveClaudeBin();

const db = getSupabase();
if (!db) {
  console.error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET.");
  process.exit(1);
}

// ponytail: single-concurrent run per agent. Simplest correct thing. Add a pool
// if one machine ever runs many attends at once.
let busy = false;

async function claim(runId: string): Promise<TaskRun | null> {
  const { data } = await db!
    .from("task_runs")
    .update({
      status: "claimed",
      agent_id: AGENT_ID,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();
  return (data as TaskRun) ?? null;
}

async function patch(runId: string, fields: Partial<TaskRun>): Promise<void> {
  await db!.from("task_runs").update(fields).eq("id", runId);
}

function tail(buf: string, chunk: string): string {
  const merged = buf + chunk;
  return merged.length > TAIL_BYTES ? merged.slice(-TAIL_BYTES) : merged;
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
    child.stdout.on("data", (d: Buffer) => onStdout(d.toString("utf8")));
    child.stderr.on("data", (d: Buffer) => onStderr(d.toString("utf8")));
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

// ---------- git helpers for the verifier ----------
// null on any failure (not a git repo, git not installed, HEAD empty, etc);
// verifier callers treat null as "skip the verify pass".
function gitHead(cwd: string): string | null {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  const head = r.stdout.trim();
  return head || null;
}

function gitShortstat(cwd: string, from: string, to: string): DiffSummary | null {
  const r = spawnSync("git", ["diff", "--shortstat", `${from}..${to}`], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  return parseShortstat(r.stdout);
}

function gitDiffText(cwd: string, from: string, to: string, maxBytes = 64 * 1024): string {
  const r = spawnSync("git", ["diff", `${from}..${to}`], {
    cwd, encoding: "utf8", maxBuffer: maxBytes * 4,
  });
  if (r.status !== 0) return "";
  return r.stdout;
}

// ---------- verifier ----------
// Spawns a cheap, short-turn claude to grade the diff. Best-effort: any failure
// leaves verdict null and the caller proceeds as before Gap 2.
const VERIFIER_BUDGET_USD = 0.10;
const VERIFIER_MAX_TURNS = 3;
type VerifyOutcome = {
  verdict: TaskRunVerdict;
  reason: string;
  diffSummary: DiffSummary | null;
};

async function runVerifier(
  taskContent: string,
  taskDescription: string | null,
  planTitle: string | null,
  cwd: string,
  fromCommit: string,
  toCommit: string,
): Promise<VerifyOutcome | null> {
  const diffSummary = gitShortstat(cwd, fromCommit, toCommit);
  const diff = gitDiffText(cwd, fromCommit, toCommit);
  // No code changes -> nothing to grade against; caller decides what to do.
  if (!diffSummary && !diff.trim()) return null;

  const prompt = buildVerifyPrompt({
    taskContent, taskDescription, planTitle, diffStat: diffSummary, diff,
  });
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--max-turns", String(VERIFIER_MAX_TURNS),
    "--max-budget-usd", String(VERIFIER_BUDGET_USD),
  ];
  if (PERMISSION_MODE) args.push("--permission-mode", PERMISSION_MODE);

  let stdoutFull = "";
  const spawned = spawnOnce(
    CLAUDE_BIN, args, cwd,
    (chunk) => { stdoutFull += chunk; },
    () => {},
  );
  const result = await spawned.promise;
  if (result.kind !== "exit" || result.code !== 0) return null;

  const parsed = parseTrailingJson(stdoutFull) as ClaudeJsonResult | null;
  const replyText = typeof parsed?.result === "string" ? parsed.result : "";
  const verdict = parseVerdict(replyText);
  if (!verdict) return null;
  return { ...verdict, diffSummary };
}

async function planTitleForTask(taskId: string | null): Promise<string | null> {
  if (!taskId) return null;
  const { data } = await db!
    .from("tasks")
    .select("plan:plans(title)")
    .eq("id", taskId)
    .maybeSingle();
  const plan = (data as { plan: { title: string } | null } | null)?.plan;
  return plan?.title ?? null;
}

async function taskContext(taskId: string | null): Promise<{ content: string; description: string | null } | null> {
  if (!taskId) return null;
  const { data } = await db!
    .from("tasks")
    .select("content, description")
    .eq("id", taskId)
    .maybeSingle();
  if (!data) return null;
  return data as { content: string; description: string | null };
}

async function execute(
  run: TaskRun,
  projectPath: string,
  budgetUsd: number | null = null,
  maxTurns: number | null = null,
  allowedTools: string[] | null = null,
): Promise<void> {
  await patch(run.id, { status: "running" });
  // Snapshot HEAD before spawning so the verifier can diff against it.
  // Null when the project is not a git repo; verifier just skips in that case.
  const parentCommit = gitHead(projectPath);
  let stdoutTail = "";
  // Full stdout: --output-format json emits ONE json blob on stdout at the end.
  // stderr (info/debug lines) is not accumulated here, only in the ui-facing tail.
  let stdoutFull = "";
  let lastFlush = 0;
  const flushIfDue = async () => {
    const now = Date.now();
    if (now - lastFlush < 2000) return;
    lastFlush = now;
    await patch(run.id, { stdout_tail: stdoutTail });
  };
  const onStdout = (chunk: string) => {
    stdoutFull += chunk;
    stdoutTail = tail(stdoutTail, chunk);
    void flushIfDue();
  };
  const onStderr = (chunk: string) => {
    stdoutTail = tail(stdoutTail, chunk);
    void flushIfDue();
  };
  // Retry-log messages: land in the ui tail only, never in stdoutFull (would
  // corrupt the trailing JSON parse).
  const onNote = (chunk: string) => {
    stdoutTail = tail(stdoutTail, chunk);
    void flushIfDue();
  };

  const args = ["-p", run.prompt, "--output-format", "json"];
  if (PERMISSION_MODE) args.push("--permission-mode", PERMISSION_MODE);
  if (budgetUsd != null) args.push("--max-budget-usd", String(budgetUsd));
  if (maxTurns != null) args.push("--max-turns", String(maxTurns));
  if (allowedTools && allowedTools.length > 0) {
    args.push("--allowedTools", allowedTools.join(","));
  }

  let cancelled = false;
  let currentKill: (() => void) | null = null;

  // Poll the owned row; if the UI cancels it, kill the child and bail.
  const cancelPoller = setInterval(async () => {
    if (cancelled) return;
    const { data } = await db!.from("task_runs").select("status").eq("id", run.id).maybeSingle();
    if (data?.status === "cancelled") {
      cancelled = true;
      clearInterval(cancelPoller);
      currentKill?.();
    }
  }, POLL_MS);

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
    const spawned = spawnOnce(CLAUDE_BIN, args, projectPath, onStdout, onStderr);
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
    await patch(run.id, {
      status: "error",
      error: result.msg,
      stdout_tail: stdoutTail,
      finished_at: now,
    });
    return;
  }
  const code = result.code;
  const ok = code === 0;
  const parsed = ok ? (parseTrailingJson(stdoutFull) as ClaudeJsonResult | null) : null;
  await patch(run.id, {
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

  if (!ok) return;

  // Verify pass (Gap 2). Best-effort; any failure leaves verdict null and
  // the task is still auto-completed as if verifier didn't exist.
  let verdict: TaskRunVerdict | null = null;
  if (parentCommit) {
    const headCommit = gitHead(projectPath);
    if (headCommit && headCommit === parentCommit) {
      // The run finished ok but touched nothing tracked. Not "pass" (nothing
      // to show for it) and not "fail" (may have been read-only investigation).
      await patch(run.id, {
        verdict: "needs_review",
        verdict_reason: "no committed changes since the run started",
      });
      verdict = "needs_review";
    } else if (headCommit) {
      const ctx = await taskContext(run.task_id);
      const planTitle = await planTitleForTask(run.task_id);
      const outcome = ctx
        ? await runVerifier(ctx.content, ctx.description, planTitle, projectPath, parentCommit, headCommit)
        : null;
      if (outcome) {
        await patch(run.id, {
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
    await db!
      .from("tasks")
      .update({ status: "completed", completed_at: now, updated_at: now })
      .eq("id", run.task_id);
  }
}

async function tick(): Promise<void> {
  if (busy) return;
  let q = db!
    .from("task_runs")
    .select("*, project:projects(path, per_run_budget_usd, per_run_max_turns, allowed_tools)")
    .eq("status", "queued")
    .order("requested_at", { ascending: true })
    .limit(5);
  if (PROJECT_FILTER) q = q.eq("project_id", PROJECT_FILTER);
  const { data, error } = await q;
  if (error) {
    console.error(`[agent] poll error: ${error.message}`);
    return;
  }
  type ProjectFields = {
    path: string;
    per_run_budget_usd: number | null;
    per_run_max_turns: number | null;
    allowed_tools: string[] | null;
  };
  const rows = (data as (TaskRun & { project: ProjectFields | null })[]) ?? [];
  for (const row of rows) {
    const proj = row.project;
    const path = proj?.path;
    if (!path || !existsSync(path)) continue;
    const claimed = await claim(row.id);
    if (!claimed) continue;
    busy = true;
    console.log(`[agent] claimed ${claimed.id} (task=${claimed.task_id}) cwd=${path}`);
    try {
      await execute(
        claimed,
        path,
        proj?.per_run_budget_usd ?? null,
        proj?.per_run_max_turns ?? null,
        proj?.allowed_tools ?? null,
      );
      console.log(`[agent] finished ${claimed.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await patch(claimed.id, {
        status: "error",
        error: msg,
        finished_at: new Date().toISOString(),
      });
      console.error(`[agent] execute crashed: ${msg}`);
    } finally {
      busy = false;
    }
    break; // one at a time; loop again next tick
  }
}

console.log(
  `[agent] cctrack agent id=${AGENT_ID} poll=${POLL_MS}ms bin=${CLAUDE_BIN} permission=${PERMISSION_MODE || "(default)"}${PROJECT_FILTER ? ` project=${PROJECT_FILTER}` : ""}`,
);
setInterval(() => {
  void tick();
}, POLL_MS);
void tick();
