import { ensureSession } from "../ingest";
import type { HandlerContext } from "./handlers";

export async function handleSessionStart(ctx: HandlerContext): Promise<void> {
  const { db, payload, sessionId, projectId, addEvent, withPid } = ctx;
  await ensureSession(db, sessionId, projectId, {
    cwd: payload.cwd ?? null,
    source: payload.source ?? "startup",
    git_branch: payload.git_branch ?? null,
  });
  // Ad-hoc project-repo write, left exactly as-is (not resolveProject's job
  // today — a future refactor will unify project-repo writing).
  if (payload.repo) {
    await db.from("projects").update({ repo: payload.repo }).eq("id", projectId);
  }
  await addEvent("session_start", {
    data: withPid({ source: payload.source ?? "startup", cwd: payload.cwd ?? null }),
  });
}
