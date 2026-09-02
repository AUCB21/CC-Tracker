"use client";
import { useState, useTransition } from "react";
import { decideApproval } from "./actions";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-medium leading-none transition-colors disabled:opacity-40";
const CHIP_ALLOW = `${CHIP} border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)] hover:border-[color:var(--color-green)]`;
const CHIP_DENY = `${CHIP} border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 text-[color:var(--color-red)] hover:border-[color:var(--color-red)]`;

export function DecideButtons({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function decide(d: "approved" | "denied") {
    setErr(null);
    startTransition(async () => {
      const r = await decideApproval(id, d);
      if ("error" in r) setErr(r.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={CHIP_ALLOW}
        onClick={() => decide("approved")}
        disabled={pending}
      >
        approve
      </button>
      <button
        className={CHIP_DENY}
        onClick={() => decide("denied")}
        disabled={pending}
      >
        deny
      </button>
      {err && <span className="text-[0.6875rem] text-[color:var(--color-yellow)]">{err}</span>}
    </div>
  );
}
