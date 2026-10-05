#!/usr/bin/env node
// One-time installer: writes ~/.cc-track/config.json and prints the
// ~/.claude/settings.json snippet to paste.
//
//   node hooks/install.mjs --url http://localhost:3000 --key <CC_TRACKER_API_KEY>
//
// With --mod it installs the cc-track mod (mods/cc-track) instead: it edits
// ~/.claude/settings.json in place (backup first) to load the mod through
// env.CLAUDE_CODE_PLUGIN_DIRS and removes the claude-tracker.mjs hook entries
// the mod replaces. Every other hook (HITL included) is left as it is. --key
// may be left out when ~/.cc-track/config.json already has one.
//
//   node hooks/install.mjs --mod [--url ...] [--key ...]

import { writeFileSync, mkdirSync, readFileSync, existsSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve, delimiter } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const useMod = args.includes("--mod");
const dir = join(homedir(), ".cc-track");
let existing = {};
try {
  existing = JSON.parse(readFileSync(join(dir, "config.json"), "utf8"));
} catch { /* first install */ }

const url = flag("url") ?? process.env.CC_TRACK_URL ?? (useMod ? existing.url : undefined) ?? "http://localhost:3000";
const key = flag("key") ?? process.env.CC_TRACK_KEY ?? (useMod ? existing.key : undefined);

if (!key) {
  console.error("Usage: node hooks/install.mjs [--mod] --url http://localhost:3000 --key <CC_TRACKER_API_KEY>");
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
// hitl_fail_closed: true -- once this file exists, a matcher firing while the
// tracker is unreachable denies the tool call instead of silently allowing
// it (see hooks/hitl.mjs). Safer default now that the tracker auto-shuts
// down after 60s idle.
writeFileSync(
  join(dir, "config.json"),
  JSON.stringify({ ...existing, url, key, hitl_fail_closed: existing.hitl_fail_closed ?? true }, null, 2),
);
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
if (useMod) {
  installMod();
} else if (existsSync(settingsPath)) {
  console.log(`\nMerge this into your existing ${settingsPath}:`);
  console.log(JSON.stringify(snippet, null, 2));
} else {
  console.log(`\nCreate ${settingsPath} with:`);
  console.log(JSON.stringify(snippet, null, 2));
}

function installMod() {
  // Forward slashes: valid on Windows too, and no JSON escaping to get wrong.
  const modDir = resolve(here, "..", "mods", "cc-track").replace(/\\/g, "/");
  let settings = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, ""));
    } catch (e) {
      console.error(`✖ ${settingsPath} is not plain JSON (${e.message}); nothing changed. Edit it by hand (README, "the cc-track mod").`);
      process.exit(1);
    }
    const backup = `${settingsPath}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    copyFileSync(settingsPath, backup);
    console.log(`✔ backed up settings to ${backup}`);
  }

  settings.env ??= {};
  const dirs = (settings.env.CLAUDE_CODE_PLUGIN_DIRS ?? "").split(delimiter).filter(Boolean);
  const norm = (p) => p.replace(/\\/g, "/").replace(/\/+$/, "").toLowerCase();
  if (!dirs.some((d) => norm(d) === norm(modDir))) dirs.push(modDir);
  settings.env.CLAUDE_CODE_PLUGIN_DIRS = dirs.join(delimiter);

  // Drop the forwarder entries the mod replaces; keep every other hook.
  let removed = 0;
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    if (!Array.isArray(groups)) continue;
    const kept = [];
    for (const group of groups) {
      const hooks = Array.isArray(group?.hooks) ? group.hooks : [];
      const rest = hooks.filter((h) => !String(h?.command ?? "").includes("claude-tracker.mjs"));
      removed += hooks.length - rest.length;
      if (rest.length > 0 || hooks.length === 0) kept.push({ ...group, hooks: rest });
    }
    if (kept.length > 0) settings.hooks[event] = kept;
    else delete settings.hooks[event];
  }
  if (settings.hooks && Object.keys(settings.hooks).length === 0) delete settings.hooks;

  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  console.log(`✔ ${settingsPath}: loads ${modDir}, removed ${removed} claude-tracker.mjs hook entr${removed === 1 ? "y" : "ies"}`);
  console.log("  Restart Claude Code (2.1.289 or newer) to load the mod.");
}

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
