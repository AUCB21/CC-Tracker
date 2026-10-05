import { ensureSession } from "./db";
import type { HandlerContext } from "./handlers";

export async function handleStopFailure(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId, {
    last_error: {
      type: payload.error_type ?? null,
      message: payload.error_message ?? null,
      at: new Date().toISOString(),
    },
  });
  await addEvent("stop_failure", {
    data: withPid({
      error_type: payload.error_type ?? null,
      error_message: payload.error_message ?? null,
    }),
  });
}

export async function handleNotification(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId);
  await addEvent("notification", {
    data: withPid({
      notification_type: payload.notification_type ?? null,
      message: payload.message ?? null,
    }),
  });
}

/**
 * Mod-only event (mods/cc-track): the engine's own usage figures after a turn
 * moved cost or a rate-limit window. Settings hooks have no equivalent.
 */
export async function handleSessionUsage(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId);
  await addEvent("session_usage", {
    data: withPid({
      cost_usd: payload.usage?.cost_usd ?? null,
      rate_limits: payload.usage?.rate_limits ?? [],
      context: payload.usage?.context ?? null,
    }),
  });
}
