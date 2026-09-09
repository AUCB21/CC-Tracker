"use client";
import { useState, useTransition } from "react";
import { sendPromptToNewSession } from "./actions";
import { Chip, InlineError } from "@/components/ui";

export function SendButton({ promptId }: { promptId: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  function fireSend() {
    setErr(null);
    setArmed(false);
    startTransition(async () => {
      const r = await sendPromptToNewSession(promptId);
      if ("error" in r) {
        setErr(r.error);
      } else {
        setCopied(r.copied);
        setSent(true);
        setTimeout(() => {
          setSent(false);
          setCopied(false);
        }, 2500);
      }
    });
  }

  function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    fireSend();
  }

  return (
    <div className="flex items-center gap-2">
      <Chip
        variant="allow"
        armed={armed}
        onClick={onClick}
        onBlur={() => setArmed(false)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setArmed(false);
        }}
        disabled={pending}
        aria-pressed={armed}
        title={armed ? "Click again to spawn a new Claude Code session" : "Copy prompt and open a new Claude Code session"}
      >
        {sent ? (copied ? "Copied → paste in terminal" : "Opened (clipboard failed)") : armed ? "Confirm Send" : "Send"}
      </Chip>
      <InlineError>{err}</InlineError>
    </div>
  );
}
