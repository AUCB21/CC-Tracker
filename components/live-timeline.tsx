"use client";

import { useEffect, useRef, useState } from "react";
import type { EventRow } from "@/lib/types";
import { Empty, LiveDot } from "@/components/ui";
import { truncate } from "@/lib/format";

const EVENT_MARK: Record<string, string> = {
  prompt: "P",
  tool_use: "T",
  tasks_synced: "S",
  session_start: "▶",
  session_end: "■",
  subagent_dispatch: "→",
  subagent_kill: "×",
  subagent_poll: "?",
};

function eventTone(type: string): string {
  if (type === "prompt") return "text-[color:var(--color-accent)]";
  if (type === "tool_use") return "text-[color:var(--color-blue)]";
  if (type === "tasks_synced") return "text-[color:var(--color-green)]";
  if (type === "session_start") return "text-[color:var(--color-green)]";
  if (type === "session_end") return "text-muted";
  if (type === "subagent_dispatch") return "text-[color:var(--color-green)]";
  if (type === "subagent_kill") return "text-[color:var(--color-red)]";
  if (type === "subagent_poll") return "text-[color:var(--color-blue)]";
  return "text-muted";
}

type Filters = { type: string[]; tool: string[] };

export function LiveTimeline({
  sessionId,
  sessionEnded,
  initialEvents,
  filters,
}: {
  sessionId: string;
  sessionEnded: boolean;
  initialEvents: EventRow[];
  filters: Filters;
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [live, setLive] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [initialMax] = useState<number>(() => initialEvents[0]?.id ?? 0);
  const cursorRef = useRef<number>(initialEvents[0]?.id ?? 0);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let delay = 3000;
    let timer: ReturnType<typeof setTimeout>;

    async function fetchNew() {
      try {
        const params = new URLSearchParams({ since: String(cursorRef.current) });
        if (filters.type.length > 0) params.set("type", filters.type.join(","));
        if (filters.tool.length > 0) params.set("tool", filters.tool.join(","));
        const res = await fetch(
          `/api/sessions/${sessionId}/events?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`poll failed (${res.status})`);
        const data = (await res.json()) as { events: EventRow[] };
        if (cancelled) return;
        if (data.events.length > 0) {
          cursorRef.current = Math.max(cursorRef.current, data.events[0].id);
          setEvents((prev) => {
            const merged = [...data.events, ...prev];
            return merged.slice(0, 500);
          });
        }
        setPollError(null);
        delay = 3000;
      } catch (e) {
        if (!cancelled) setPollError(e instanceof Error ? e.message : "poll error");
        delay = Math.min(delay * 2, 30000);
      } finally {
        if (!cancelled) timer = setTimeout(fetchNew, delay);
      }
    }

    fetchNew();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [live, sessionId, filters]);

  const canFollow = !sessionEnded;

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
          Timeline
          <span className="ml-2 font-mono tabular-nums normal-case tracking-normal text-foreground/70">
            {events.length}
          </span>
        </h2>
        {canFollow ? (
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            aria-pressed={live}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.6875rem] uppercase tracking-[0.06em] transition-colors ${
              live
                ? "border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)]"
                : "border-line bg-panel2 text-muted hover:border-accent/60 hover:text-foreground"
            }`}
          >
            {live ? (
              <LiveDot className="h-1.5 w-1.5" />
            ) : (
              <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
            )}
            {live ? "Following" : "Follow live"}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel2 px-3 py-1 text-[0.6875rem] uppercase tracking-[0.06em] text-muted">
            <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-muted" />
            Session ended
          </span>
        )}
      </header>

      <div className="px-5 pb-5">
        {pollError && live && (
          <div
            role="alert"
            className="mb-3 rounded-lg border border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 px-3 py-2 text-[0.6875rem] text-[color:var(--color-yellow)]"
          >
            {pollError}. Retrying...
          </div>
        )}

        {events.length === 0 ? (
          <Empty>No events match the current filters.</Empty>
        ) : (
          <ul className="deck-timeline max-h-[32rem] space-y-1 overflow-y-auto pr-1">
            {events.map((e) => {
              const isNew = e.id > initialMax;
              return (
                <li
                  key={e.id}
                  data-new={isNew ? "1" : undefined}
                  className="flex items-start gap-3 rounded-md px-2 py-1 text-[0.75rem] transition-colors hover:bg-panel2/60"
                >
                  <span className={`w-4 shrink-0 text-center font-mono ${eventTone(e.type)}`}>
                    {EVENT_MARK[e.type] ?? "."}
                  </span>
                  <span className="w-14 shrink-0 font-mono tabular-nums text-muted">
                    {new Date(e.created_at).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-muted">
                      {e.type === "tool_use" ? e.tool_name : e.type}
                    </span>
                    {e.type === "prompt" &&
                      typeof (e.data as { prompt?: string })?.prompt === "string" && (
                        <span className="ml-2 text-foreground">
                          {truncate((e.data as { prompt: string }).prompt, 90)}
                        </span>
                      )}
                    {e.type === "tool_use" &&
                      typeof (e.data as { input?: string })?.input === "string" && (
                        <span className="ml-2 font-mono text-muted">
                          {truncate((e.data as { input: string }).input, 70)}
                        </span>
                      )}
                    {e.type === "subagent_dispatch" && (() => {
                      const d = e.data as { subagent_type?: string; description?: string; agent_id?: string };
                      const text = d.description
                        ? `${d.subagent_type ?? "?"} · ${d.description}`
                        : d.agent_id ?? "";
                      return text ? (
                        <span className="ml-2 text-foreground">{truncate(text, 90)}</span>
                      ) : null;
                    })()}
                    {e.type === "subagent_kill" && (() => {
                      const d = e.data as { task_id?: string; command?: string };
                      const text = [d.task_id, d.command ? truncate(d.command, 70) : undefined]
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
                            {detail ? ` · ${truncate(detail, 70)}` : ""}
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
              );
            })}
          </ul>
        )}
      </div>

      <style>{`
        .deck-timeline li[data-new="1"] {
          animation: deck-new-event 900ms var(--ease-standard);
        }
        @keyframes deck-new-event {
          0%   { background-color: color-mix(in oklab, var(--color-accent) 22%, transparent); }
          100% { background-color: transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          .deck-timeline li[data-new="1"] { animation: none; }
        }
      `}</style>
    </section>
  );
}
