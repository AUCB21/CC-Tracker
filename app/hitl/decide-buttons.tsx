"use client";
import { useState, useTransition } from "react";
import { decideApproval } from "./actions";
import { Chip, InlineError } from "@/components/ui";
import { Modal } from "@/components/modal";

export function DecideButtons({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function onConfirmApprove() {
    setErr(null);
    startTransition(async () => {
      const r = await decideApproval(id, "approved");
      if ("error" in r) setErr(r.error);
      setConfirmOpen(false);
    });
  }

  function onDeny() {
    setErr(null);
    startTransition(async () => {
      const r = await decideApproval(id, "denied");
      if ("error" in r) setErr(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Chip variant="allow" onClick={() => setConfirmOpen(true)} disabled={pending}>
        Approve
      </Chip>
      <Chip variant="deny" onClick={onDeny} disabled={pending}>
        Deny
      </Chip>
      <InlineError>{err}</InlineError>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Approve this tool call?"
        size="sm"
        footer={
          <>
            <Chip variant="deny" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancel
            </Chip>
            <Chip variant="allow" onClick={onConfirmApprove} disabled={pending}>
              Confirm Approve
            </Chip>
          </>
        }
      >
        <p className="text-sm text-muted-2">
          This authorizes the pending tool call to run. Review the command in the card before confirming.
        </p>
      </Modal>
    </div>
  );
}
