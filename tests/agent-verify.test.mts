// Run: npx tsx tests/agent-verify.test.mts
import assert from "node:assert/strict";
import { parseShortstat, parseVerdict, capDiff, buildVerifyPrompt } from "../lib/agent-verify";

// ---- parseShortstat -------------------------------------------------------
assert.deepEqual(
  parseShortstat(" 3 files changed, 42 insertions(+), 7 deletions(-)"),
  { files_changed: 3, insertions: 42, deletions: 7 },
);
// Singulars.
assert.deepEqual(
  parseShortstat(" 1 file changed, 1 insertion(+), 1 deletion(-)"),
  { files_changed: 1, insertions: 1, deletions: 1 },
);
// Rename only (no ins/del).
assert.deepEqual(
  parseShortstat(" 2 files changed"),
  { files_changed: 2, insertions: 0, deletions: 0 },
);
// Empty diff, nothing to parse.
assert.equal(parseShortstat(""), null);
assert.equal(parseShortstat("   "), null);
assert.equal(parseShortstat("some unrelated line"), null);

// ---- parseVerdict ---------------------------------------------------------
assert.deepEqual(
  parseVerdict('{"verdict":"pass","reason":"looks good"}'),
  { verdict: "pass", reason: "looks good" },
);
assert.deepEqual(
  parseVerdict('prose prose\n{"verdict":"fail","reason":"wrong file"}'),
  { verdict: "fail", reason: "wrong file" },
);
// Reason missing = empty string, still valid.
assert.deepEqual(parseVerdict('{"verdict":"needs_review"}'), { verdict: "needs_review", reason: "" });
// Unknown verdict.
assert.equal(parseVerdict('{"verdict":"maybe","reason":"?"}'), null);
// Not JSON.
assert.equal(parseVerdict("pass"), null);
// Array at top level.
assert.equal(parseVerdict("[]"), null);

// ---- capDiff --------------------------------------------------------------
assert.equal(capDiff("short", 100), "short");
const capped = capDiff("x".repeat(50), 10);
assert.ok(capped.startsWith("xxxxxxxxxx"));
assert.ok(capped.includes("truncated"));

// ---- buildVerifyPrompt ----------------------------------------------------
const p = buildVerifyPrompt({
  taskContent: "Add cache header",
  taskDescription: "Return Cache-Control on /api/foo",
  planTitle: "Perf sweep",
  diffStat: { files_changed: 1, insertions: 3, deletions: 0 },
  diff: "diff --git a/x b/x\n+cache!\n",
});
assert.ok(p.includes("Task: Add cache header"));
assert.ok(p.includes("Plan: Perf sweep"));
assert.ok(p.includes("1 files, +3 / -0"));
assert.ok(p.includes('"verdict": "pass" | "fail" | "needs_review"'));

// Empty description handled.
const p2 = buildVerifyPrompt({
  taskContent: "X",
  taskDescription: null,
  planTitle: null,
  diffStat: null,
  diff: "",
});
assert.ok(p2.includes("Details: (none)"));
assert.ok(p2.includes("Diff summary: unknown"));

console.log("agent-verify: ok");
