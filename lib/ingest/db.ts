// posix.basename because normalizePath always outputs /-separated paths, so
// posix flavor works on both windows and linux hosts.
import { posix as pathPosix } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lives here (not lib/ingest.ts) so resolveProject can use it without creating
// a value-import cycle back through lib/ingest.ts -> ./handlers -> ./db.
// Re-exported from lib/ingest.ts so external consumers are unaffected.
export function normalizePath(p: string): string {
  let normalized = p.trim().replace(/\\/g, "/");
  const gitBashMatch = normalized.match(/^\/([a-zA-Z])\/(.*)/);
  if (gitBashMatch) {
    normalized = `${gitBashMatch[1].toUpperCase()}:/${gitBashMatch[2]}`;
  }
  if (/^[a-z]:/i.test(normalized)) {
    normalized = normalized[0].toUpperCase() + normalized.slice(1);
  }
  return normalized;
}

export async function resolveProject(
  db: SupabaseClient,
  rawCwd: string | undefined,
  repo?: string
): Promise<string | null> {
  if (!rawCwd) return null;
  const cwd = normalizePath(rawCwd);
  const { data: existing } = await db
    .from("projects")
    .select("id")
    .eq("path", cwd)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: created } = await db
    .from("projects")
    .insert({ name: pathPosix.basename(cwd), path: cwd, repo: repo ?? null })
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

export async function addEvent(
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
