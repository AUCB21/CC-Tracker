import { ensureSession } from "../ingest";
import type { HandlerContext } from "./handlers";

export async function handleUserPromptSubmit(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
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
  if (!sess?.title && prompt) {
    const clean = prompt.replace(/\s+/g, " ").trim();
    if (clean) patch.title = clean.slice(0, 60).trimEnd();
  }
  await db.from("sessions").update(patch).eq("id", sessionId);
  await addEvent("prompt", { data: withPid({ prompt }) });
}
