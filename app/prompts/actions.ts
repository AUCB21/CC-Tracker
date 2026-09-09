"use server";
import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { Project, PromptKind, PromptRow } from "@/lib/types";

export async function createPromptVersion(input: {
  name: string;
  body: string;
  kind: PromptKind;
  project_id: string | null;
}): Promise<{ ok: true; row: PromptRow } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const name = input.name.trim();
  const body = input.body;
  if (!name) return { error: "name is required" };
  if (!body) return { error: "body is required" };

  // Find the latest version for this (project_id, kind, name) triple so a new
  // save appends a version rather than overwriting.
  let latestQuery = db
    .from("prompts")
    .select("version")
    .eq("kind", input.kind)
    .eq("name", name)
    .order("version", { ascending: false })
    .limit(1);
  latestQuery = input.project_id
    ? latestQuery.eq("project_id", input.project_id)
    : latestQuery.is("project_id", null);
  const { data: latest } = await latestQuery.maybeSingle();
  const nextVersion = (latest?.version ?? 0) + 1;

  const { data, error } = await db
    .from("prompts")
    .insert({
      project_id: input.project_id,
      kind: input.kind,
      name,
      body,
      version: nextVersion,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/prompts");
  return { ok: true, row: data as PromptRow };
}

// ponytail: manual project rows depart from the auto-created-from-sessions model; low risk, revisit if it creates orphaned projects at scale
export async function createProject(input: {
  name: string;
  path: string;
  repo?: string | null;
}): Promise<{ ok: true; row: Project } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const name = input.name.trim();
  const path = input.path.trim();
  if (!name) return { error: "name is required" };
  if (!path) return { error: "path is required" };

  const { data, error } = await db
    .from("projects")
    .insert({ name, path, repo: input.repo ?? null })
    .select("*")
    .single();
  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { error: "a project with that path already exists" };
    }
    return { error: error.message };
  }
  revalidatePath("/prompts");
  revalidatePath("/projects");
  return { ok: true, row: data as Project };
}

export async function updatePromptProject(
  promptId: string,
  projectId: string | null
): Promise<{ ok: true } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };
  const { error } = await db
    .from("prompts")
    .update({ project_id: projectId })
    .eq("id", promptId);
  if (error) return { error: error.message };
  revalidatePath("/prompts");
  return { ok: true };
}

export async function sendPromptToNewSession(
  promptId: string
): Promise<{ ok: true; cwd: string; copied: boolean } | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "Supabase not configured" };

  const { data: row, error } = await db
    .from("prompts")
    .select("id, body, project_id")
    .eq("id", promptId)
    .maybeSingle();
  if (error || !row) return { error: "prompt not found" };
  if (!row.body) return { error: "prompt body is empty" };

  let cwd = homedir();
  if (row.project_id) {
    const { data: project } = await db
      .from("projects")
      .select("path")
      .eq("id", row.project_id)
      .maybeSingle();
    if (project?.path) cwd = project.path;
  }

  const copied = await new Promise<boolean>((resolve) => {
    try {
      const clip = spawn("clip", [], { stdio: ["pipe", "ignore", "ignore"] });
      clip.once("error", () => resolve(false));
      clip.once("close", (code) => resolve(code === 0));
      clip.stdin.write(row.body, "utf8");
      clip.stdin.end();
    } catch {
      resolve(false);
    }
  });

  // ponytail: windows-only, add osascript/xdg branches on demand
  try {
    const child = spawn("cmd", ["/c", "start", "", "cmd", "/k", "claude"], {
      cwd,
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch (e) {
    return { error: `spawn failed: ${(e as Error).message}` };
  }

  return { ok: true, cwd, copied };
}
