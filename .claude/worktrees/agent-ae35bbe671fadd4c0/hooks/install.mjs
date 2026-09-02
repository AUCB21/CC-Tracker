#!/usr/bin/env node
// One-time installer: writes ~/.cc-track/config.json and prints the
// ~/.claude/settings.json snippet to paste.
//
//   node hooks/install.mjs --url http://localhost:3000 --key <CC_TRACKER_API_KEY>

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const url = flag("url") ?? process.env.CC_TRACK_URL ?? "http://localhost:3000";
const key = flag("key") ?? process.env.CC_TRACK_KEY;

if (!key) {
  console.error("Usage: node hooks/install.mjs --url http://localhost:3000 --key <CC_TRACKER_API_KEY>");
  process.exit(1);
}

const dir = join(homedir(), ".cc-track");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "config.json"), JSON.stringify({ url, key }, null, 2));
console.log(`✔ wrote ${join(dir, "config.json")}`);

const here = dirname(fileURLToPath(import.meta.url));
const hookPath = join(here, "claude-tracker.mjs");
const hitlPath = join(here, "hitl.mjs");
// async: true → Claude Code fires the hook without waiting for it. The tracker
// still self-bounds (fetch timeout 1500ms + gitInfo 1500ms) so a stuck tracker
// never accumulates work.
const cmd = { type: "command", command: `node ${hookPath}`, async: true };
// HITL PreToolUse hook: must run synchronously so its exit code can gate the
// tool call. It self-bounds via CC_TRACK_HITL_TIMEOUT_MS (default 60s) and
// fails open when no matchers are configured or the tracker is unreachable.
const hitlCmd = { type: "command", command: `node ${hitlPath}` };
const snippet = {
  hooks: {
    SessionStart: [{ hooks: [cmd] }],
    UserPromptSubmit: [{ hooks: [cmd] }],
    PreToolUse: [{ matcher: "*", hooks: [hitlCmd] }],
    PostToolUse: [{ matcher: "*", hooks: [cmd] }],
    Stop: [{ hooks: [cmd] }],
    StopFailure: [{ hooks: [cmd] }],
    SubagentStart: [{ hooks: [cmd] }],
    SubagentStop: [{ hooks: [cmd] }],
    Notification: [{ hooks: [cmd] }],
    SessionEnd: [{ hooks: [cmd] }],
  },
};

const settingsPath = join(homedir(), ".claude", "settings.json");
if (existsSync(settingsPath)) {
  console.log(`\nMerge this into your existing ${settingsPath}:`);
} else {
  console.log(`\nCreate ${settingsPath} with:`);
}
console.log(JSON.stringify(snippet, null, 2));

// Smoke-test the tracker connection.
try {
  const res = await fetch(new URL("/api/health", url).toString(), {
    signal: AbortSignal.timeout(4000),
  });
  const body = await res.json();
  console.log(`\n✔ tracker reachable at ${url}:`, JSON.stringify(body));
  if (!body.db_configured) console.warn("⚠ tracker says Supabase is NOT configured yet — check .env.local");
  if (!body.ingestion_key_configured) console.warn("⚠ tracker says CC_TRACKER_API_KEY is not set server-side");
} catch (e) {
  console.warn(`\n⚠ could not reach tracker at ${url} (${e.message}) — start it with \`npm run dev\``);
}
