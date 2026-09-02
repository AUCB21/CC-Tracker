"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DeleteConfirmModal } from "@/components/delete-confirm-modal";

const TRASH = (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
  </svg>
);

export function DeletePlanButton({ planId, planTitle }: { planId: string; planTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    const res = await fetch(`/api/plans/${planId}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to delete plan");
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Delete plan"
        title="Delete"
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-[color:var(--color-red)]"
      >
        {TRASH}
      </button>
      <DeleteConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete plan"
        objectLabel="plan"
        objectName={planTitle}
        requireTypeName={false}
        onConfirm={handleDelete}
      />
    </>
  );
}
