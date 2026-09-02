"use server";
import { revalidatePath } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { PromptKind, PromptRow } from "@/lib/types";

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
