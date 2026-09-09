"use client";
import { useState, useTransition } from "react";
import { decideApproval } from "./actions";
import { Chip, InlineError } from "@/components/ui";

export function DecideButtons({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  // Two-step approve: first click arms, second click fires. Escape/blur reverts.
  const [armed, setArmed] = useState(false);

  function fireApprove() {
    setErr(null);
    setArmed(false);
    startTransition(async () => {
      const r = await decideApproval(id, "approved");
      if ("error" in r) setErr(r.error);
    });
  }

  function onApproveClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    fireApprove();
  }

  function onDeny() {
    setErr(null);
    setArmed(false);
    startTransition(async () => {
      const r = await decideApproval(id, "denied");
      if ("error" in r) setErr(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Chip
        variant="allow"
        armed={armed}
        onClick={onApproveClick}
        onBlur={() => setArmed(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setArmed(false);
        }}
        disabled={pending}
        aria-pressed={armed}
        title={armed ? "Click again to authorize this tool call" : "Review tool input above, then click to arm"}
      >
        {armed ? "Confirm Approve" : "Approve"}
      </Chip>
      <Chip variant="deny" onClick={onDeny} disabled={pending}>
        Deny
      </Chip>
      <InlineError>{err}</InlineError>
    </div>
  );
}
