import { ensureSession } from "./db";
import type { HandlerContext } from "./handlers";

export async function handleSessionEnd(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId);
  await db
    .from("sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  await addEvent("session_end", {
    data: withPid({ reason: payload.reason ?? null }),
  });
}
