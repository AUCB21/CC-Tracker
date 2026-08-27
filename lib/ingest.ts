import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateCost } from "./cost";

export function sha1(s: string): string {
  return createHash("sha1").update(s).digest("hex");
}

function basename(p: string): string {
  const parts = p.replace(/\/+$/, "").split("/");
  return parts[parts.length - 1] || p;
}

export type HookPayload = {
  hook_event_name?: string;
  session_id?: string;
  prompt_id?: string;
  cwd?: string;
  transcript_path?: string;
  git_branch?: string;
  repo?: string;
  // SessionStart
  source?: "startup" | "resume" | "clear" | "compact" | "fork";
  // UserPromptSubmit
  prompt?: string;
  // Pre/PostToolUse (+ PermissionRequest/Denied)
  tool_name?: string;
  tool_input?: unknown;
  tool_response?: unknown;
  tool_use_id?: string;
  // Stop / SubagentStop
  last_assistant_message?: string;
  // Subagent*
  agent_type?: string;
  agent_id?: string;
  // StopFailure
  error_type?: string;
  error_message?: string;
  // Notification
  notification_type?: string;
  message?: string;
  // SessionEnd
  reason?: "clear" | "resume" | "logout" | "prompt_input_exit" | "other";
  /** computed by the hook script from the transcript on Stop */
  summary?: {
    model?: string;
    prompt_count?: number;
    tool_use_count?: number;
    tools?: Record<string, number>;
    input_tokens?: number;
    output_tokens?: number;
    cache_read_tokens?: number;
    cache_creation_tokens?: number;
  };
};

async function resolveProject(
  db: SupabaseClient,
  cwd: string | undefined,
  repo?: string
): Promise<string | null> {
  if (!cwd) return null;
  const { data: existing } = await db
    .from("projects")
    .select("id")
    .eq("path", cwd)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: created } = await db
    .from("projects")
    .insert({ name: basename(cwd), path: cwd, repo: repo ?? null })
    .select("id")
    .single();
  return (created?.id as string) ?? null;
}

export async function ensureSession(
  db: SupabaseClient,
  sessionId: string,
  projectId: string | null,
  patch: Record<string, unknown> = {}
): Promise<void> {
  const { data: existing } = await db
    .from("sessions")
    .select("id,status")
    .eq("id", sessionId)
    .maybeSingle();
  if (existing) {
    const upd: Record<string, unknown> = {
      last_activity_at: new Date().toISOString(),
      ...patch,
    };
    if (existing.status === "ended") upd.status = "active";
    await db.from("sessions").update(upd).eq("id", sessionId);
  } else {
    await db.from("sessions").insert({
      id: sessionId,
      project_id: projectId,
      status: "active",
      started_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      ...patch,
    });
  }
}

async function addEvent(
  db: SupabaseClient,
  sessionId: string,
  type: string,
  extra: { tool_name?: string; data?: unknown } = {}
): Promise<void> {
  await db.from("events").insert({
    session_id: sessionId,
    type,
    tool_name: extra.tool_name ?? null,
    data: extra.data ?? null,
  });
}

/** Sync a Claude Code TodoWrite list into tasks (upsert by content hash). */
async function syncTodoWrite(
  db: SupabaseClient,
  sessionId: string,
  projectId: string | null,
  todos: { content: string; status: string; activeForm?: string }[]
): Promise<void> {
  for (let i = 0; i < todos.length; i++) {
    const t = todos[i];
    if (!t?.content) continue;
    const status =
      t.status === "completed" ? "completed"
      : t.status === "in_progress" ? "in_progress"
      : "pending";
    // Project-scoped (falling back to session when there's no project) so the same
    // task text continues as one row across sessions instead of duplicating per session.
    const dedupeKey = `tw:${projectId ?? sessionId}:${sha1(t.content)}`;
    const { data: existing } = await db
      .from("tasks")
      .select("id,status")
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    const now = new Date().toISOString();
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
        plan_id: null,
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
  }
}

