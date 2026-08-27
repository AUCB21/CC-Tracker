"use client";
import { useState, useEffect, useRef } from "react";
import { queueAttend, pollRun } from "./actions";
import { TASK_RUN_TERMINAL } from "@/lib/types";
import type { TaskRun } from "@/lib/types";

export function AttendButton({
  taskId,
  initialRun = null,
}: {
  taskId: string;
  initialRun?: TaskRun | null;
}) {
  const [run, setRun] = useState<TaskRun | null>(initialRun);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [override, setOverride] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // If we hydrated with a non-terminal run, resume polling.
  useEffect(() => {
    if (!run || TASK_RUN_TERMINAL.includes(run.status)) return;
    if (timer.current) return;
    timer.current = setInterval(async () => {
      const updated = await pollRun(run.id);
      if (!updated) return;
      setRun(updated);
      if (TASK_RUN_TERMINAL.includes(updated.status)) {
        clearInterval(timer.current!);
        timer.current = null;
      }
    }, 2000);
  }, [run]);

  async function handleAttend() {
    setLoading(true);
    setErr(null);
    setShowDetails(false);
    const trimmed = override.trim();
    const result = await queueAttend(taskId, trimmed || undefined);
    setLoading(false);
    if ("error" in result) { setErr(result.error); return; }
    setRun(result.run);
    setShowOverride(false);
    setOverride("");
  }

  if (err) {
    return (
      <span className="flex items-center gap-2 text-[0.6875rem] text-[color:var(--color-yellow)]">
        {err}
        <button
          onClick={() => setErr(null)}
          className="rounded border border-line px-1.5 py-[0.0625rem] text-muted hover:text-foreground"
        >
          retry
        </button>
      </span>
    );
  }

  // Terminal or in-flight run: show status pill; on error, allow expanding details.
  if (run) {
    const terminal = TASK_RUN_TERMINAL.includes(run.status);
    const color =
      run.status === "done" ? "text-[color:var(--color-green)]"
      : run.status === "error" || run.status === "cancelled" ? "text-[color:var(--color-yellow)]"
      : "text-[color:var(--color-blue)]";
    const hasDetails = run.status === "error" && (run.error || run.stdout_tail);
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[0.6875rem] ${color}`}>{run.status}</span>
          {hasDetails && (
            <button
              onClick={() => setShowDetails((v) => !v)}
              className="rounded border border-line px-1.5 py-[0.0625rem] text-[0.6875rem] text-muted hover:text-foreground"
              aria-expanded={showDetails}
            >
              {showDetails ? "hide" : "details"}
            </button>
          )}
          {terminal && (
            <button
              onClick={() => { setRun(null); setShowDetails(false); }}
              className="rounded border border-line px-1.5 py-[0.0625rem] text-[0.6875rem] text-muted hover:text-foreground"
            >
              retry
            </button>
          )}
        </div>
        {hasDetails && showDetails && (
          <pre className="max-w-[36rem] whitespace-pre-wrap break-words rounded border border-line bg-panel2 p-2 text-[0.6875rem] leading-relaxed text-muted">
            {run.error && <span className="text-[color:var(--color-yellow)]">{run.error}\n</span>}
            {run.stdout_tail?.slice(-800) ?? ""}
          </pre>
        )}
      </div>
    );
  }

  // Idle: Attend button + optional override textarea.
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          onClick={handleAttend}
          disabled={loading}
          className="shrink-0 rounded-full border border-line px-2 py-[0.125rem] text-[0.6875rem] font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          {loading ? "..." : "Attend"}
        </button>
        <button
          onClick={() => setShowOverride((v) => !v)}
          className="rounded border border-line px-1.5 py-[0.0625rem] text-[0.6875rem] text-muted hover:text-foreground"
          aria-expanded={showOverride}
          title="Extra instructions for this run"
        >
          {showOverride ? "×" : "+"}
        </button>
      </div>
      {showOverride && (
        <textarea
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          placeholder="Extra instructions for Claude (optional)"
          className="w-[24rem] resize-y rounded border border-line bg-panel2 p-2 text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
          rows={3}
        />
      )}
    </div>
  );
}
