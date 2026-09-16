import type { SupabaseClient } from "@supabase/supabase-js";
import { buildContext, HOOK_HANDLERS, handleUnknown } from "./ingest/handlers";

export { ensureSession, normalizePath } from "./ingest/db";

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

/** Main entry point for POST /api/ingest/hook */
export async function processHook(
  db: SupabaseClient,
  payload: HookPayload
): Promise<{ ok: true; event: string }> {
  const name = payload.hook_event_name ?? "unknown";
  const sessionId = payload.session_id;
  if (!sessionId) throw new Error("missing session_id");
  const ctx = await buildContext(db, payload);
  const handler = HOOK_HANDLERS[name] ?? handleUnknown;
  await handler(ctx);
  return { ok: true, event: name };
}
