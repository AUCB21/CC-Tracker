import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeKeyFor } from "../dedupe";
import { ensureSession } from "../ingest";
import { asRecord, truncField, truncStr } from "./handlers";
import type { HandlerContext } from "./handlers";

type ToolContext = HandlerContext & {
  toolName: string;
  input: Record<string, unknown>;
  response: Record<string, unknown>;
};

type ToolHandler = (ctx: ToolContext) => Promise<void>;

async function handleTodoWrite(ctx: ToolContext): Promise<void> {
  const { db, sessionId, projectId, input, addEvent, withPid, toolName } = ctx;
  const todos = (input as { todos?: unknown[] }).todos;
  if (Array.isArray(todos)) {
    await syncTodoWrite(
      db,
      sessionId,
      projectId,
      todos as { content: string; status: string; activeForm?: string }[]
    );
    await addEvent("tasks_synced", {
      tool_name: toolName,
      data: withPid({ count: todos.length }),
    });
  }
}

async function handleAgent(ctx: ToolContext): Promise<void> {
  const { input, response, addEvent, withPid, toolName } = ctx;
  await addEvent("subagent_dispatch", {
    tool_name: toolName,
    data: withPid({
      agent_id: response.agentId ?? null,
      subagent_type: input.subagent_type ?? null,
      description: input.description ?? null,
      model: response.resolvedModel ?? null,
      is_async: response.isAsync ?? null,
      status: response.status ?? null,
      prompt: truncField(input.prompt, 2000),
    }),
  });
}

async function handleTaskStop(ctx: ToolContext): Promise<void> {
  const { response, addEvent, withPid, toolName } = ctx;
  await addEvent("subagent_kill", {
    tool_name: toolName,
    data: withPid({
      task_id: response.task_id ?? null,
      task_type: response.task_type ?? null,
      command: truncField(response.command, 500),
    }),
  });
}

async function handleSendMessage(ctx: ToolContext): Promise<void> {
  const { input, response, addEvent, withPid, toolName } = ctx;
  await addEvent("subagent_poll", {
    tool_name: toolName,
    data: withPid({
      to: input.to ?? null,
      summary: input.summary ?? null,
      msg_id: response.msg_id ?? null,
      success: response.success ?? null,
      message: truncField(input.message, 500),
    }),
  });
}

async function handleTaskGet(ctx: ToolContext): Promise<void> {
  const { input, addEvent, withPid, toolName } = ctx;
  await addEvent("subagent_poll", {
    tool_name: toolName,
    data: withPid({ task_id: input.task_id ?? null }),
  });
}

async function handleTaskOutput(ctx: ToolContext): Promise<void> {
  const { input, addEvent, withPid, toolName } = ctx;
  await addEvent("subagent_poll", {
    tool_name: toolName,
    data: withPid({ task_id: input.task_id ?? null }),
  });
}

async function handleUnknownTool(ctx: ToolContext): Promise<void> {
  const { payload, addEvent, withPid, toolName } = ctx;
  await addEvent("tool_use", {
    tool_name: toolName,
    data: withPid({
      input: truncStr(payload.tool_input),
      response: truncStr(payload.tool_response),
      tool_use_id: payload.tool_use_id ?? null,
    }),
  });
}

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  TodoWrite: handleTodoWrite,
  Agent: handleAgent,
  TaskStop: handleTaskStop,
  SendMessage: handleSendMessage,
  TaskGet: handleTaskGet,
  TaskOutput: handleTaskOutput,
};

export async function handlePostToolUse(ctx: HandlerContext): Promise<void> {
  const { db, sessionId, projectId, payload } = ctx;
  await ensureSession(db, sessionId, projectId);
  const toolName = payload.tool_name ?? "unknown";
  const { data: sess } = await db
    .from("sessions")
    .select("tool_use_count,tool_breakdown")
    .eq("id", sessionId)
    .single();
  const breakdown: Record<string, number> = { ...(sess?.tool_breakdown ?? {}) };
  breakdown[toolName] = (breakdown[toolName] ?? 0) + 1;
  await db
    .from("sessions")
    .update({
      tool_use_count: (sess?.tool_use_count ?? 0) + 1,
      tool_breakdown: breakdown,
    })
    .eq("id", sessionId);

  const input = asRecord(payload.tool_input);
  const response = asRecord(payload.tool_response);
  const toolCtx: ToolContext = { ...ctx, toolName, input, response };
  const handler = TOOL_HANDLERS[toolName] ?? handleUnknownTool;
  await handler(toolCtx);
}

/**
 * Sync a Claude Code TodoWrite list into tasks (upsert by content hash).
 *
 * One bulk `.in("dedupe_key", ...)` read replaces the old per-todo
 * `.maybeSingle()` select (N+1 → 1 read + N writes, writes fired in
 * parallel since each row is independent).
 */
async function syncTodoWrite(
  db: SupabaseClient,
  sessionId: string,
  projectId: string | null,
  todos: { content: string; status: string; activeForm?: string }[]
): Promise<void> {
  // Inherit the session's active plan pointer (set by `cctrack plan focus <id>`)
  // so TodoWrite items roll up under the plan the operator is working on.
  const { data: sess } = await db
    .from("sessions")
    .select("active_plan_id")
    .eq("id", sessionId)
    .maybeSingle();
  const activePlanId = (sess?.active_plan_id as string | null) ?? null;
  // Project-scoped (falling back to session when there's no project) so the same
  // task text continues as one row across sessions instead of duplicating per session.
  const scopeId = projectId ?? sessionId;

  const items = todos
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => !!t?.content)
    .map(({ t, i }) => ({
      t,
      i,
      status:
        t.status === "completed" ? "completed"
        : t.status === "in_progress" ? "in_progress"
        : "pending",
      dedupeKey: dedupeKeyFor("tw", scopeId, t.content),
    }));
  if (items.length === 0) return;

  const { data: existingRows } = await db
    .from("tasks")
    .select("id, dedupe_key, status")
    .in("dedupe_key", items.map((it) => it.dedupeKey));
  const existingByKey = new Map<string, { id: string; status: string }>();
  for (const row of existingRows ?? []) {
    existingByKey.set(row.dedupe_key as string, { id: row.id as string, status: row.status as string });
  }

  const now = new Date().toISOString();
  await Promise.all(
    items.map(async ({ t, i, status, dedupeKey }) => {
      const existing = existingByKey.get(dedupeKey);
      if (existing) {
        if (existing.status !== status || t.activeForm) {
          await db
            .from("tasks")
            .update({
              status,
              ...(t.activeForm ? { description: t.activeForm } : {}),
              sort_order: i,
              updated_at: now,
              completed_at: status === "completed" ? now : null,
            })
            .eq("id", existing.id);
        }
      } else {
        await db.from("tasks").insert({
          plan_id: activePlanId,
          session_id: sessionId,
          project_id: projectId,
          content: t.content,
          description: t.activeForm ?? null,
          status,
          source: "todowrite",
          dedupe_key: dedupeKey,
          sort_order: i,
          completed_at: status === "completed" ? now : null,
        });
      }
    })
  );
}
