"use client";
import { useState, useTransition } from "react";
import { updatePromptProject } from "./actions";
import { ProjectPicker } from "./project-picker";
import { Chip, InlineError } from "@/components/ui";

export function EditProjectInline({
  promptId,
  currentProjectId,
  projects,
}: {
  promptId: string;
  currentProjectId: string | null;
  projects: { id: string; name: string; path: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | "" | "__create__">(currentProjectId ?? "");
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setSelected(currentProjectId ?? "");
    setArmed(false);
    setErr(null);
  }

  function onSaveClick() {
    if (selected === "__create__") {
      setErr("Finish creating the project first, or pick one from the list.");
      return;
    }
    setErr(null);
    if (!armed) {
      setArmed(true);
      return;
    }
    const resolved = selected === "" ? null : selected;
    startTransition(async () => {
      const r = await updatePromptProject(promptId, resolved);
      if ("error" in r) { setErr(r.error); return; }
      setArmed(false);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <Chip variant="neutral" onClick={() => { reset(); setOpen(true); }}>
        Edit project
      </Chip>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProjectPicker value={selected} projects={projects} onChange={setSelected} disabled={pending} />
      <Chip
        variant={armed ? "primary" : "neutral"}
        onClick={onSaveClick}
        onBlur={() => setArmed(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setArmed(false);
        }}
        disabled={pending}
        aria-pressed={armed}
      >
        {pending ? "Saving..." : armed ? "Confirm Save" : "Save"}
      </Chip>
      <Chip
        variant="neutral"
        onClick={() => { reset(); setOpen(false); }}
        disabled={pending}
      >
        Cancel
      </Chip>
      <InlineError>{err}</InlineError>
    </div>
  );
}
