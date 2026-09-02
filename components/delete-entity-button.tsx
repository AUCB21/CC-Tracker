"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";

const TRASH = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
  </svg>
);

/**
 * Generic delete affordance: trash chip + DeleteConfirmModal, backed by a
 * REST DELETE. `extraNotice` is passed through as DeleteConfirmModal's
 * children (e.g. the session's cascade-delete counts disclosure).
 */
export function DeleteEntityButton({
  apiPath,
  entityLabel,
  entityName,
  requireTypeName = false,
  redirectTo,
  extraNotice,
  onDeleted,
}: {
  apiPath: string;
  entityLabel: string;
  entityName: string;
  requireTypeName?: boolean;
  redirectTo?: string;
  extraNotice?: React.ReactNode;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const res = await fetch(apiPath, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Failed to delete ${entityLabel}`);
    }
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    onDeleted?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${entityLabel}`}
        title="Delete"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-[color:var(--color-red)]"
      >
        {TRASH}
      </button>
      <DeleteConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title={`Delete ${entityLabel}`}
        objectLabel={entityLabel}
        objectName={entityName}
        requireTypeName={requireTypeName}
        onConfirm={handleDelete}
      >
        {extraNotice}
      </DeleteConfirmModal>
    </>
  );
}
