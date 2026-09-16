import { createHash } from "node:crypto";

/**
 * Stable identity for "the same logical task across time", used to upsert
 * TodoWrite items (kind "tw") and CLI-created tasks (kind "cli") instead of
 * duplicating a row per sync/call. Scoped by project (falling back to
 * session when there's no project) so the same task text continues as one
 * row across sessions.
 */
export function dedupeKeyFor(kind: "tw" | "cli", scopeId: string, content: string): string {
  return `${kind}:${scopeId}:${createHash("sha1").update(content).digest("hex")}`;
}
