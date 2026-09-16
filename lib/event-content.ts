import type { EventRow } from "./types";

export type FeedEventContent =
  | { kind: "prompt"; text: string }
  | { kind: "tool_use"; toolName: string; input: string | null }
  | { kind: "subagent_dispatch"; subagentType: string | null; description: string | null; agentId: string | null }
  | { kind: "subagent_kill"; taskId: string | null; command: string | null }
  | { kind: "subagent_poll"; to: string | null; summary: string | null; message: string | null; taskId: string | null }
  | { kind: "other"; type: string };

/**
 * Narrows an event's untyped `data` blob into a discriminated union keyed on
 * `e.type`, matching the per-type shapes the feed/timeline rows render.
 */
export function parseEventContent(e: EventRow): FeedEventContent {
  const data = e.data as Record<string, unknown> | null;
  switch (e.type) {
    case "prompt": {
      const prompt = data?.prompt;
      return typeof prompt === "string" ? { kind: "prompt", text: prompt } : { kind: "other", type: e.type };
    }
    case "tool_use": {
      const input = data?.input;
      return {
        kind: "tool_use",
        toolName: e.tool_name ?? "",
        input: typeof input === "string" ? input : null,
      };
    }
    case "subagent_dispatch": {
      const subagentType = data?.subagent_type;
      const description = data?.description;
      const agentId = data?.agent_id;
      return {
        kind: "subagent_dispatch",
        subagentType: typeof subagentType === "string" ? subagentType : null,
        description: typeof description === "string" ? description : null,
        agentId: typeof agentId === "string" ? agentId : null,
      };
    }
    case "subagent_kill": {
      const taskId = data?.task_id;
      const command = data?.command;
      return {
        kind: "subagent_kill",
        taskId: typeof taskId === "string" ? taskId : null,
        command: typeof command === "string" ? command : null,
      };
    }
    case "subagent_poll": {
      const to = data?.to;
      const summary = data?.summary;
      const message = data?.message;
      const taskId = data?.task_id;
      return {
        kind: "subagent_poll",
        to: typeof to === "string" ? to : null,
        summary: typeof summary === "string" ? summary : null,
        message: typeof message === "string" ? message : null,
        taskId: typeof taskId === "string" ? taskId : null,
      };
    }
    default:
      return { kind: "other", type: e.type };
  }
}
