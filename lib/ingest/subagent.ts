import { ensureSession } from "./db";
import type { HandlerContext } from "./handlers";

export async function handleSubagentStart(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId);
  await addEvent("subagent_start", {
    data: withPid({
      agent_type: payload.agent_type ?? null,
      agent_id: payload.agent_id ?? null,
    }),
  });
}

export async function handleSubagentStop(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId);
  const lastMsg =
    typeof payload.last_assistant_message === "string"
      ? payload.last_assistant_message.slice(0, 4000)
      : null;
  await addEvent("subagent_stop", {
    data: withPid({
      agent_type: payload.agent_type ?? null,
      agent_id: payload.agent_id ?? null,
      last_message: lastMsg,
    }),
  });
}
