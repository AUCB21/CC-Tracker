"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import type { Task } from "@/lib/types";

const STATUS_OPTIONS: { value: Task["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

/**
 * Quick-edit modal for a task row: content, status, and plan assignment.
 * PATCHes only the fields that actually changed.
 */
export function TaskEditModal({
  open,
  onClose,
  task,
  plans,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  task: Task;
  plans: { id: string; title: string }[];
  onSaved?: () => void;
}) {
  const [content, setContent] = useState(task.content);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [planId, setPlanId] = useState<string>(task.plan_id ?? "");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reset the form to the current task whenever the modal is (re)opened.
  useEffect(() => {
    if (!open) return;
    setContent(task.content);
    setStatus(task.status);
    setPlanId(task.plan_id ?? "");
    setErr(null);
  }, [open, task]);

  function close() {
    if (pending) return;
    onClose();
  }

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed) {
      setErr("Content is required.");
      return;
    }
    const patch: Record<string, unknown> = {};
    if (trimmed !== task.content) patch.content = trimmed;
    if (status !== task.status) patch.status = status;
    const normalizedPlanId = planId === "" ? null : planId;
    if (normalizedPlanId !== (task.plan_id ?? null)) patch.plan_id = normalizedPlanId;

    if (Object.keys(patch).length === 0) {
      close();
      return;
    }

    setErr(null);
    setPending(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save task");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Edit task"
      size="md"
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
            required
            className="mt-1.5 w-full resize-y rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
            placeholder="Task content"
          />
        </div>

        <div>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">Status</span>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-[0.75rem] transition-colors ${
                  status === opt.value
                    ? "border-accent/40 bg-accent/10 text-foreground"
                    : "border-line text-muted hover:border-accent hover:text-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="task-status"
                  value={opt.value}
                  checked={status === opt.value}
                  onChange={() => setStatus(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="task-plan" className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
            Plan
          </label>
          <select
            id="task-plan"
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">— none —</option>
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
  );
}
