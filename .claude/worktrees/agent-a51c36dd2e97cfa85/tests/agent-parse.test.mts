// Run: npx tsx tests/agent-parse.test.mts
import assert from "node:assert/strict";
import { parseTrailingJson } from "../lib/agent-parse";

// Plain JSON body.
assert.deepEqual(
  parseTrailingJson('{"session_id":"abc","total_cost_usd":0.12}'),
  { session_id: "abc", total_cost_usd: 0.12 },
);

// Real-shape claude -p --output-format json result (nested usage object).
const real = `{"type":"result","session_id":"a1b2","total_cost_usd":0.0421,"usage":{"input_tokens":100,"output_tokens":50,"cache_read_input_tokens":0}}`;
const parsed = parseTrailingJson(real);
assert.equal(parsed?.session_id, "a1b2");
assert.equal((parsed?.usage as { input_tokens: number }).input_tokens, 100);

// Prefixed by stray log lines and trailing newline.
assert.deepEqual(
  parseTrailingJson(`some pre-init noise\n[warn] weird\n{"a":1,"b":{"c":2}}\n`),
  { a: 1, b: { c: 2 } },
);

// Nested braces don't fool the reverse walker.
assert.deepEqual(
  parseTrailingJson('prefix {"outer":{"inner":{"x":1}}}'),
  { outer: { inner: { x: 1 } } },
);

// Failure modes: no closing brace, malformed json, array at top level, empty.
assert.equal(parseTrailingJson(""), null);
assert.equal(parseTrailingJson("no json here"), null);
assert.equal(parseTrailingJson("{not valid}"), null);
assert.equal(parseTrailingJson("[1,2,3]"), null);
// Unbalanced (missing opening brace) walker returns null.
assert.equal(parseTrailingJson('"x":1}'), null);

console.log("agent-parse: ok");
