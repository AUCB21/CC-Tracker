"use client";
import { useState, useEffect, useRef } from "react";
import { queueAttend, pollRun, cancelRun } from "./actions";
import { TASK_RUN_TERMINAL } from "@/lib/types";
import type { TaskRun } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Chip aesthetic to match active-filters: soft accent-tinted pill.
const CHIP_BASE =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-medium leading-none transition-colors";
const CHIP_IDLE = `${CHIP_BASE} border-line text-muted hover:border-accent hover:text-accent`;
const CHIP_ACTIVE = `${CHIP_BASE} border-accent/40 bg-accent/10 text-foreground hover:border-accent`;
// ponytail: same dimensions as CHIP_BASE so status/action chips align in one row.
const CHIP_TINY =
  `${CHIP_BASE} border-line text-muted hover:border-accent hover:text-foreground`;

function statusChipClass(status: TaskRun["status"]): string {
  if (status === "done") return `${CHIP_BASE} border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)]`;
  if (status === "error" || status === "cancelled") return `${CHIP_BASE} border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 text-[color:var(--color-yellow)]`;
  // queued / claimed / running: pulsing accent
  return `${CHIP_BASE} border-accent/40 bg-accent/10 text-foreground`;
}

function verdictChipClass(verdict: NonNullable<TaskRun["verdict"]>): string {
  if (verdict === "pass") return `${CHIP_BASE} border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)]`;
  if (verdict === "fail") return `${CHIP_BASE} border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 text-[color:var(--color-red)]`;
  return `${CHIP_BASE} border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 text-[color:var(--color-yellow)]`;
}

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
  const [cancelling, setCancelling] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [override, setOverride] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    },
    [],
  );

  // Sync when parent passes a fresher run (e.g. live-refresh flips initialRun.id).
  useEffect(() => {
    setRun(initialRun ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRun?.id]);

  // Live subscription per current run. Postgres UPDATE events flip the pill
  // as the local agent moves the row (queued → claimed → running → done/error).
  // Belt-and-suspenders: also poll every 6s in case Realtime isn't wired
  // (publication missing task_runs, dropped websocket, etc.) — polling is a
  // no-op when nothing changed, so real-time still gets the sub-second UX.
  useEffect(() => {
    if (!run || TASK_RUN_TERMINAL.includes(run.status)) return;
    const runId = run.id;
    const client = getBrowserSupabase();
    let ch: ReturnType<NonNullable<typeof client>["channel"]> | null = null;

    if (client) {
      ch = client
        .channel(`task_run:${runId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "task_runs", filter: `id=eq.${runId}` },
          (payload) => setRun(payload.new as TaskRun),
        )
        .subscribe();
    }

    pollTimer.current = setInterval(async () => {
      const updated = await pollRun(runId);
      if (!updated) return;
      setRun(updated);
      if (TASK_RUN_TERMINAL.includes(updated.status)) {
        if (pollTimer.current) clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    }, 6000);

    return () => {
      if (ch && client) client.removeChannel(ch);
      if (pollTimer.current) clearInterval(pollTimer.current);
      pollTimer.current = null;
    };
  }, [run?.id, run?.status]);

  async function handleCancel() {
    if (!run) return;
    setCancelling(true);
    await cancelRun(run.id);
    setCancelling(false);
  }

  async function handleAttend() {
    setLoading(true);
    setErr(null);
    setShowDetails(false);
    const trimmed = override.trim();
    const result = await queueAttend(taskId, trimmed || undefined);
    setLoading(false);
    if ("error" in result) {
      setErr(result.error);
      return;
    }
    setRun(result.run);
    setShowOverride(false);
    setOverride("");
  }

  if (err) {
    return (
      <span className="flex items-center gap-2 text-[0.6875rem] text-[color:var(--color-yellow)]">
        {err}
        <button onClick={() => setErr(null)} className={CHIP_TINY}>
          retry
        </button>
      </span>
    );
  }

  if (run) {
    const terminal = TASK_RUN_TERMINAL.includes(run.status);
    const hasDetails =
      (run.status === "error" && (run.error || run.stdout_tail)) ||
      !!run.verdict_reason;
    const live = !terminal;
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <span className={statusChipClass(run.status)}>
            {live && (
              <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
                <span className="motion-safe-pulse absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
            )}
            <span className="font-mono">{run.status}</span>
          </span>
          {run.verdict && (
            <span
              className={verdictChipClass(run.verdict)}
              title={run.verdict_reason ?? undefined}
            >
              <span className="font-mono">{run.verdict.replace("_", " ")}</span>
            </span>
          )}
          {live && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className={`${CHIP_TINY} disabled:opacity-40`}
            >
              {cancelling ? "…" : "cancel"}
            </button>
          )}
          {hasDetails && (
            <button
              onClick={() => setShowDetails((v) => !v)}
              className={CHIP_TINY}
              aria-expanded={showDetails}
            >
              {showDetails ? "hide" : "details"}
            </button>
          )}
          {terminal && (
            <button
              onClick={handleAttend}
              disabled={loading}
              className={`${CHIP_TINY} disabled:opacity-40`}
            >
              {loading ? "…" : "retry"}
            </button>
          )}
        </div>
        {hasDetails && showDetails && (
          <pre className="max-w-[36rem] whitespace-pre-wrap break-words rounded-md border border-line bg-panel2 p-2 text-[0.6875rem] leading-relaxed text-muted">
            {run.verdict_reason && (
              <span className="text-foreground">verdict: {run.verdict_reason}{"\n"}</span>
            )}
            {run.diff_summary && (
              <span className="text-muted-2">
                diff: {run.diff_summary.files_changed} files, +{run.diff_summary.insertions} / -{run.diff_summary.deletions}{"\n"}
              </span>
            )}
            {run.error && (
              <span className="text-[color:var(--color-yellow)]">{run.error}{"\n"}</span>
            )}
            {run.stdout_tail?.slice(-800) ?? ""}
          </pre>
        )}
      </div>
    );
  }

  // Idle: chip-styled Attend + override toggle.
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleAttend}
          disabled={loading}
          className={`${showOverride || override.trim() ? CHIP_ACTIVE : CHIP_IDLE} disabled:opacity-40`}
        >
          {loading ? "…" : "Attend"}
        </button>
        <button
          onClick={() => setShowOverride((v) => !v)}
          className={CHIP_TINY}
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
          className="w-[24rem] resize-y rounded-md border border-line bg-panel2 p-2 text-[0.75rem] text-foreground placeholder:text-muted-2 focus:border-accent focus:outline-none"
          rows={3}
        />
      )}
    </div>
  );
}
