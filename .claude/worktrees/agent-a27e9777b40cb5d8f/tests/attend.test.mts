// Self-check for the attend prompt builder. Run: npx tsx tests/attend.test.mts
import assert from "node:assert/strict";
import { buildAttendPrompt } from "../lib/attend";

const base = buildAttendPrompt({
  task: { content: "Write migration", description: "Move auth to new schema", status: "pending" },
  plan: { title: "Auth refactor" },
  project: { name: "cc-track", path: "C:/repos/cc-track" },
});
assert.match(base, /^Task: Write migration$/m);
assert.match(base, /^Details: Move auth to new schema$/m);
assert.match(base, /^Status: pending$/m);
assert.match(base, /^Plan: Auth refactor$/m);
assert.match(base, /^Project: cc-track @ C:\/repos\/cc-track$/m);

// No description → "(none)"
const noDesc = buildAttendPrompt({
  task: { content: "Only content", description: null, status: "in_progress" },
});
assert.match(noDesc, /^Details: \(none\)$/m);

// Whitespace description also collapses to "(none)"
const wsDesc = buildAttendPrompt({
  task: { content: "x", description: "   \n  ", status: "pending" },
});
assert.match(wsDesc, /^Details: \(none\)$/m);

// Override appears after a blank line
const withOverride = buildAttendPrompt({
  task: { content: "x", description: "y", status: "pending" },
  override: "focus on test coverage",
});
assert.match(withOverride, /\n\nExtra instructions:\nfocus on test coverage$/);

// Whitespace-only override is ignored
const emptyOverride = buildAttendPrompt({
  task: { content: "x", description: "y", status: "pending" },
  override: "   ",
});
assert.doesNotMatch(emptyOverride, /Extra instructions/);

console.log("✔ tests/attend.test.mts - all assertions passed");
