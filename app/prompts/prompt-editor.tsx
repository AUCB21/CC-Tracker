"use client";
import { useState, useTransition } from "react";
import { createProject, createPromptVersion } from "./actions";
import { ProjectPicker } from "./project-picker";
import { Chip, InlineError } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PromptKind, PromptRow } from "@/lib/types";

export function PromptEditor({
  seed,
  projectId,
  projectName,
  projects,
}: {
  seed: PromptRow | null;
  projectId: string | null;
  projectName: string | null;
  projects: { id: string; name: string; path: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(seed?.name ?? "");
  const [kind, setKind] = useState<PromptKind>((seed?.kind as PromptKind) ?? "template");
  const [body, setBody] = useState(seed?.body ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedProjectId, setSelectedProjectId] = useState<string | "" | "__create__">(
    seed ? (seed.project_id ?? "") : (projectId ?? "")
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [creatingProject, startCreateTransition] = useTransition();

  function reset() {
    setName(seed?.name ?? "");
    setKind((seed?.kind as PromptKind) ?? "template");
    setBody(seed?.body ?? "");
    setErr(null);
    setSelectedProjectId(seed ? (seed.project_id ?? "") : (projectId ?? ""));
    setNewProjectName("");
    setNewProjectPath("");
  }

  function createNewProject() {
    startCreateTransition(async () => {
      const r = await createProject({ name: newProjectName, path: newProjectPath });
      if ("error" in r) { setErr(r.error); return; }
      setSelectedProjectId(r.row.id);
      setNewProjectName("");
      setNewProjectPath("");
    });
  }

  function submit() {
    setErr(null);
    if (!seed && selectedProjectId === "__create__") {
      setErr("Finish creating the project first, or pick one from the list.");
      return;
    }
    const effectiveProjectId = seed
      ? projectId
      : selectedProjectId === "__create__" || selectedProjectId === ""
        ? null
        : selectedProjectId;
    startTransition(async () => {
      const r = await createPromptVersion({ name, body, kind, project_id: effectiveProjectId });
      if ("error" in r) { setErr(r.error); return; }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Chip variant="neutral" onClick={() => { reset(); setOpen(true); }}>
        {seed ? "New Version" : "New Prompt"}
      </Chip>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-panel2 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
        <span>
          {seed
            ? `Editing "${seed.name}" (v${seed.version} → v${seed.version + 1})`
            : `New prompt${projectName ? ` for ${projectName}` : ""}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!!seed}
          placeholder="name (e.g. attend.template)"
          aria-label="Prompt name"
          className="min-w-[16rem] flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <Select
          value={kind}
          onValueChange={(v) => setKind(v as PromptKind)}
          disabled={!!seed}
        >
          <SelectTrigger
            aria-label="Prompt kind"
            className="h-auto w-auto rounded-md border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none focus:ring-0 disabled:opacity-60"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[color:var(--color-line)] bg-popover text-popover-foreground">
            <SelectItem value="template">message</SelectItem>
            <SelectItem value="system">system prompt</SelectItem>
          </SelectContent>
        </Select>
        {!seed && (
          <ProjectPicker
            value={selectedProjectId}
            projects={projects}
            onChange={setSelectedProjectId}
          />
        )}
      </div>
      {!seed && selectedProjectId === "__create__" && (
        <div className="flex flex-wrap gap-2">
          <input
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="project name"
            aria-label="New project name"
            className="min-w-[16rem] flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <input
            value={newProjectPath}
            onChange={(e) => setNewProjectPath(e.target.value)}
            placeholder="project path"
            aria-label="New project path"
            className="min-w-[16rem] flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <Chip variant="neutral" onClick={createNewProject} disabled={creatingProject}>
            {creatingProject ? "Creating…" : "Create & use"}
          </Chip>
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Prompt body. Immutable once saved; each save creates a new version."
        className="min-h-[10rem] w-full resize-y rounded-md border border-line bg-panel p-2 font-mono text-[0.75rem] text-foreground focus:border-accent focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <Chip variant="primary" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save Version"}
        </Chip>
        <Chip variant="neutral" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Chip>
        <InlineError>{err}</InlineError>
      </div>
    </div>
  );
}
