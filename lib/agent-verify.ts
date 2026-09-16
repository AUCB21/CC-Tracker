// Pure helpers for the post-run verifier (Gap 2), plus the verifier itself.
// Split from bin/agent.mts so tests can exercise prompt shape and diff
// parsing without spawning claude.
import { spawn } from "node:child_process";
import { parseTrailingJson } from "./agent-parse";
import { gitShortstat, gitDiffText } from "./agent-git";
import type { DiffSummary, TaskRunVerdict } from "./types";

// Verdict parser: the verifier's assistant reply should contain a JSON object
// like {"verdict":"pass","reason":"..."}. Delegates the brace walk to
// parseTrailingJson, then validates the two fields.
export function parseVerdict(text: string): { verdict: TaskRunVerdict; reason: string } | null {
  const obj = parseTrailingJson(text);
  if (!obj) return null;
  const v = obj.verdict;
  if (v !== "pass" && v !== "fail" && v !== "needs_review") return null;
  const r = obj.reason;
  return { verdict: v, reason: typeof r === "string" ? r : "" };
}

// Cap the diff text at N bytes; note the truncation inline so the model knows
// it did not see everything and can weight its confidence accordingly.
export function capDiff(diff: string, maxBytes: number): string {
  if (diff.length <= maxBytes) return diff;
  return diff.slice(0, maxBytes) + `\n\n[... truncated, ${diff.length - maxBytes} more bytes]\n`;
}

export function buildVerifyPrompt(input: {
  taskContent: string;
  taskDescription?: string | null;
  planTitle?: string | null;
  diffStat: DiffSummary | null;
  diff: string;
  diffCapBytes?: number;
}): string {
  const cap = input.diffCapBytes ?? 20_000;
  const stat = input.diffStat
    ? `${input.diffStat.files_changed} files, +${input.diffStat.insertions} / -${input.diffStat.deletions}`
    : "unknown";
  return [
    "You are grading whether a code change actually accomplishes a stated task.",
    "Read the task, then the git diff, and decide if the diff plausibly satisfies the task.",
    "",
    `Task: ${input.taskContent}`,
    `Details: ${input.taskDescription?.trim() || "(none)"}`,
    input.planTitle ? `Plan: ${input.planTitle}` : "",
    "",
    `Diff summary: ${stat}`,
    "```diff",
    capDiff(input.diff, cap),
    "```",
    "",
    "Reply with ONE json object and nothing else:",
    `{"verdict": "pass" | "fail" | "needs_review", "reason": "one short sentence"}`,
    "",
    "Guidance:",
    "- pass: the diff plausibly does what the task asked for, no obvious gap.",
    "- fail: the diff clearly does NOT do the task, or does something contradictory.",
    "- needs_review: diff is unrelated, ambiguous, or the task requires runtime verification a diff alone cannot confirm.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------- verifier ----------
// Spawns a cheap, short-turn claude to grade the diff. Best-effort: any failure
// leaves verdict null and the caller proceeds as before Gap 2.
const VERIFIER_BUDGET_USD = 0.10;
const VERIFIER_MAX_TURNS = 3;

export type VerifierTaskContext = {
  content: string;
  description: string | null;
  planTitle: string | null;
};

export type VerifyOutcome = {
  verdict: TaskRunVerdict;
  reason: string;
  diffSummary: DiffSummary | null;
};

type SpawnResult =
  | { kind: "spawnerr"; msg: string }
  | { kind: "exit"; code: number | null };

// Minimal one-shot spawn for the verifier's own claude child. This is not the
// primary run's spawnOnce (which also supports kill() for cancellation) --
// that stays private to lib/agent-run.ts and isn't shared here.
function spawnVerifierClaude(
  bin: string,
  args: string[],
  cwd: string,
  onStdout: (chunk: string) => void,
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (d: Buffer) => onStdout(d.toString("utf8")));
    child.stderr.on("data", () => {});
    child.on("error", (err) => resolve({ kind: "spawnerr", msg: err.message }));
    child.on("close", (code) => resolve({ kind: "exit", code }));
  });
}

export async function runVerifier(
  taskCtx: VerifierTaskContext | null,
  cwd: string,
  parentCommit: string,
  headCommit: string,
  claudeBin: string,
  permissionMode: string,
): Promise<VerifyOutcome | null> {
  // The run finished ok but touched nothing tracked. Not "pass" (nothing to
  // show for it) and not "fail" (may have been read-only investigation).
  if (parentCommit === headCommit) {
    return {
      verdict: "needs_review",
      reason: "no committed changes since the run started",
      diffSummary: null,
    };
  }

  if (!taskCtx) return null;

  const diffSummary = gitShortstat(cwd, parentCommit, headCommit);
  const diff = gitDiffText(cwd, parentCommit, headCommit);
  // No code changes -> nothing to grade against; caller decides what to do.
  if (!diffSummary && !diff.trim()) return null;

  const prompt = buildVerifyPrompt({
    taskContent: taskCtx.content,
    taskDescription: taskCtx.description,
    planTitle: taskCtx.planTitle,
    diffStat: diffSummary,
    diff,
  });
  const args = [
    "-p", prompt,
    "--output-format", "json",
    "--max-turns", String(VERIFIER_MAX_TURNS),
    "--max-budget-usd", String(VERIFIER_BUDGET_USD),
  ];
  if (permissionMode) args.push("--permission-mode", permissionMode);

  let stdoutFull = "";
  const result = await spawnVerifierClaude(claudeBin, args, cwd, (chunk) => {
    stdoutFull += chunk;
  });
  if (result.kind !== "exit" || result.code !== 0) return null;

  const parsed = parseTrailingJson(stdoutFull) as { result?: string } | null;
  const replyText = typeof parsed?.result === "string" ? parsed.result : "";
  const verdict = parseVerdict(replyText);
  if (!verdict) return null;
  return { ...verdict, diffSummary };
}
