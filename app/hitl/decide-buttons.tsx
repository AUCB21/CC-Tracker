"use client";
import { useState, useTransition } from "react";
import { decideApproval } from "./actions";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-medium leading-none transition-colors disabled:opacity-40";
const CHIP_ALLOW = `${CHIP} border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)] hover:border-[color:var(--color-green)]`;
// Armed state: solid green so the confirm click is visually distinct from the
// idle approve chip. The user has already seen the tool_input inline above.
const CHIP_ALLOW_ARMED = `${CHIP} border-[color:var(--color-green)] bg-[color:var(--color-green)] text-background hover:opacity-90`;
const CHIP_DENY = `${CHIP} border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 text-[color:var(--color-red)] hover:border-[color:var(--color-red)]`;

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
      <button
        className={armed ? CHIP_ALLOW_ARMED : CHIP_ALLOW}
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
      </button>
      <button
        className={CHIP_DENY}
        onClick={onDeny}
        disabled={pending}
      >
        Deny
      </button>
      {err && <span className="text-[0.6875rem] text-[color:var(--color-red)]">{err}</span>}
    </div>
  );
}