/** Main entry point for POST /api/ingest/hook */
export async function processHook(
  db: SupabaseClient,
  payload: HookPayload
): Promise<{ ok: true; event: string }> {
  const name = payload.hook_event_name ?? "unknown";
  const sessionId = payload.session_id;
  if (!sessionId) throw new Error("missing session_id");

  const projectId = await resolveProject(db, payload.cwd, payload.repo);
  const pid = payload.prompt_id;
  const withPid = <T extends Record<string, unknown>>(o: T): T | (T & { prompt_id: string }) =>
    pid ? { ...o, prompt_id: pid } : o;
  const truncStr = (v: unknown, n = 2000): string | null => {
    try { return JSON.stringify(v ?? null).slice(0, n); } catch { return null; }
  };

  switch (name) {
    case "SessionStart": {
      await ensureSession(db, sessionId, projectId, {
        cwd: payload.cwd ?? null,
        source: payload.source ?? "startup",
        git_branch: payload.git_branch ?? null,
      });
      if (payload.repo) {
        await db.from("projects").update({ repo: payload.repo }).eq("id", projectId);
      }
      await addEvent(db, sessionId, "session_start", {
        data: withPid({ source: payload.source ?? "startup", cwd: payload.cwd ?? null }),
      });
      break;
    }

    case "UserPromptSubmit": {
      const prompt = (payload.prompt ?? "").slice(0, 4000);
      await ensureSession(db, sessionId, projectId, { cwd: payload.cwd ?? null });
      const { data: sess } = await db
        .from("sessions")
        .select("prompt_count,title")
        .eq("id", sessionId)
        .single();
      const patch: Record<string, unknown> = {
        prompt_count: (sess?.prompt_count ?? 0) + 1,
      };
      if (!sess?.title && prompt) patch.title = prompt.slice(0, 120);
      await db.from("sessions").update(patch).eq("id", sessionId);
      await addEvent(db, sessionId, "prompt", { data: withPid({ prompt }) });
      break;
    }

    case "PostToolUse": {
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

      if (toolName === "TodoWrite") {
        const todos = (payload.tool_input as { todos?: unknown[] })?.todos;
        if (Array.isArray(todos)) {
          await syncTodoWrite(
            db,
            sessionId,
            projectId,
            todos as { content: string; status: string; activeForm?: string }[]
          );
          await addEvent(db, sessionId, "tasks_synced", {
            tool_name: toolName,
            data: withPid({ count: todos.length }),
          });
        }
      } else {
        await addEvent(db, sessionId, "tool_use", {
          tool_name: toolName,
          data: withPid({
            input: truncStr(payload.tool_input),
            response: truncStr(payload.tool_response),
            tool_use_id: payload.tool_use_id ?? null,
          }),
        });
      }
      break;
    }

    case "Stop": {
      const s = payload.summary ?? {};
      const cost = estimateCost(s.model ?? null, {
        input: s.input_tokens ?? 0,
        output: s.output_tokens ?? 0,
        cacheRead: s.cache_read_tokens ?? 0,
        cacheCreation: s.cache_creation_tokens ?? 0,
      });
      const lastMsg = typeof payload.last_assistant_message === "string"
        ? payload.last_assistant_message.slice(0, 4000)
        : null;
      await ensureSession(db, sessionId, projectId, {
        ended_at: new Date().toISOString(),
        model: s.model ?? undefined,
        prompt_count: Math.max(s.prompt_count ?? 0, 0) || undefined,
        tool_use_count: s.tool_use_count ?? undefined,
        tool_breakdown: s.tools ?? undefined,
        input_tokens: s.input_tokens ?? undefined,
        output_tokens: s.output_tokens ?? undefined,
        cache_read_tokens: s.cache_read_tokens ?? undefined,
        cache_creation_tokens: s.cache_creation_tokens ?? undefined,
        estimated_cost_usd: cost,
        ...(lastMsg !== null ? { last_message: lastMsg } : {}),
      });
      await addEvent(db, sessionId, "session_end", {
        data: withPid({
          model: s.model ?? null,
          tokens: {
            input: s.input_tokens ?? 0,
            output: s.output_tokens ?? 0,
            cache_read: s.cache_read_tokens ?? 0,
            cache_creation: s.cache_creation_tokens ?? 0,
          },
          cost_usd: cost,
          last_message: lastMsg,
        }),
      });
      break;
    }

    case "SessionEnd": {
      await ensureSession(db, sessionId, projectId);
      await db
        .from("sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
      await addEvent(db, sessionId, "session_end", {
        data: withPid({ reason: payload.reason ?? null }),
      });
      break;
    }

    case "SubagentStart": {
      await ensureSession(db, sessionId, projectId);
      await addEvent(db, sessionId, "subagent_start", {
        data: withPid({
          agent_type: payload.agent_type ?? null,
          agent_id: payload.agent_id ?? null,
        }),
      });
      break;
    }

    case "SubagentStop": {
      await ensureSession(db, sessionId, projectId);
      const lastMsg = typeof payload.last_assistant_message === "string"
        ? payload.last_assistant_message.slice(0, 4000)
        : null;
      await addEvent(db, sessionId, "subagent_stop", {
        data: withPid({
          agent_type: payload.agent_type ?? null,
          agent_id: payload.agent_id ?? null,
          last_message: lastMsg,
        }),
      });
      break;
    }

    case "StopFailure": {
      await ensureSession(db, sessionId, projectId, {
        last_error: {
          type: payload.error_type ?? null,
          message: payload.error_message ?? null,
          at: new Date().toISOString(),
        },
      });
      await addEvent(db, sessionId, "stop_failure", {
        data: withPid({
          error_type: payload.error_type ?? null,
          error_message: payload.error_message ?? null,
        }),
      });
      break;
    }

    case "Notification": {
      await ensureSession(db, sessionId, projectId);
      await addEvent(db, sessionId, "notification", {
        data: withPid({
          notification_type: payload.notification_type ?? null,
          message: payload.message ?? null,
        }),
      });
      break;
    }

    default: {
      await ensureSession(db, sessionId, projectId);
      await addEvent(db, sessionId, name.toLowerCase(), {
        data: withPid({ cwd: payload.cwd ?? null }),
      });
    }
  }

  return { ok: true, event: name };
}
