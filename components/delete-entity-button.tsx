"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";
import { ActionIcons, IconButton } from "@/components/ui";

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
      <IconButton
        onClick={() => setOpen(true)}
        ariaLabel={`Delete ${entityLabel}`}
        title="Delete"
        intent="danger"
      >
        {ActionIcons.trash}
      </IconButton>
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
