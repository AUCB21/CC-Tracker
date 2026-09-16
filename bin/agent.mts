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

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { hostname, homedir } from "node:os";
import { join } from "node:path";
import { getSupabase } from "../lib/supabase";
import { runOne } from "../lib/agent-run";
import type { ProjectFields } from "../lib/agent-run";
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tick(): Promise<void> {
  let q = db!
    .from("task_runs")
    .select("*, project:projects(path, per_run_budget_usd, per_run_max_turns)")
    .eq("status", "queued")
    .order("requested_at", { ascending: true })
    .limit(5);
  if (PROJECT_FILTER) q = q.eq("project_id", PROJECT_FILTER);
  const { data, error } = await q;
  if (error) {
    console.error(`[agent] poll error: ${error.message}`);
    return;
  }
  const rows = (data as (TaskRun & { project: ProjectFields | null })[]) ?? [];
  for (const row of rows) {
    const proj = row.project;
    const path = proj?.path;
    if (!path || !existsSync(path)) continue;
    const claimed = await claim(row.id);
    if (!claimed) continue;
    console.log(`[agent] claimed ${claimed.id} (task=${claimed.task_id}) cwd=${path}`);
    await runOne(
      db!,
      claimed,
      {
        path,
        per_run_budget_usd: proj?.per_run_budget_usd ?? null,
        per_run_max_turns: proj?.per_run_max_turns ?? null,
      },
      {
        permissionMode: PERMISSION_MODE,
        claudeBin: CLAUDE_BIN,
        agentId: AGENT_ID,
        pollMs: POLL_MS,
      },
    );
    console.log(`[agent] finished ${claimed.id}`);
    break; // one at a time; loop again next tick
  }
}

// ponytail: single-concurrent run per agent. Simplest correct thing. Add a pool
// if one machine ever runs many attends at once.
async function main() {
  console.log(
    `[agent] cctrack agent id=${AGENT_ID} poll=${POLL_MS}ms bin=${CLAUDE_BIN} permission=${PERMISSION_MODE || "(default)"}${PROJECT_FILTER ? ` project=${PROJECT_FILTER}` : ""}`,
  );
  while (true) {
    await tick();
    await sleep(POLL_MS);
  }
}
main();
