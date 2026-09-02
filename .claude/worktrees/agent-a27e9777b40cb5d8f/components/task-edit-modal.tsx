"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import type { Task } from "@/lib/types";

const PENCIL = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 16h4l8-8-4-4-8 8v4z" />
    <path d="M12 4l4 4" />
  </svg>
);

const STATUS_OPTIONS: Task["status"][] = ["pending", "in_progress", "completed"];

const selectClass =
  "mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none";

/**
 * Edit chip + quick-edit dialog for a single task row. Owns its own open
 * state (same shape as RenamePlanButton), PATCHes /api/tasks/[id], and
 * refreshes the page on success.
 */
export function TaskEditModal({
  task,
  plans,
  className,
}: {
  task: Task;
  plans: { id: string; title: string }[];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(task.content);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [planId, setPlanId] = useState(task.plan_id ?? "");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function openModal() {
    setContent(task.content);
    setStatus(task.status);
    setPlanId(task.plan_id ?? "");
    setErr(null);
    setOpen(true);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    setErr(null);
  }

  async function submit() {
    setErr(null);
    const patch: Record<string, unknown> = {};
    if (content.trim() !== task.content) patch.content = content.trim();
    if (status !== task.status) patch.status = status;
    const nextPlanId = planId || null;
    if (nextPlanId !== (task.plan_id ?? null)) patch.plan_id = nextPlanId;

    if (Object.keys(patch).length === 0) {
      setOpen(false);
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to update task");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-label="Edit task"
        title="Edit"
        className={
          className ??
          "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-accent"
        }
      >
        {PENCIL}
      </button>
      <Modal
        open={open}
        onClose={close}
        title="Edit task"
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
              disabled={pending || !content.trim()}
              className="rounded-md bg-accent px-4 py-2 text-[0.75rem] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="task-content" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Content
            </label>
            <textarea
              id="task-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="mt-1.5 w-full resize-y rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="task-status" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Status
            </label>
            <select
              id="task-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Task["status"])}
              className={selectClass}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="task-plan" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              Plan
            </label>
            <select
              id="task-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              className={selectClass}
            >
              <option value="">No plan (detach)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
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
