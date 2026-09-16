"use client";

import { useEffect, useRef, useState } from "react";
import type { EventRow } from "@/lib/types";
import { Empty, ErrorAlert, LiveDot } from "@/components/ui";
import { EventRow as EventRowComponent } from "@/components/event-row";

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
          <ErrorAlert className="mb-3 text-[0.6875rem]">{pollError}. Retrying...</ErrorAlert>
        )}

        {events.length === 0 ? (
          <Empty>No events match the current filters.</Empty>
        ) : (
          <ul className="deck-timeline max-h-[32rem] space-y-1 overflow-y-auto pr-1">
            {events.map((e) => (
              <EventRowComponent
                key={e.id}
                event={e}
                timeFormat="hm"
                truncate={{ prompt: 90, toolInput: 70, agent: 90 }}
                isNew={e.id > initialMax}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
