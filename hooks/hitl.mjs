#!/usr/bin/env node
// HITL PreToolUse hook.
//
// For tool calls matching configured "dangerous" patterns, pause the child,
// insert a `pending` row in hitl_approvals via the tracker, and poll until
// the /hitl UI flips it to approved / denied (or we time out).
//
// Exit code contract (Claude Code hooks):
//   0  -> allow the tool call
//   2  -> block/deny the tool call
//
// Matchers come from (in order):
//   - env CC_TRACK_HITL_MATCHERS  (comma-separated)
//   - ~/.cc-track/config.json     ("hitl_matchers": ["Bash:rm -rf", "WebFetch"])
//
// Each matcher is either "ToolName" (any use of that tool) or
// "ToolName:<substring>" (only when any string in tool_input contains it).
//
// Timeout: env CC_TRACK_HITL_TIMEOUT_MS or config.hitl_timeout_ms; default 60s.
//
// Fail-open by default: a tracker/network error exits 0 so the hook never
// wedges Claude when HITL isn't intentionally set up (no config file at all).
// Once a config.json exists with `hitl_fail_closed: true`, a tracker error
// AFTER a matcher has actually fired denies the tool call instead -- an
// unreachable tracker (e.g. the auto-shutdown idle server) must not silently
// turn HITL into a no-op. Matchers that never fire are unaffected either way.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STATE_DIR = join(homedir(), ".cc-track");

// Distinguishes "no config file" (HITL never set up -> always fail open) from
// "config file present" (fail-closed opt-in is meaningful).
function loadConfig() {
  try {
    const raw = readFileSync(join(STATE_DIR, "config.json"), "utf8");
    return { data: JSON.parse(raw), exists: true };
  } catch {
    return { data: {}, exists: false };
  }
}

// Match a matcher against a tool call. `matcher` is "ToolName" or
// "ToolName:<substring>"; a substring hit requires any string leaf in
// tool_input to contain it (case-sensitive).
function matches(matcher, toolName, toolInput) {
  const colon = matcher.indexOf(":");
  const name = colon === -1 ? matcher : matcher.slice(0, colon);
  const substr = colon === -1 ? "" : matcher.slice(colon + 1).trim();
  if (name !== toolName) return false;
  if (!substr) return true;
  // Substring-search the JSON serialization rather than walking string
  // leaves by hand -- same "does this needle appear anywhere in tool_input"
  // contract. `?? null` guards tool_input === undefined, where
  // JSON.stringify returns undefined (not a string) rather than "null".
  // Note: a needle containing `"` or `\` could false-negative against
  // JSON's escaping of those characters; fine as long as matcher substrings
  // stay plain text (paths, flags, command fragments).
  return JSON.stringify(toolInput ?? null).includes(substr);
}

function ok() { process.exit(0); }
function deny(msg) {
  if (msg) process.stderr.write(`${msg}\n`);
  process.exit(2);
}

// Called only after a matcher has fired and the tracker call itself errored
// or timed out (as opposed to a genuine pending->timeout after real polling,
// which already denies on its own). `failClosed` reflects config.json's
// explicit opt-in; anything else preserves the old fail-open contract.
function trackerUnavailable(failClosed) {
  if (failClosed) {
    deny("[hitl] tracker unreachable, denying to be safe (set hitl_fail_closed=false in config to allow)");
  }
  process.stderr.write("[hitl] tracker unreachable, allowing (fail-open)\n");
  ok();
}

async function main() {
  let raw;
  try {
    raw = readFileSync(0, "utf8");
  } catch { ok(); }
  let payload;
  try { payload = JSON.parse(raw); } catch { ok(); }
  if (!payload || typeof payload !== "object") ok();

  const { data: file, exists: configExists } = loadConfig();
  const failClosed = configExists && file.hitl_fail_closed === true;
  const url = process.env.CC_TRACK_URL ?? file.url;
  const key = process.env.CC_TRACK_KEY ?? file.key;
  const matchers = process.env.CC_TRACK_HITL_MATCHERS
    ? process.env.CC_TRACK_HITL_MATCHERS.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(file.hitl_matchers) ? file.hitl_matchers : [];
  const timeoutMs = Number(
    process.env.CC_TRACK_HITL_TIMEOUT_MS ?? file.hitl_timeout_ms ?? 60000,
  );

  if (!url || !key || matchers.length === 0) ok();

  const toolName = payload.tool_name;
  const toolInput = payload.tool_input;
  const sessionId = typeof payload.session_id === "string" ? payload.session_id : null;
  if (!toolName) ok();

  const hit = matchers.some((m) => matches(m, toolName, toolInput));
  if (!hit) ok();

  let approvalId;
  try {
    const res = await fetch(new URL("/api/hitl/approvals", url).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify({
        tool_name: toolName,
        tool_input: toolInput,
        session_id: sessionId,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) trackerUnavailable(failClosed);
    const body = await res.json();
    approvalId = body?.id;
  } catch { trackerUnavailable(failClosed); }
  if (!approvalId) trackerUnavailable(failClosed);

  const start = Date.now();
  const pollMs = 1000;
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, pollMs));
    try {
      const res = await fetch(
        new URL(`/api/hitl/approvals/${approvalId}`, url).toString(),
        { headers: { "x-api-key": key }, signal: AbortSignal.timeout(3000) },
      );
      if (!res.ok) continue;
      const body = await res.json();
      if (body?.status === "approved") ok();
      if (body?.status === "denied") deny(`HITL: tool call denied by operator.`);
    } catch { /* keep polling */ }
  }

  // Best-effort: mark the row timed-out so the UI stops showing it as pending.
  try {
    await fetch(new URL(`/api/hitl/approvals/${approvalId}/timeout`, url).toString(), {
      method: "POST",
      headers: { "x-api-key": key },
      signal: AbortSignal.timeout(2000),
    });
  } catch { /* ignore */ }
  deny(`HITL: approval timed out after ${Math.round(timeoutMs / 1000)}s.`);
}

main().catch(() => process.exit(0));
