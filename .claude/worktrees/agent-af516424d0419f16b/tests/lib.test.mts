// Exercises the server-side aggregation helpers for real. Run: npx tsx tests/lib.test.mts
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateCost, pricingFor } from "../lib/cost";
import { processHook } from "../lib/ingest";
import {
  buildActivitySeries,
  buildTokenCostSeries,
  aggregateTools,
  taskStatusBreakdown,
  sessionDurationBuckets,
  hourlyActivity,
} from "../lib/series";
import type { Session, Task } from "../lib/types";

// ---- cost ----
assert.deepEqual(pricingFor("claude-opus-4-1"), pricingFor("opus"));
const sonnet = estimateCost("claude-sonnet-4-5-20250929", {
  input: 1_000_000,
  output: 1_000_000,
  cacheRead: 1_000_000,
  cacheCreation: 1_000_000,
});
assert.ok(Math.abs(sonnet - (3 + 15 + 0.3 + 3.75)) < 1e-6, `sonnet per-1M cost = ${sonnet}`);
const opus = estimateCost("claude-opus-4-1", { input: 0, output: 1_000_000, cacheRead: 0, cacheCreation: 0 });
assert.ok(Math.abs(opus - 25) < 1e-6, `opus output cost = ${opus}`);
assert.equal(estimateCost(null, { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 }), 0);

// ---- fixtures ----
const day = (offset: number, h = 12) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  d.setHours(h, 30, 0, 0);
  return d.toISOString();
};

function sess(over: Partial<Session>): Session {
  return {
    id: "s1",
    project_id: "p1",
    cwd: "/repo",
    git_branch: "main",
    model: "claude-sonnet-4-5",
    source: "startup",
    title: "t",
    status: "ended",
    started_at: day(1, 10),
    last_activity_at: day(1, 11),
    ended_at: day(1, 10),
    prompt_count: 3,
    tool_use_count: 5,
    input_tokens: 100,
    output_tokens: 50,
    cache_read_tokens: 1000,
    cache_creation_tokens: 10,
    estimated_cost_usd: 0.5,
    tool_breakdown: { Bash: 3, Edit: 2 },
    ...over,
  } as Session;
}

const sessions = [sess({}), sess({ id: "s2", started_at: day(0, 9), ended_at: day(0, 12) })];

// ---- activity series ----
const activity = buildActivitySeries(
  3,
  [
    { type: "prompt", created_at: day(0, 9) },
    { type: "prompt", created_at: day(0, 10) },
    { type: "tool_use", created_at: day(0, 10) },
    { type: "prompt", created_at: day(5, 10) }, // outside window → ignored
  ],
  sessions
);
assert.equal(activity.length, 3);
assert.equal(activity[2].prompts, 2);
assert.equal(activity[2].toolUses, 1);
assert.equal(activity[2].sessions, 1);
assert.equal(activity[0].prompts, 0);

// ---- token/cost series ----
// sessions[0] started yesterday (index 1), sessions[1] started today (index 2)
const tc = buildTokenCostSeries(3, sessions);
assert.equal(tc[1].input, 110, "input = input + cache_creation (yesterday's session)");
assert.equal(tc[1].cacheRead, 1000);
assert.ok(Math.abs(tc[1].cost - 0.5) < 1e-9);
assert.equal(tc[2].input, 110, "today's session in its own bucket");
assert.equal(tc[2].cacheRead, 1000);
assert.ok(Math.abs(tc[2].cost - 0.5) < 1e-9);
assert.equal(tc[0].input, 0, "empty bucket stays zero");

// ---- tools ----
const tools = aggregateTools(sessions);
assert.deepEqual(tools, [
  { tool: "Bash", count: 6 },
  { tool: "Edit", count: 4 },
]);

// ---- task status ----
const tasks = [
  { status: "completed" },
  { status: "completed" },
  { status: "in_progress" },
  { status: "pending" },
] as Task[];
const ts = taskStatusBreakdown(tasks);
assert.deepEqual(ts, [
  { name: "Completed", value: 2 },
  { name: "In progress", value: 1 },
  { name: "Pending", value: 1 },
]);

// ---- durations ----
const durs = sessionDurationBuckets([
  sess({ started_at: day(0, 10), ended_at: day(0, 10) }), // 0 min → <5m
  sess({ id: "x", started_at: new Date(day(0, 10)).toISOString(), ended_at: new Date(new Date(day(0, 10)).getTime() + 45 * 60_000).toISOString() }), // 45m
]);
assert.equal(durs[0].count, 1, "<5m bucket");
assert.equal(durs[3].count, 1, "30-60m bucket");

