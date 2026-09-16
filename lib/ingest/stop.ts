import { estimateCost } from "../cost";
import { ensureSession } from "../ingest";
import type { HandlerContext } from "./handlers";

export async function handleStop(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  const s = payload.summary ?? {};
  const cost = estimateCost(s.model ?? null, {
    input: s.input_tokens ?? 0,
    output: s.output_tokens ?? 0,
    cacheRead: s.cache_read_tokens ?? 0,
    cacheCreation: s.cache_creation_tokens ?? 0,
  });
  const lastMsg =
    typeof payload.last_assistant_message === "string"
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
  await addEvent("session_end", {
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
}
