"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "./ui";
import { TaskEditModal } from "./task-edit-modal";
import { DeleteConfirmModal } from "./delete-confirm-modal";
import type { Task } from "@/lib/types";

const PENCIL = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 16h4l8-8-4-4-8 8v4z" />
    <path d="M12 4l4 4" />
  </svg>
);

const TRASH = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
  </svg>
);

const GLYPH_SPEC: Record<Task["status"], { glyph: string; tone: string }> = {
  completed: { glyph: "✓", tone: "text-[color:var(--color-green)]" },
  in_progress: { glyph: "▶", tone: "text-[color:var(--color-yellow)]" },
  pending: { glyph: "○", tone: "text-muted" },
};

/**
 * Interactive task row shared by /plans (compact line inside a plan card)
 * and /tasks (full row with project/plan/date meta + AttendButton slot).
 * Owns the edit + delete modal state so the parent listing page stays a
 * server component.
 */
export function TaskRowEditable({
  task,
  plans,
  variant = "compact",
  projectSlot,
  planLabel,
  dateSlot,
  descriptionSlot,
  right,
}: {
  task: Task;
  plans: { id: string; title: string }[];
  variant?: "compact" | "row";
  projectSlot?: React.ReactNode;
  planLabel?: string;
  dateSlot?: React.ReactNode;
  descriptionSlot?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete task");
    }
    router.refresh();
  }

  const chips = (
    <span className="inline-flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        aria-label="Edit task"
        title="Edit"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-accent"
      >
        {PENCIL}
      </button>
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete task"
        title="Delete"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-[color:var(--color-red)]"
      >
        {TRASH}
      </button>
      <TaskEditModal open={editOpen} onClose={() => setEditOpen(false)} task={task} plans={plans} onSaved={refresh} />
      <DeleteConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete task"
        objectLabel="task"
        objectName={task.content.slice(0, 60)}
        requireTypeName={false}
        onConfirm={handleDelete}
      />
    </span>
  );

  if (variant === "row") {
    return (
      <li className="flex flex-wrap items-start gap-3 px-4 py-4 sm:flex-nowrap sm:gap-4 sm:px-5">
        <Badge color={task.status === "completed" ? "green" : task.status === "in_progress" ? "yellow" : "muted"}>
          {task.status.replace("_", " ")}
        </Badge>
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <p
            className={
              task.status === "completed"
                ? "max-w-[75ch] break-words text-sm font-medium text-muted line-through decoration-line"
                : "max-w-[75ch] break-words text-sm font-medium text-foreground"
            }
          >
            {task.content}
          </p>
          {descriptionSlot}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
            {projectSlot}
            {planLabel && <span className="max-w-full truncate">{planLabel}</span>}
            {dateSlot}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {chips}
          {right}
        </div>
      </li>
    );
  }

  const spec = GLYPH_SPEC[task.status];
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`mt-0.5 inline-flex w-4 shrink-0 justify-center ${spec.tone}`}>{spec.glyph}</span>
      <span
        className={`min-w-0 flex-1 break-words ${
          task.status === "completed" ? "text-muted line-through decoration-[color:var(--color-line-strong)]" : "text-foreground"
        }`}
      >
        {task.content}
      </span>
      {chips}
    </li>
  );
}
