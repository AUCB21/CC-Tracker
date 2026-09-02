#!/usr/bin/env node
// Claude Code hook → CC-Track forwarder.
// Wire it to SessionStart / UserPromptSubmit / PostToolUse / Stop / SessionEnd.
// It reads the hook JSON from stdin, enriches it, and POSTs it to the tracker.
// It NEVER fails loudly or blocks Claude Code: any error exits silently with 0.

import { readFileSync, writeFileSync, mkdirSync, utimesSync, closeSync, openSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import { summarizeTranscriptText } from "./transcript.mjs";

const STATE_DIR = join(homedir(), ".cc-track");
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HEARTBEAT = join(REPO_ROOT, ".heartbeat");
const VBS = join(REPO_ROOT, "start-hidden.vbs");

function touchHeartbeat() {
  try {
    const now = new Date();
    if (existsSync(HEARTBEAT)) utimesSync(HEARTBEAT, now, now);
    else closeSync(openSync(HEARTBEAT, "w"));
  } catch { /* best effort */ }
}

async function ensureTrackerUp(cfg) {
  try {
    const res = await fetch(new URL("/api/health", cfg.url).toString(), {
      signal: AbortSignal.timeout(500),
    });
    if (res.ok) return;
  } catch { /* down, boot below */ }
  // ponytail: windows-first (uses start-hidden.vbs). Add nohup ./start.sh branch when a non-Windows dev shows up.
  if (process.platform !== "win32" || !existsSync(VBS)) return;
  try {
    spawn("wscript.exe", [VBS], {
      cwd: REPO_ROOT,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } catch { /* best effort */ }
}

function loadConfig() {
  const env = {
    url: process.env.CC_TRACK_URL,
    key: process.env.CC_TRACK_KEY,
  };
  if (env.url && env.key) return env;
  try {
    const file = JSON.parse(readFileSync(join(STATE_DIR, "config.json"), "utf8"));
    return { url: env.url ?? file.url, key: env.key ?? file.key };
  } catch {
    return { url: env.url, key: env.key };
  }
}

function gitInfo(cwd) {
  const out = { git_branch: null, repo: null };
  try {
    out.git_branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd,
      timeout: 1500,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch { /* not a git repo */ }
  try {
    out.repo = execFileSync("git", ["remote", "get-url", "origin"], {
      cwd,
      timeout: 1500,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch { /* no remote */ }
  return out;
}

async function main() {
  const raw = readFileSync(0, "utf8");
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }
  if (!payload || typeof payload !== "object") return;

  const cfg = loadConfig();
  if (!cfg.url || !cfg.key) return;

  // Keep the tracker alive on every hook fire; re-probe on SessionStart and each
  // UserPromptSubmit so a server that died mid-session comes back before the
  // next prompt turns into tool calls.
  touchHeartbeat();
  if (
    payload.hook_event_name === "SessionStart" ||
    payload.hook_event_name === "UserPromptSubmit"
  ) {
    await ensureTrackerUp(cfg);
  }

  const cwd = payload.cwd || process.cwd();
  payload.cwd = cwd;
  Object.assign(payload, gitInfo(cwd));

  // On Stop, compute token/cost summary from the transcript.
  if (payload.hook_event_name === "Stop" && payload.transcript_path) {
    try {
      payload.summary = summarizeTranscriptText(
        readFileSync(payload.transcript_path, "utf8")
      );
    } catch { /* transcript unreadable */ }
  }

  // Remember the current session so the `cctrack` CLI can target it.
  if (payload.session_id) {
    try {
      mkdirSync(STATE_DIR, { recursive: true });
      writeFileSync(
        join(STATE_DIR, "current-session.json"),
        JSON.stringify({ session_id: payload.session_id, cwd, updated_at: new Date().toISOString() })
      );
    } catch { /* ignore */ }
  }

  try {
    await fetch(new URL("/api/ingest/hook", cfg.url).toString(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": cfg.key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(1500),
    });
  } catch { /* tracker unreachable — never block Claude Code */ }
}

main()
  .catch(() => {})
  .finally(() => process.exit(0));
