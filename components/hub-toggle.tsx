"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Copied locally from app/hitl/decide-buttons.tsx; not exported from there.
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.75rem] font-medium leading-none transition-colors disabled:opacity-40";
const CHIP_IDLE = `${CHIP} border-line text-muted hover:border-line-strong`;
const CHIP_ACTIVE = `${CHIP} border-[color:var(--color-accent-500)] bg-[color:var(--color-accent-500)] text-background`;

type Props =
  | { kind: "plugin"; pluginKey: string; enabled: boolean }
  | { kind: "mcpjson"; projectPath: string; server: string; state: "enabled" | "disabled" | "pending" };

async function postToggle(body: Record<string, unknown>): Promise<{ error: string } | null> {
  const res = await fetch("/api/hub/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const parsed = await res.json().catch(() => ({}));
    return { error: parsed.error ?? "Request failed" };
  }
  return null;
}

export function HubToggle(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (props.kind === "plugin") {
    const { pluginKey, enabled } = props;

    function onClick() {
      setErr(null);
      startTransition(async () => {
        const failure = await postToggle({ kind: "plugin", pluginKey, enabled: !enabled });
        if (failure) {
          setErr(failure.error);
          return;
        }
        router.refresh();
      });
    }

    return (
      <div className="ml-auto flex items-center gap-2">
        <button className={CHIP_IDLE} onClick={onClick} disabled={pending}>
          {pending ? "Saving..." : enabled ? "Disable" : "Enable"}
        </button>
        {err && <span className="text-[0.6875rem] text-[color:var(--color-red)]">{err}</span>}
      </div>
    );
  }

  const { projectPath, server, state } = props;

  function decide(decision: "enabled" | "disabled" | "clear") {
    setErr(null);
    startTransition(async () => {
      const failure = await postToggle({ kind: "mcpjson", projectPath, server, decision });
      if (failure) {
        setErr(failure.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="ml-auto flex items-center gap-2">
      <button
        className={state === "enabled" ? CHIP_ACTIVE : CHIP_IDLE}
        onClick={() => decide("enabled")}
        disabled={pending || state === "enabled"}
      >
        {pending ? "Saving..." : "Approve"}
      </button>
      <button
        className={state === "disabled" ? CHIP_ACTIVE : CHIP_IDLE}
        onClick={() => decide("disabled")}
        disabled={pending || state === "disabled"}
      >
        {pending ? "Saving..." : "Reject"}
      </button>
      {state !== "pending" && (
        <button
          className={`${CHIP} border-line text-muted hover:border-line-strong text-[0.6875rem]`}
          onClick={() => decide("clear")}
          disabled={pending}
        >
          Reset
        </button>
      )}
      {err && <span className="text-[0.6875rem] text-[color:var(--color-red)]">{err}</span>}
    </div>
  );
}
