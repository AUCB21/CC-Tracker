import { getHub, hubProjectPaths } from "@/lib/hub";
import { setPluginEnabled, setMcpJsonDecision } from "@/lib/hub-write";

export const dynamic = "force-dynamic";

type PluginBody = { kind: "plugin"; pluginKey: string; enabled: boolean };
type McpJsonBody = {
  kind: "mcpjson";
  projectPath: string;
  server: string;
  decision: "enabled" | "disabled" | "clear";
};
type Body = PluginBody | McpJsonBody;

function parseBody(raw: unknown): Body | { error: string } {
  if (raw === null || typeof raw !== "object") return { error: "body must be an object" };
  const body = raw as Record<string, unknown>;

  if (body.kind === "plugin") {
    if (typeof body.pluginKey !== "string" || body.pluginKey.length < 1 || body.pluginKey.length > 200) {
      return { error: "pluginKey must be a string of 1-200 characters" };
    }
    if (typeof body.enabled !== "boolean") {
      return { error: "enabled must be a boolean" };
    }
    return { kind: "plugin", pluginKey: body.pluginKey, enabled: body.enabled };
  }

  if (body.kind === "mcpjson") {
    if (typeof body.projectPath !== "string" || body.projectPath.length < 1) {
      return { error: "projectPath must be a non-empty string" };
    }
    if (typeof body.server !== "string" || body.server.length < 1 || body.server.length > 200) {
      return { error: "server must be a string of 1-200 characters" };
    }
    if (body.decision !== "enabled" && body.decision !== "disabled" && body.decision !== "clear") {
      return { error: "decision must be one of enabled, disabled, clear" };
    }
    return { kind: "mcpjson", projectPath: body.projectPath, server: body.server, decision: body.decision };
  }

  return { error: "kind must be one of plugin, mcpjson" };
}

/**
 * POST /api/hub/toggle
 * No auth header check: matches the rest of the UI-facing routes in this app
 * (localhost-only operator tool).
 */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if ("error" in parsed) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const hub = await getHub({ projectPaths: await hubProjectPaths() });

  if (parsed.kind === "plugin") {
    const found = hub.items.some(
      (item) =>
        item.type === "plugin" &&
        item.scope.kind === "plugin" &&
        `${item.scope.plugin}@${item.meta.marketplace}` === parsed.pluginKey &&
        item.state !== "stale",
    );
    if (!found) {
      return Response.json({ error: "unknown plugin" }, { status: 404 });
    }

    const result = await setPluginEnabled(parsed.pluginKey, parsed.enabled);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }
    return Response.json({ ok: true, file: result.file, backup: result.backup });
  }

  // kind === "mcpjson"
  const knownProject = hub.projectsScanned.includes(parsed.projectPath);
  const found =
    knownProject &&
    hub.items.some(
      (item) =>
        item.type === "mcp" &&
        item.scope.kind === "project" &&
        item.scope.path === parsed.projectPath &&
        item.name === parsed.server &&
        item.meta.local !== "true",
    );
  if (!found) {
    return Response.json({ error: "unknown server" }, { status: 404 });
  }

  const result = await setMcpJsonDecision(parsed.projectPath, parsed.server, parsed.decision);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 500 });
  }
  return Response.json({ ok: true, file: result.file, backup: result.backup });
}
