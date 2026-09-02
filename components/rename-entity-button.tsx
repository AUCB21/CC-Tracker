"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/modal";
import { ActionIcons, ErrorAlert, IconButton } from "@/components/ui";

/**
 * Generic rename affordance: pencil chip + Modal with a single-line form
 * field (title/name), backed by a REST PATCH. Optionally renders a second
 * multiline "description" field (used by plans) when `descriptionField` is
 * supplied.
 */
export function RenameEntityButton({
  apiPath,
  field,
  currentValue,
  entityLabel,
  placeholder,
  descriptionField,
  onRenamed,
}: {
  apiPath: string;
  field: "title" | "name";
  currentValue: string;
  /** Lowercase noun used in headings/aria-labels and element ids, e.g. "plan". */
  entityLabel: string;
  placeholder?: string;
  descriptionField?: {
    initialValue: string | null;
    placeholder?: string;
  };
  onRenamed?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentValue);
  const [description, setDescription] = useState(descriptionField?.initialValue ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fieldLabel = field === "title" ? "Title" : "Name";
  const inputId = `${entityLabel}-${field}`;
  const formId = `rename-${entityLabel}-form`;

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
        const body: Record<string, string | undefined> = {
          [field]: value.trim() !== currentValue ? value : undefined,
        };
        if (descriptionField) {
          body.description =
            description !== (descriptionField.initialValue ?? "") ? description : undefined;
        }
        const res = await fetch(apiPath, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const resBody = await res.json().catch(() => ({}));
          throw new Error(resBody.error ?? `Failed to rename ${entityLabel}`);
        }
        setOpen(false);
        router.refresh();
        onRenamed?.();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        ariaLabel={`Rename ${entityLabel}`}
        title="Rename"
      >
        {ActionIcons.pencil}
      </IconButton>
      <Modal
        open={open}
        onClose={close}
        title={`Rename ${entityLabel}`}
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
              form={formId}
              disabled={pending || !value.trim()}
              className="rounded-md bg-accent px-4 py-2 text-[0.75rem] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <form id={formId} onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor={inputId} className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
              {fieldLabel}
            </label>
            <input
              id={inputId}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={200}
              className="mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder={placeholder}
            />
          </div>
          {descriptionField && (
            <div>
              <label htmlFor={`${entityLabel}-desc`} className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
                Description
              </label>
              <textarea
                id={`${entityLabel}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1.5 w-full resize-y rounded-md border border-line bg-panel2 px-3 py-2 text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
                placeholder={descriptionField.placeholder}
              />
            </div>
          )}
          {err && <ErrorAlert>{err}</ErrorAlert>}
        </form>
      </Modal>
    </>
  );
}
