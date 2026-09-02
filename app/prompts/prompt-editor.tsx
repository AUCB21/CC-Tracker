"use client";
import { useState, useTransition } from "react";
import { createPromptVersion } from "./actions";
import type { PromptKind, PromptRow } from "@/lib/types";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-medium leading-none transition-colors disabled:opacity-40";
const CHIP_PRIMARY = `${CHIP} border-accent/40 bg-accent/10 text-foreground hover:border-accent`;
const CHIP_TINY = `${CHIP} border-line text-muted hover:border-accent hover:text-foreground`;

export function PromptEditor({
  seed,
  projectId,
  projectName,
}: {
  seed: PromptRow | null;
  projectId: string | null;
  projectName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(seed?.name ?? "");
  const [kind, setKind] = useState<PromptKind>((seed?.kind as PromptKind) ?? "template");
  const [body, setBody] = useState(seed?.body ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName(seed?.name ?? "");
    setKind((seed?.kind as PromptKind) ?? "template");
    setBody(seed?.body ?? "");
    setErr(null);
  }

  function submit() {
    setErr(null);
    startTransition(async () => {
      const r = await createPromptVersion({ name, body, kind, project_id: projectId });
      if ("error" in r) { setErr(r.error); return; }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className={CHIP_TINY}
        onClick={() => { reset(); setOpen(true); }}
      >
        {seed ? "New Version" : "New Prompt"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-panel2 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-muted">
        <span>
          {seed
            ? `Editing "${seed.name}" (v${seed.version} → v${seed.version + 1})`
            : `New prompt${projectName ? ` for ${projectName}` : " (global)"}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!!seed}
          placeholder="name (e.g. attend.template)"
          className="min-w-[16rem] flex-1 rounded-md border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as PromptKind)}
          disabled={!!seed}
          className="rounded-md border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        >
          <option value="template">template</option>
          <option value="system">system</option>
        </select>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Prompt body. Immutable once saved; each save creates a new version."
        className="min-h-[10rem] w-full resize-y rounded-md border border-line bg-panel p-2 font-mono text-[0.75rem] text-foreground focus:border-accent focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button className={CHIP_PRIMARY} onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save Version"}
        </button>
        <button className={CHIP_TINY} onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        {err && <span className="text-[0.6875rem] text-[color:var(--color-yellow)]">{err}</span>}
      </div>
    </div>
  );
}
