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
import type { TaskRun } from "../lib/types";

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
};

async function execute(run: TaskRun, projectPath: string): Promise<void> {
  await patch(run.id, { status: "running" });
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
  // ponytail: run success => task done. Un-complete via `cctrack task update` if wrong.
  if (ok && run.task_id) {
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
    .select("*, project:projects(path)")
    .eq("status", "queued")
    .order("requested_at", { ascending: true })
    .limit(5);
  if (PROJECT_FILTER) q = q.eq("project_id", PROJECT_FILTER);
  const { data, error } = await q;
  if (error) {
    console.error(`[agent] poll error: ${error.message}`);
    return;
  }
  const rows = (data as (TaskRun & { project: { path: string } | null })[]) ?? [];
  for (const row of rows) {
    const path = row.project?.path;
    if (!path || !existsSync(path)) continue;
    const claimed = await claim(row.id);
    if (!claimed) continue;
    busy = true;
    console.log(`[agent] claimed ${claimed.id} (task=${claimed.task_id}) cwd=${path}`);
    try {
      await execute(claimed, path);
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
