"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";

const PENCIL = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 16h4l8-8-4-4-8 8v4z" />
    <path d="M12 4l4 4" />
  </svg>
);

export function RenameProjectButton({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setErr(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to rename project");
        }
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rename project"
        title="Rename"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-accent"
      >
        {PENCIL}
      </button>
      <Modal
        open={open}
        onClose={close}
        title="Rename project"
        footer={
          <>
            <button
              type="button"
              onClick={close}
              disabled={pending}
              className="rounded-md px-3 py-2 text-[0.75rem] text-muted transition-colors hover:bg-panel2 hover:text-foreground disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="rename-project-form"
              disabled={pending || !name.trim()}
              className="rounded-md bg-accent px-4 py-2 text-[0.75rem] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id="rename-project-form" onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="project-name" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              className="mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder="Project name"
            />
          </div>
          {err && (
            <p role="alert" className="rounded-md border border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 px-3 py-2 text-[0.75rem] text-[color:var(--color-yellow)]">
              {err}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
