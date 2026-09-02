"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TaskRun, EventRow, Project } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { fmtCost, fmtRelative, truncate } from "@/lib/format";
import { Badge, CELL_STYLE, LiveDot, PANEL_STYLE as LANE_PANEL } from "@/components/ui";

type BadgeColor = "green" | "yellow" | "blue" | "accent" | "muted" | "red";

function runStatusBadge(status: TaskRun["status"]): BadgeColor {
  if (status === "done") return "green";
  if (status === "error" || status === "cancelled") return "yellow";
  return "accent";
}

function verdictBadge(v: NonNullable<TaskRun["verdict"]>): BadgeColor {
  if (v === "pass") return "green";
  if (v === "fail") return "red";
  return "yellow";
}

function eventTone(type: string): string {
  if (type === "prompt") return "text-[color:var(--color-accent)]";
  if (type === "tool_use") return "text-[color:var(--color-blue)]";
  if (type === "tasks_synced" || type === "session_start") return "text-[color:var(--color-green)]";
  if (type === "subagent_dispatch") return "text-[color:var(--color-green)]";
  if (type === "subagent_kill") return "text-[color:var(--color-red)]";
  if (type === "subagent_poll") return "text-[color:var(--color-blue)]";
  return "text-muted";
}

const EVENT_MARK: Record<string, string> = {
  prompt: "P", tool_use: "T", tasks_synced: "S", session_start: "▶", session_end: "■",
  subagent_dispatch: "→", subagent_kill: "×", subagent_poll: "?",
};

// Depth of `id` within the parent chain restricted to runs currently loaded
// in the feed. When the row's parent_run_id isn't loaded (older than the tail)
// we still know depth ≥ 2, so the chip won't lie about being a retry.
function computeLineageMap(runs: TaskRun[]): Map<string, { n: number; m: number }> {
  const byId = new Map<string, TaskRun>();
  for (const r of runs) byId.set(r.id, r);
  const cache = new Map<string, number>();
  const depth = (id: string): number => {
    const cached = cache.get(id);
    if (cached != null) return cached;
    const r = byId.get(id);
    if (!r) return 1;
    let d = 1;
    if (r.parent_run_id) {
      d = byId.has(r.parent_run_id) ? depth(r.parent_run_id) + 1 : 2;
    }
    cache.set(id, d);
    return d;
  };
  const maxByTask = new Map<string, number>();
  for (const r of runs) {
    if (!r.task_id) continue;
    const d = depth(r.id);
    maxByTask.set(r.task_id, Math.max(maxByTask.get(r.task_id) ?? 0, d));
  }
  const out = new Map<string, { n: number; m: number }>();
  for (const r of runs) {
    if (!r.task_id) continue;
    const n = depth(r.id);
    const m = maxByTask.get(r.task_id) ?? n;
    if (n > 1 || m > 1 || r.parent_run_id) out.set(r.id, { n, m });
  }
  return out;
}

// ---- run card -------------------------------------------------------------