// ---- hourly ----
const hourly = hourlyActivity([{ created_at: day(0, 14) }, { created_at: day(1, 14) }, { created_at: day(2, 3) }]);
assert.equal(hourly.length, 24);
assert.equal(hourly[14].count, 2);
assert.equal(hourly[3].count, 1);

// ---- processHook: subagent lifecycle event labeling ----
// Minimal in-memory fake of the pieces of SupabaseClient that processHook touches:
// .from(table).select().eq().maybeSingle()/.single(), .insert(), .update().eq().
function makeFakeDb() {
  const state: Record<string, Record<string, unknown>[]> = { projects: [], sessions: [], events: [] };
  const matches = (row: Record<string, unknown>, filters: [string, unknown][]) =>
    filters.every(([c, v]) => row[c] === v);

  function builder(table: string) {
    let mode: "select" | "insert" | "update" = "select";
    let payload: Record<string, unknown> = {};
    const filters: [string, unknown][] = [];
    const rows = () => (state[table] ??= []);

    const exec = () => {
      if (mode === "insert") {
        const row = { id: `${table}-${rows().length + 1}`, ...payload };
        rows().push(row);
        return { data: row, error: null };
      }
      if (mode === "update") {
        for (const r of rows()) if (matches(r, filters)) Object.assign(r, payload);
        return { data: null, error: null };
      }
      const matched = rows().filter((r) => matches(r, filters));
      return { data: matched[0] ?? null, error: null };
    };

    const api = {
      select() { return api; },
      insert(obj: Record<string, unknown>) { mode = "insert"; payload = obj; return api; },
      update(obj: Record<string, unknown>) { mode = "update"; payload = obj; return api; },
      eq(col: string, val: unknown) { filters.push([col, val]); return api; },
      maybeSingle: async () => exec(),
      single: async () => exec(),
      then(resolve: (v: unknown) => void, reject: (e: unknown) => void) {
        Promise.resolve(exec()).then(resolve, reject);
      },
    };
    return api;
  }

  const db = { from: (table: string) => builder(table) } as unknown as SupabaseClient;
  return { db, state };
}

const { db: dbAgent, state: stateAgent } = makeFakeDb();
await processHook(dbAgent, {
  hook_event_name: "PostToolUse",
  session_id: "sess-agent",
  tool_name: "Agent",
  tool_input: { subagent_type: "general-purpose", description: "test task", prompt: "do the thing" },
  tool_response: {
    isAsync: true,
    status: "async_launched",
    agentId: "a082710724213758e",
    resolvedModel: "claude-sonnet-5",
    prompt: "do the thing",
  },
});
const agentEvents = stateAgent.events.filter((e) => e.session_id === "sess-agent");
assert.equal(agentEvents.length, 1);
assert.equal(agentEvents[0].type, "subagent_dispatch");
assert.equal((agentEvents[0].data as { agent_id?: string }).agent_id, "a082710724213758e");

const { db: dbStop, state: stateStop } = makeFakeDb();
await processHook(dbStop, {
  hook_event_name: "PostToolUse",
  session_id: "sess-stop",
  tool_name: "TaskStop",
  tool_input: { task_id: "b4sy9s04d" },
  tool_response: { message: "Successfully stopped task", task_id: "b4sy9s04d", task_type: "local_bash", command: "npm run dev" },
});
const stopEvents = stateStop.events.filter((e) => e.session_id === "sess-stop");
assert.equal(stopEvents.length, 1);
assert.equal(stopEvents[0].type, "subagent_kill");
assert.equal((stopEvents[0].data as { task_id?: string }).task_id, "b4sy9s04d");

const { db: dbMsg, state: stateMsg } = makeFakeDb();
await processHook(dbMsg, {
  hook_event_name: "PostToolUse",
  session_id: "sess-msg",
  tool_name: "SendMessage",
  tool_input: { to: "agent-1", summary: "status check", message: "how's it going" },
  tool_response: { success: true, message: "sent", display: "sent", msg_id: "aa784296-1" },
});
const msgEvents = stateMsg.events.filter((e) => e.session_id === "sess-msg");
assert.equal(msgEvents.length, 1);
assert.equal(msgEvents[0].type, "subagent_poll");
assert.equal((msgEvents[0].data as { to?: string }).to, "agent-1");

const { db: dbRead, state: stateRead } = makeFakeDb();
await processHook(dbRead, {
  hook_event_name: "PostToolUse",
  session_id: "sess-read",
  tool_name: "Read",
  tool_input: { file_path: "/foo.ts" },
  tool_response: { content: "..." },
});
const readEvents = stateRead.events.filter((e) => e.session_id === "sess-read");
assert.equal(readEvents.length, 1);
assert.equal(readEvents[0].type, "tool_use");

console.log("✔ tests/lib.test.mts — all assertions passed");
