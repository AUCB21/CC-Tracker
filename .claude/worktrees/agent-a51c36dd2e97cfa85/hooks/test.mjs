// Unit tests for the transcript parser + series aggregation helpers.
// Run: node hooks/test.mjs
import assert from "node:assert/strict";
import { summarizeTranscriptText } from "./transcript.mjs";

// ---- transcript parsing ----
const transcript = [
  // real user prompt
  JSON.stringify({
    type: "user",
    isMeta: false,
    message: { role: "user", content: "refactor the auth module" },
  }),
  // assistant reply with usage + tool calls
  JSON.stringify({
    type: "assistant",
    message: {
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 10, output_tokens: 50, cache_read_input_tokens: 1000, cache_creation_input_tokens: 200 },
      content: [
        { type: "text", text: "ok" },
        { type: "tool_use", name: "Read", input: {} },
        { type: "tool_use", name: "Edit", input: {} },
      ],
    },
  }),
  // tool result comes back as a user message with array content → NOT a prompt
  JSON.stringify({
    type: "user",
    message: { role: "user", content: [{ type: "tool_result", content: "file contents" }] },
  }),
  // meta message → NOT a prompt
  JSON.stringify({ type: "user", isMeta: true, message: { role: "user", content: "command output" } }),
  // sidechain (subagent) tokens count for cost, its tools/prompts don't
  JSON.stringify({
    type: "assistant",
    isSidechain: true,
    message: {
      role: "assistant",
      model: "claude-sonnet-4-20250514",
      usage: { input_tokens: 5, output_tokens: 20 },
      content: [{ type: "tool_use", name: "Bash", input: {} }],
    },
  }),
  // garbage line is skipped
  "not json at all",
  "",
].join("\n");

const s = summarizeTranscriptText(transcript);
assert.equal(s.prompt_count, 1, "only real string-content user messages count as prompts");
assert.equal(s.tool_use_count, 2, "sidechain tool calls are excluded from main-chain count");
assert.deepEqual(s.tools, { Read: 1, Edit: 1 });
assert.equal(s.input_tokens, 15, "sidechain tokens still count toward cost");
assert.equal(s.output_tokens, 70);
assert.equal(s.cache_read_tokens, 1000);
assert.equal(s.cache_creation_tokens, 200);
assert.equal(s.model, "claude-sonnet-4-20250514");

// empty / broken input
const empty = summarizeTranscriptText("");
assert.equal(empty.prompt_count, 0);
assert.equal(empty.model, null);

console.log("✔ hooks/test.mjs — all assertions passed");
