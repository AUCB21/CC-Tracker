"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Chip, InlineError } from "@/components/ui";

// Touch-target floor (2.75rem) on mobile, collapsing to the compact chip
// height at sm+ where pointer precision is higher.
const TOUCH_CLASS = "min-h-11 sm:min-h-0";

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

  let content: React.ReactNode;

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

    content = (
      <div className="ml-auto flex items-center gap-2">
        <Chip variant="neutral" className={TOUCH_CLASS} onClick={onClick} disabled={pending}>
          {pending ? "Saving..." : enabled ? "Disable" : "Enable"}
        </Chip>
        <InlineError>{err}</InlineError>
      </div>
    );
  } else {
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

    content = (
      <div className="ml-auto flex items-center gap-2">
        <Chip
          variant={state === "enabled" ? "primary" : "neutral"}
          armed={state === "enabled"}
          className={TOUCH_CLASS}
          onClick={() => decide("enabled")}
          disabled={pending || state === "enabled"}
        >
          {pending ? "Saving..." : "Approve"}
        </Chip>
        <Chip
          variant={state === "disabled" ? "primary" : "neutral"}
          armed={state === "disabled"}
          className={TOUCH_CLASS}
          onClick={() => decide("disabled")}
          disabled={pending || state === "disabled"}
        >
          {pending ? "Saving..." : "Reject"}
        </Chip>
        {state !== "pending" && (
          <Chip
            variant="neutral"
            className={TOUCH_CLASS}
            style={{ fontSize: "0.6875rem" }}
            onClick={() => decide("clear")}
            disabled={pending}
          >
            Reset
          </Chip>
        )}
        <InlineError>{err}</InlineError>
      </div>
    );
  }

  // ponytail: display:contents keeps the wrapper out of the flex layout while
  // still sitting in the DOM (and thus the click bubble path), so the click
  // that stops propagation doesn't also disturb the row's flex sizing.
  return (
    <div
      className="contents"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {content}
    </div>
  );
}
