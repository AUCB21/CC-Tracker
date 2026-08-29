// Pure helpers for the post-run verifier (Gap 2). Split from bin/agent.mts so
// tests can exercise prompt shape and diff parsing without spawning claude.
import { parseTrailingJson } from "./agent-parse";
import type { DiffSummary, TaskRunVerdict } from "./types";

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
