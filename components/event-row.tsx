"use client";

import { memo, type ReactNode } from "react";
import type { EventRow as EventRowData } from "@/lib/types";
import { truncate as truncateText } from "@/lib/format";
import { parseEventContent } from "@/lib/event-content";

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

export type EventRowProps = {
  event: EventRowData;
  timeFormat?: "hm" | "hms";
  showSessionId?: boolean;
  truncate?: {
    prompt?: number;
    toolInput?: number;
    agent?: number;
  };
  isNew?: boolean;
};

// Memoised so a single realtime insert / poll tick doesn't rerender the whole
// tail. Default shallow compare is fine: `event` is a stable object identity
// per row (Realtime insert / poll fetch), so unaffected rows never re-render.
export const EventRow = memo(function EventRow({
  event: e,
  timeFormat = "hm",
  showSessionId = false,
  truncate: truncateLengths,
  isNew,
}: EventRowProps) {
  const promptLen = truncateLengths?.prompt ?? 70;
  const toolInputLen = truncateLengths?.toolInput ?? 50;
  const agentLen = truncateLengths?.agent ?? 70;
  const content = parseEventContent(e);

  let detail: ReactNode = null;
  switch (content.kind) {
    case "prompt":
      detail = <span className="ml-2 text-foreground">{truncateText(content.text, promptLen)}</span>;
      break;
    case "tool_use":
      if (content.input != null) {
        detail = <span className="ml-2 font-mono text-muted">{truncateText(content.input, toolInputLen)}</span>;
      }
      break;
    case "subagent_dispatch": {
      const text = content.description
        ? `${content.subagentType ?? "?"} · ${content.description}`
        : content.agentId ?? "";
      if (text) detail = <span className="ml-2 text-foreground">{truncateText(text, agentLen)}</span>;
      break;
    }
    case "subagent_kill": {
      const text = [content.taskId, content.command ? truncateText(content.command, agentLen) : undefined]
        .filter(Boolean)
        .join(" · ");
      if (text) detail = <span className="ml-2 font-mono text-muted">{text}</span>;
      break;
    }
    case "subagent_poll": {
      if (content.to) {
        const d = content.summary ?? content.message;
        detail = (
          <span className="ml-2 text-foreground">
            {`→ ${content.to}`}
            {d ? ` · ${truncateText(d, agentLen)}` : ""}
          </span>
        );
      } else if (content.taskId) {
        detail = <span className="ml-2 font-mono text-muted">{content.taskId}</span>;
      }
      break;
    }
    case "other":
      break;
  }

  const liClassName = showSessionId
    ? "flex items-start gap-2 rounded-md px-2 py-1 text-[0.75rem] hover:bg-panel2/60"
    : "flex items-start gap-3 rounded-md px-2 py-1 text-[0.75rem] transition-colors hover:bg-panel2/60";
  const timeClassName = showSessionId
    ? "w-16 shrink-0 font-mono tabular-nums text-muted text-[0.6875rem] leading-[1.6]"
    : "w-14 shrink-0 font-mono tabular-nums text-muted";

  return (
    <li data-new={isNew ? "1" : undefined} className={liClassName}>
      <span className={`w-4 shrink-0 text-center font-mono ${eventTone(e.type)}`}>
        {EVENT_MARK[e.type] ?? "."}
      </span>
      <span className={timeClassName}>
        {timeFormat === "hms"
          ? new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
          : new Date(e.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
      </span>
      {showSessionId && (
        <span className="w-16 shrink-0 font-mono text-[0.6875rem] text-muted leading-[1.6] truncate">
          {e.session_id?.slice(0, 8)}
        </span>
      )}
      <span className="min-w-0 flex-1 break-words">
        <span className="text-muted">{content.kind === "tool_use" ? content.toolName : e.type}</span>
        {detail}
      </span>
    </li>
  );
});
