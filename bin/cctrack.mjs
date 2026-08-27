#!/usr/bin/env node
// cctrack — log plans & tasks from inside a Claude Code session (or your shell).
//
//   cctrack plan add --title "Refactor auth" [--desc "…"] [--session <id>]
//   cctrack plan done <plan-id>
//   cctrack plan drop <plan-id>
//   cctrack task add --content "Write migration" [--desc "…"] [--plan <id>] [--status pending|in_progress|completed]
//   cctrack task update <task-id> --status in_progress
//   cctrack task done <task-id>
//   cctrack session current        # show the session hooks last saw
//   cctrack session end [id]
//
// Config: ~/.cc-track/config.json (written by hooks/install.mjs) or
// env CC_TRACK_URL / CC_TRACK_KEY.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function loadConfig() {
  let file = {};
  try {
    file = JSON.parse(readFileSync(join(homedir(), ".cc-track", "config.json"), "utf8"));
  } catch { /* no config file */ }
  return {
    url: process.env.CC_TRACK_URL ?? file.url,
    key: process.env.CC_TRACK_KEY ?? file.key,
  };
}

function currentSession() {
  try {
    return JSON.parse(readFileSync(join(homedir(), ".cc-track", "current-session.json"), "utf8"));
  } catch {
    return null;
  }
}

function parseFlags(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      flags[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    } else {
      positional.push(argv[i]);
    }
  }
  return { flags, positional };
}

async function post(path, body) {
  const cfg = loadConfig();
  if (!cfg.url || !cfg.key) {
    console.error("Not configured. Run: node hooks/install.mjs --url <url> --key <key>");
    process.exit(1);
  }
  const res = await fetch(new URL(path, cfg.url).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": cfg.key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`✖ ${res.status}: ${data.error ?? res.statusText}`);
    process.exit(1);
  }
  return data;
}

function sessionId(flags) {
  const id = flags.session ?? currentSession()?.session_id;
  if (!id) {
    console.error("No session id. Pass --session <id> (hooks normally track it automatically).");
    process.exit(1);
  }
  return id;
}

const [entity, action, ...rest] = process.argv.slice(2);
const { flags, positional } = parseFlags(rest);

try {
  if (entity === "plan" && action === "add") {
    if (!flags.title) {
      console.error("Usage: cctrack plan add --title \"…\" [--desc \"…\"] [--session <id>]");
      process.exit(1);
    }
    const data = await post("/api/ingest/plan", {
      session_id: sessionId(flags),
      title: flags.title,
      description: typeof flags.desc === "string" ? flags.desc : undefined,
    });
    console.log(`✔ plan created: ${data.plan.id}`);
    console.log(`  add tasks with: cctrack task add --plan ${data.plan.id} --content "…"`);
  } else if (entity === "plan" && (action === "done" || action === "drop" || action === "update")) {
    const id = positional[0];
    if (!id) {
      console.error("Usage: cctrack plan done|drop|update <plan-id>");
      process.exit(1);
    }
    const status = action === "done" ? "completed" : action === "drop" ? "abandoned" : flags.status;
    const data = await post("/api/ingest/plan", {
      id,
      ...(status ? { status } : {}),
      ...(typeof flags.title === "string" ? { title: flags.title } : {}),
      ...(typeof flags.desc === "string" ? { description: flags.desc } : {}),
    });
    console.log(`✔ plan updated: ${data.plan.id} → ${data.plan.status}`);
  } else if (entity === "task" && action === "add") {
    if (!flags.content) {
      console.error("Usage: cctrack task add --content \"…\" [--desc \"…\"] [--plan <id>] [--status pending|in_progress|completed]");
      process.exit(1);
    }
    const data = await post("/api/ingest/task", {
      session_id: sessionId(flags),
      content: flags.content,
      description: typeof flags.desc === "string" ? flags.desc : undefined,
      plan_id: typeof flags.plan === "string" ? flags.plan : undefined,
      status: typeof flags.status === "string" ? flags.status : undefined,
    });
    console.log(`✔ task ${data.upserted ? "updated" : "created"}: ${data.task.id}`);
  } else if (entity === "task" && (action === "update" || action === "done" || action === "start")) {
    const id = positional[0];
    if (!id) {
      console.error("Usage: cctrack task update|done|start <task-id> [--status …]");
      process.exit(1);
    }
    const status = action === "done" ? "completed" : action === "start" ? "in_progress" : flags.status;
    const data = await post("/api/ingest/task", {
      id,
      ...(status ? { status } : {}),
      ...(typeof flags.content === "string" ? { content: flags.content } : {}),
      ...(typeof flags.desc === "string" ? { description: flags.desc } : {}),
      ...(typeof flags.plan === "string" ? { plan_id: flags.plan } : {}),
    });
    console.log(`✔ task updated: ${data.task.id} → ${data.task.status}`);
  } else if (entity === "session" && action === "current") {
    const cur = currentSession();
    if (!cur) console.log("No session recorded yet (hooks haven't fired).");
    else console.log(`${cur.session_id}  (${cur.cwd}, ${cur.updated_at})`);
  } else if (entity === "session" && action === "end") {
    const id = positional[0] ?? sessionId(flags);
    const data = await post("/api/ingest/hook", {
      hook_event_name: "SessionEnd",
      session_id: id,
      source: "cli",
    });
    console.log(`✔ session ended: ${data.event}`);
  } else {
    console.log(`cctrack — log Claude Code plans & tasks

  cctrack plan add --title "…" [--desc "…"] [--session <id>]
  cctrack plan done <plan-id>          mark plan completed
  cctrack plan drop <plan-id>          mark plan abandoned
  cctrack plan update <plan-id> --title/--desc/--status …
  cctrack task add --content "…" [--desc "…"] [--plan <id>] [--status …]
  cctrack task start <task-id>
  cctrack task done <task-id>
  cctrack task update <task-id> --status/--content/--desc/--plan …
  cctrack session current
  cctrack session end [session-id]`);
  }
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(1);
}