function RunCard({ run, lineage }: { run: TaskRun; lineage?: { n: number; m: number } | null }) {
  const [expanded, setExpanded] = useState(false);
  const live = !["done", "error", "cancelled"].includes(run.status);
  const hasOutput = !!(run.stdout_tail || run.error);

  return (
    <li className="p-4" style={CELL_STYLE}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[0.75rem] leading-relaxed text-foreground">
            {truncate(run.prompt, 140)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
            <span className="font-mono tabular-nums">{run.id.slice(0, 8)}</span>
            <span>{fmtRelative(run.requested_at)}</span>
            {run.agent_id && <span className="font-mono">{run.agent_id}</span>}
            {run.total_cost_usd != null && (
              <span className="font-mono tabular-nums text-[color:var(--color-green)]">
                {fmtCost(Number(run.total_cost_usd))}
              </span>
            )}
            {run.claude_session_id && (
              <Link
                href={`/sessions/${run.claude_session_id}`}
                className="font-mono text-accent hover:underline"
              >
                session
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            color={runStatusBadge(run.status)}
            glyph={
              live ? (
                <span
                  aria-hidden
                  className="motion-safe-pulse inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse"
                />
              ) : undefined
            }
          >
            {run.status}
          </Badge>
          {run.verdict && (
            <span title={run.verdict_reason ?? undefined}>
              <Badge color={verdictBadge(run.verdict)}>
                {run.verdict.replace("_", " ")}
              </Badge>
            </span>
          )}
          {lineage && (
            <span title="attempt within retry / follow-up chain">
              <Badge color="muted">
                attempt {lineage.n}/{lineage.m}
              </Badge>
            </span>
          )}
          {hasOutput && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[0.6875rem] text-muted hover:text-foreground"
            >
              {expanded ? "hide" : "stdout"}
            </button>
          )}
        </div>
      </div>

      {expanded && hasOutput && (
        <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-panel p-2 text-[0.6875rem] leading-relaxed text-muted">
          {run.error && (
            <span className="text-[color:var(--color-yellow)]">{run.error}{"\n"}</span>
          )}
          {run.stdout_tail?.slice(-2000)}
        </pre>
      )}
    </li>
  );
}

// ---- feed (two-column tail) -----------------------------------------------

const LANE_H = "h-[calc(100dvh-16rem)]";

function LaneHeader({
  label,
  count,
  paused,
  onToggle,
}: {
  label: string;
  count?: number;
  paused: boolean;
  onToggle: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 shrink-0">
      <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
        {count != null && (
          <span className="ml-2 font-mono tabular-nums normal-case tracking-normal text-foreground/70">
            {count}
          </span>
        )}
      </h2>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={!paused}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.06em] transition-colors ${
          paused
            ? "border-line bg-panel2 text-muted hover:border-accent/60 hover:text-foreground"
            : "border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)]"
        }`}
      >
        {paused ? (
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
        ) : (
          <LiveDot className="h-1.5 w-1.5" />
        )}
        {paused ? "Paused" : "Live"}
      </button>
    </header>
  );
}

export function LiveFeed({
  initialRuns,
  initialEvents,
  projects,
  filterProject,
  filterSession,
}: {
  initialRuns: TaskRun[];
  initialEvents: EventRow[];
  projects: Project[];
  filterProject?: string;
  filterSession?: string;
}) {
  const [runs, setRuns] = useState<TaskRun[]>(initialRuns);
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [pausedRuns, setPausedRuns] = useState(false);
  const [pausedEvents, setPausedEvents] = useState(false);

  // Task Runs lane: collapse to the latest run per task_id (a task can have
  // several rows, one per Attend click / retry). Rows with no task_id pass
  // through unchanged. Filtering (not re-sorting) preserves the array's
  // existing newest-at-top order.
  const displayRuns = useMemo(() => {
    const latestByTask = new Map<string, TaskRun>();
    for (const r of runs) {
      if (!r.task_id) continue;
      const cur = latestByTask.get(r.task_id);
      if (!cur || new Date(r.requested_at) > new Date(cur.requested_at)) {
        latestByTask.set(r.task_id, r);
      }
    }
    return runs.filter((r) => !r.task_id || latestByTask.get(r.task_id) === r);
  }, [runs]);

  // Depth chip source; recomputed as runs stream in so realtime rows pick up
  // their attempt number as soon as the parent is visible in the tail.
  const lineageMap = useMemo(() => computeLineageMap(runs), [runs]);

  // Distinct session ids present in the current event tail, most recent first,
  // for the session filter dropdown. If the current filter isn't in the list
  // (e.g. URL param points to a session not in the tail), keep it as an option
  // so the user can still clear it.
  const sessionOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (let i = events.length - 1; i >= 0; i--) {
      const sid = events[i].session_id;
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        list.push(sid);
      }
    }
    if (filterSession && !seen.has(filterSession)) list.unshift(filterSession);
    return list;
  }, [events, filterSession]);

  // Refs so realtime callbacks read current pause state without re-subscribing.
  const pausedRunsRef = useRef(false);
  const pausedEventsRef = useRef(false);
  const runsTopRef = useRef<HTMLDivElement>(null);
  const eventsTopRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  function scrollTop(ref: React.RefObject<HTMLDivElement | null>) {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Realtime: one channel, both tables.
  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) return;

    const ch = client
      .channel("live-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_runs" },
        (payload) => {
          const row = payload.new as TaskRun;
          if (filterProject && row.project_id !== filterProject) return;
          setRuns((prev) => {
            const idx = prev.findIndex((r) => r.id === row.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = row;
              return next;
            }
            return [row, ...prev].slice(0, 100);
          });
          if (payload.eventType === "INSERT" && !pausedRunsRef.current) {
            setTimeout(() => scrollTop(runsTopRef), 50);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "events" },
        (payload) => {
          const row = payload.new as EventRow;
          if (filterSession && row.session_id !== filterSession) return;
          setEvents((prev) => [row, ...prev].slice(0, 500));
          if (!pausedEventsRef.current) {
            setTimeout(() => scrollTop(eventsTopRef), 50);
          }
        },
      )
      .subscribe();

    return () => { client.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProject, filterSession]);

  function toggleRuns() {
    const next = !pausedRuns;
    pausedRunsRef.current = next;
    setPausedRuns(next);
    if (!next) setTimeout(() => scrollTop(runsTopRef), 50);
  }

  function toggleEvents() {
    const next = !pausedEvents;
    pausedEventsRef.current = next;
    setPausedEvents(next);
    if (!next) setTimeout(() => scrollTop(eventsTopRef), 50);
  }

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(`/live${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by project"
          value={filterProject ?? ""}
          onChange={(e) => setFilter("project", e.target.value)}
          className="max-w-full flex-1 min-w-0 rounded-md border border-line bg-panel2 px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none sm:flex-none"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          aria-label="Filter by session"
          value={filterSession ?? ""}
          onChange={(e) => setFilter("session", e.target.value)}
          className="max-w-full flex-1 min-w-0 rounded-md border border-line bg-panel2 px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none sm:flex-none"
        >
          <option value="">All sessions</option>
          {sessionOptions.map((sid) => (
            <option key={sid} value={sid}>{sid.slice(0, 8)}...{sid.slice(-4)}</option>
          ))}
        </select>
      </div>

      {/* Two-column tail */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">

        {/* Task Runs lane */}
        <section className="flex flex-col overflow-hidden" style={LANE_PANEL}>
          <LaneHeader label="Task Runs" paused={pausedRuns} onToggle={toggleRuns} />
          <div className={`${LANE_H} overflow-y-auto px-5 pb-5`}>
            {runs.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No task runs yet.</p>
            ) : (
              <ul className="space-y-3">
                <div ref={runsTopRef} />
                {displayRuns.map((r) => (
                  <RunCard key={r.id} run={r} lineage={lineageMap.get(r.id) ?? null} />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Events lane */}
        <section className="flex flex-col overflow-hidden" style={LANE_PANEL}>
          <LaneHeader label="Events" count={events.length} paused={pausedEvents} onToggle={toggleEvents} />
          <div className={`${LANE_H} overflow-y-auto px-5 pb-5`}>
            {events.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">No events in the last 30 minutes.</p>
            ) : (
              <ul className="space-y-0.5">
                <div ref={eventsTopRef} />
                {events.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-start gap-2 rounded-md px-2 py-1 text-[0.75rem] hover:bg-panel2/60"
                  >
                    <span className={`w-4 shrink-0 text-center font-mono ${eventTone(e.type)}`}>
                      {EVENT_MARK[e.type] ?? "."}
                    </span>
                    <span className="w-16 shrink-0 font-mono tabular-nums text-muted text-[0.6875rem] leading-[1.6]">
                      {new Date(e.created_at).toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="w-16 shrink-0 font-mono text-[0.6875rem] text-muted leading-[1.6] truncate">
                      {e.session_id?.slice(0, 8)}
                    </span>
                    <span className="min-w-0 flex-1 break-words">
                      <span className="text-muted">{e.type === "tool_use" ? e.tool_name : e.type}</span>
                      {e.type === "prompt" &&
                        typeof (e.data as { prompt?: string })?.prompt === "string" && (
                          <span className="ml-2 text-foreground">
                            {truncate((e.data as { prompt: string }).prompt, 70)}
                          </span>
                        )}
                      {e.type === "tool_use" &&
                        typeof (e.data as { input?: string })?.input === "string" && (
                          <span className="ml-2 font-mono text-muted">
                            {truncate((e.data as { input: string }).input, 50)}
                          </span>
                        )}
                      {e.type === "subagent_dispatch" && (() => {
                        const d = e.data as { subagent_type?: string; description?: string; agent_id?: string };
                        const text = d.description
                          ? `${d.subagent_type ?? "?"} · ${d.description}`
                          : d.agent_id ?? "";
                        return text ? (
                          <span className="ml-2 text-foreground">{truncate(text, 70)}</span>
                        ) : null;
                      })()}
                      {e.type === "subagent_kill" && (() => {
                        const d = e.data as { task_id?: string; command?: string };
                        const text = [d.task_id, d.command ? truncate(d.command, 60) : undefined]
                          .filter(Boolean)
                          .join(" · ");
                        return text ? (
                          <span className="ml-2 font-mono text-muted">{text}</span>
                        ) : null;
                      })()}
                      {e.type === "subagent_poll" && (() => {
                        const d = e.data as { to?: string; summary?: string; message?: string; task_id?: string };
                        if (d.to) {
                          const detail = d.summary ?? d.message;
                          return (
                            <span className="ml-2 text-foreground">
                              {`→ ${d.to}`}
                              {detail ? ` · ${truncate(detail, 60)}` : ""}
                            </span>
                          );
                        }
                        if (d.task_id) {
                          return <span className="ml-2 font-mono text-muted">{d.task_id}</span>;
                        }
                        return null;
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
