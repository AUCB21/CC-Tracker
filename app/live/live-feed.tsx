"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { TaskRun, EventRow, Project } from "@/lib/types";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { fmtCost, fmtRelative, truncate } from "@/lib/format";
import { Badge, CELL_STYLE, LiveDot, PANEL_STYLE as LANE_PANEL } from "@/components/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventRow as EventRowComponent } from "@/components/event-row";
import { computeLineage } from "@/lib/lineage";

const ALL_FILTER = "__all__";

type BadgeColor = "green" | "yellow" | "blue" | "accent" | "muted" | "red";

function runStatusBadge(status: TaskRun["status"]): BadgeColor {
  if (status === "done") return "green";
  if (status === "error") return "red";
  if (status === "cancelled") return "muted";
  return "accent";
}

function verdictBadge(v: NonNullable<TaskRun["verdict"]>): BadgeColor {
  if (v === "pass") return "green";
  if (v === "fail") return "red";
  return "yellow";
}

// ---- run card -------------------------------------------------------------

function RunCardImpl({ run, lineage }: { run: TaskRun; lineage?: { n: number; m: number } | null }) {
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
            <span className="text-[color:var(--color-red)]">{run.error}{"\n"}</span>
          )}
          {run.stdout_tail?.slice(-2000)}
        </pre>
      )}
    </li>
  );
}

// Custom compare: `lineage` is recomputed as a fresh object each realtime
// insert; shallow compare would miss the fact that its {n,m} are unchanged
// for unaffected rows. Comparing the two numeric fields keeps sibling
// RunCards from re-rendering when one row's status flips.
const RunCard = memo(
  RunCardImpl,
  (a, b) =>
    a.run === b.run &&
    (a.lineage?.n ?? -1) === (b.lineage?.n ?? -1) &&
    (a.lineage?.m ?? -1) === (b.lineage?.m ?? -1),
);

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
  const lineageMap = useMemo(() => computeLineage(runs), [runs]);

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
        <Select
          value={filterProject ?? ALL_FILTER}
          onValueChange={(v) => setFilter("project", v === ALL_FILTER ? "" : v)}
        >
          <SelectTrigger
            aria-label="Filter by project"
            className="h-auto max-w-full flex-1 min-w-0 rounded-md border-line bg-panel2 px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none focus:ring-0 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[color:var(--color-line)] bg-popover text-popover-foreground">
            <SelectItem value={ALL_FILTER}>All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterSession ?? ALL_FILTER}
          onValueChange={(v) => setFilter("session", v === ALL_FILTER ? "" : v)}
        >
          <SelectTrigger
            aria-label="Filter by session"
            className="h-auto max-w-full flex-1 min-w-0 rounded-md border-line bg-panel2 px-3 py-1.5 text-[0.75rem] text-foreground focus:border-accent focus:outline-none focus:ring-0 sm:flex-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[color:var(--color-line)] bg-popover text-popover-foreground">
            <SelectItem value={ALL_FILTER}>All sessions</SelectItem>
            {sessionOptions.map((sid) => (
              <SelectItem key={sid} value={sid}>{sid.slice(0, 8)}...{sid.slice(-4)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  <EventRowComponent key={e.id} event={e} timeFormat="hms" showSessionId truncate={{ prompt: 70, toolInput: 50, agent: 70 }} />
                ))}
              </ul>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
