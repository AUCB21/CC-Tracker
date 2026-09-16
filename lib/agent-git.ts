// Git helpers used by the post-run verifier: snapshot HEAD and diff between
// two commits. Split from bin/agent.mts so both the runner (lib/agent-run.ts)
// and the verifier (lib/agent-verify.ts) can use them without pulling in each
// other's runtime.
import { spawnSync } from "node:child_process";
import type { DiffSummary } from "./types";

// The final line of `git diff --shortstat` looks like:
//   " 3 files changed, 42 insertions(+), 7 deletions(-)"
// Any field can be absent (a rename-only diff has no ins/del; a pure delete
// has no insertions). Returns null when nothing matches so callers can
// distinguish "empty diff" from "unparseable".
export function parseShortstat(line: string): DiffSummary | null {
  const s = line.trim();
  if (!s) return null;
  const num = (re: RegExp): number => {
    const m = s.match(re);
    return m ? Number(m[1]) : 0;
  };
  const files = num(/(\d+)\s+files?\s+changed/);
  const ins = num(/(\d+)\s+insertions?\(\+\)/);
  const del = num(/(\d+)\s+deletions?\(-\)/);
  if (files === 0 && ins === 0 && del === 0) return null;
  return { files_changed: files, insertions: ins, deletions: del };
}

// null on any failure (not a git repo, git not installed, HEAD empty, etc);
// verifier callers treat null as "skip the verify pass".
export function gitHead(cwd: string): string | null {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  const head = r.stdout.trim();
  return head || null;
}

export function gitShortstat(cwd: string, from: string, to: string): DiffSummary | null {
  const r = spawnSync("git", ["diff", "--shortstat", `${from}..${to}`], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  return parseShortstat(r.stdout);
}

export function gitDiffText(cwd: string, from: string, to: string, maxBytes = 64 * 1024): string {
  const r = spawnSync("git", ["diff", `${from}..${to}`], {
    cwd, encoding: "utf8", maxBuffer: maxBytes * 4,
  });
  if (r.status !== 0) return "";
  return r.stdout;
}
