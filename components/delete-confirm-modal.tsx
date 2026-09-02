"use client";

import { useState } from "react";
import { Modal } from "./modal";

/**
 * Shared destructive-action confirmation, built on the Modal primitive.
 * Default is a two-button confirm/cancel; `requireTypeName` raises the bar
 * to "type the exact name" before the destructive button enables, for
 * actions that cascade (sessions, projects).
 */
export function DeleteConfirmModal({
  open,
  onClose,
  title,
  objectLabel,
  objectName,
  requireTypeName = false,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  objectLabel: string;
  objectName: string;
  requireTypeName?: boolean;
  onConfirm: () => Promise<void> | void;
  /** Extra notice rendered under the primary confirm text, e.g. cascade scope. */
  children?: React.ReactNode;
}) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function close() {
    if (pending) return;
    setTyped("");
    setErr(null);
    onClose();
  }

  async function confirm() {
    setErr(null);
    setPending(true);
    try {
      await onConfirm();
      setTyped("");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const canConfirm = !requireTypeName || typed.trim() === objectName;

  return (
    <Modal
      open={open}
      onClose={close}
      title={title}
      size="sm"
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
            onClick={confirm}
            disabled={pending || !canConfirm}
            className="rounded-md bg-[color:var(--color-red)] px-4 py-2 text-[0.75rem] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">
          This will permanently delete the {objectLabel}{" "}
          <span className="font-semibold text-foreground">{objectName}</span>. This can&apos;t be undone.
        </p>
        {children}
        {requireTypeName && (
          <div>
            <label
              htmlFor="delete-confirm-name"
              className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted"
            >
              Type <span className="font-mono normal-case text-foreground">{objectName}</span> to confirm
            </label>
            <input
              id="delete-confirm-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="mt-1.5 w-full rounded-md border border-line bg-panel2 px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
              placeholder={objectName}
            />
          </div>
        )}
        {err && (
          <p
            role="alert"
            className="rounded-md border border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 px-3 py-2 text-[0.75rem] text-[color:var(--color-yellow)]"
          >
            {err}
          </p>
        )}
      </div>
    </Modal>
  );
}
