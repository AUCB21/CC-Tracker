"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { renamePlan } from "./actions";

const PENCIL = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 16h4l8-8-4-4-8 8v4z" />
    <path d="M12 4l4 4" />
  </svg>
);

export function RenamePlanButton({
  planId,
  initialTitle,
  initialDescription,
}: {
  planId: string;
  initialTitle: string;
  initialDescription: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    if (pending) return;
    setOpen(false);
    setErr(null);
  }

  function submit() {
    setErr(null);
    startTransition(async () => {
      const result = await renamePlan(planId, {
        title: title.trim() !== initialTitle ? title : undefined,
        description: description !== (initialDescription ?? "") ? description : undefined,
      });
      if ("error" in result) {
        setErr(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Rename plan"
        title="Rename"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-accent"
      >
        {PENCIL}
      </button>
      <Modal
        open={open}
        onClose={close}
        title="Rename plan"
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
              type="button"
              onClick={submit}
              disabled={pending || !title.trim()}
              className="rounded-md bg-accent px-4 py-2 text-[0.75rem] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="plan-title" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Title
            </label>
            <input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder="Refactor auth"
            />
          </div>
          <div>
            <label htmlFor="plan-desc" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Description
            </label>
            <textarea
              id="plan-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1.5 w-full resize-y rounded-md border border-line bg-panel2 px-3 py-2 text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder="Optional context..."
            />
          </div>
          {err && (
            <p role="alert" className="rounded-md border border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 px-3 py-2 text-[0.75rem] text-[color:var(--color-yellow)]">
              {err}
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
