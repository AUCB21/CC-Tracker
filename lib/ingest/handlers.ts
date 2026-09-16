// Dispatch table + shared context/helpers for the hook event handlers under
// lib/ingest/*.ts. processHook (lib/ingest.ts) builds a HandlerContext once
// per request and looks up the handler by hook_event_name here.
import type { SupabaseClient } from "@supabase/supabase-js";
import { addEvent, ensureSession, resolveProject } from "./db";
import type { HookPayload } from "../ingest";
import { handleNotification, handleStopFailure } from "./misc";
import { handlePostToolUse } from "./post-tool-use";
import { handleSessionEnd } from "./session-end";
import { handleSessionStart } from "./session-start";
import { handleSubagentStart, handleSubagentStop } from "./subagent";
import { handleStop } from "./stop";
import { handleUserPromptSubmit } from "./user-prompt";

export type HandlerContext = {
  db: SupabaseClient;
  payload: HookPayload;
  sessionId: string;
  projectId: string | null;
  addEvent: (type: string, extra?: { tool_name?: string; data?: unknown }) => Promise<void>;
  withPid: <T extends Record<string, unknown>>(o: T) => T | (T & { prompt_id: string });
};

export type HookHandler = (ctx: HandlerContext) => Promise<void>;

/** Merge in `prompt_id` when the payload carries one; otherwise pass through unchanged. */
export function withPid<T extends Record<string, unknown>>(
  pid: string | undefined,
  o: T
): T | (T & { prompt_id: string }) {
  return pid ? { ...o, prompt_id: pid } : o;
}

export function truncStr(v: unknown, n = 2000): string | null {
  try {
    return JSON.stringify(v ?? null).slice(0, n);
  } catch {
    return null;
  }
}

export function truncField(v: unknown, n: number): string | null {
  return typeof v === "string" ? v.slice(0, n) : null;
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

export async function buildContext(db: SupabaseClient, payload: HookPayload): Promise<HandlerContext> {
  const sessionId = payload.session_id;
  if (!sessionId) throw new Error("missing session_id");
  const projectId = await resolveProject(db, payload.cwd, payload.repo);
  const pid = payload.prompt_id;
  return {
    db,
    payload,
    sessionId,
    projectId,
    addEvent: (type, extra) => addEvent(db, sessionId, type, extra),
    withPid: (o) => withPid(pid, o),
  };
}

/** Catch-all for hook events with no dedicated handler: fail open, not closed. */
export async function handleUnknown(ctx: HandlerContext): Promise<void> {
  await ensureSession(ctx.db, ctx.sessionId, ctx.projectId);
  await ctx.addEvent((ctx.payload.hook_event_name ?? "unknown").toLowerCase(), {
    data: ctx.withPid({ cwd: ctx.payload.cwd ?? null }),
  });
}

export const HOOK_HANDLERS: Record<string, HookHandler> = {
  SessionStart: handleSessionStart,
  UserPromptSubmit: handleUserPromptSubmit,
  PostToolUse: handlePostToolUse,
  Stop: handleStop,
  SessionEnd: handleSessionEnd,
  SubagentStart: handleSubagentStart,
  SubagentStop: handleSubagentStop,
  StopFailure: handleStopFailure,
  Notification: handleNotification,
};
