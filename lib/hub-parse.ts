// Pure helpers for /hub: parses Claude Code config files (frontmatter, TOML commands,
// project/plugin/hook identity). No "server-only", no fs — safe to import from tests
// and from lib/hub.ts alike. Hand-rolled parsing only; no yaml/toml/zod deps (see plan).

// normalizePath is re-exported from lib/ingest.ts rather than duplicated here: ingest.ts's
// only non-builtin import is `import type { SupabaseClient } from "@supabase/supabase-js"`,
// which TypeScript erases at compile time (no runtime import), so pulling it in here does
// not drag in supabase, "server-only", or any fs/network dependency.
import { normalizePath } from "@/lib/ingest";

export type HubType = "skill" | "command" | "agent" | "mcp" | "hook" | "plugin";
export type HubScope =
  | { kind: "user" }
  | { kind: "project"; path: string; name: string }
  | { kind: "plugin"; plugin: string; marketplace: string }
  | { kind: "inline"; plugin: string };
export type HubState = "enabled" | "disabled" | "pending" | "stale";
export type HubItem = {
  id: string; // stable: `${type}:${scopeKey}:${name}`
  type: HubType;
  name: string; // namespaced for plugin items: "ponytail:ponytail-review"
  description: string | null;
  scope: HubScope;
  state: HubState;
  source: string; // path of the file that defines it
  meta: Record<string, string>;
};
export type HubWarning = {
  code: "duplicate-hook" | "stale-plugin" | "mcp-pending" | "unnormalized-project-key" | "missing-project";
  message: string;
  source: string;
};
export type Hub = {
  items: HubItem[];
  warnings: HubWarning[];
  generatedAt: string;
  projectsScanned: string[];
  configDir: string;
};

export type ParsedFrontmatter = {
  name: string | null;
  description: string | null;
  version: string | null;
  userInvocable: boolean | null;
  model: string | null;
  tools: string | null;
  body: string;
};

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}

/**
 * Hand-rolled frontmatter parser for the handful of fields /hub cares about.
 * Supports: `---` fenced block at file start (tolerates a leading BOM and CRLF
 * line endings), `key: value` scalars (quoted or bare), folded (`>`, `>-`) and
 * literal (`|`, `|-`) block scalars, and `key:` list values (`- item` lines).
 * Unknown keys are parsed structurally (so they don't corrupt later lines) but
 * their values are discarded. No frontmatter block → all nulls, body = whole input.
 */
export function parseFrontmatter(md: string): ParsedFrontmatter {
  let text = md.startsWith("﻿") ? md.slice(1) : md;
  text = text.replace(/\r\n/g, "\n");

  const empty: ParsedFrontmatter = {
    name: null,
    description: null,
    version: null,
    userInvocable: null,
    model: null,
    tools: null,
    body: text,
  };

  const lines = text.split("\n");
  if ((lines[0] ?? "").trim() !== "---") return empty;

  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) return empty; // unterminated fence → treat as no frontmatter

  const fmLines = lines.slice(1, closeIdx);
  const body = lines
    .slice(closeIdx + 1)
    .join("\n")
    .replace(/^\n+/, "");

  let name: string | null = null;
  let description: string | null = null;
  let version: string | null = null;
  let userInvocable: boolean | null = null;
  let model: string | null = null;
  let tools: string | null = null;

  const assign = (key: string, value: string) => {
    switch (key) {
      case "name":
        name = value;
        break;
      case "description":
        description = value;
        break;
      case "version":
        version = value;
        break;
      case "user-invocable":
        if (value === "true") userInvocable = true;
        else if (value === "false") userInvocable = false;
        break;
      case "model":
        model = value;
        break;
      case "tools":
        tools = value;
        break;
      default:
        break; // unknown scalar keys ignored
    }
  };
  const assignList = (key: string, items: string[]) => {
    if (key === "tools") tools = items.join(", ");
    // any other list key (e.g. allowed-tools) is ignored, but must not throw
  };

  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    const m = line.match(/^([A-Za-z0-9_.-]+):(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1];
    const rest = m[2].trim();

    if (rest === ">" || rest === ">-" || rest === ">+" || rest === "|" || rest === "|-" || rest === "|+") {
      const contLines: string[] = [];
      let j = i + 1;
      while (j < fmLines.length) {
        const l = fmLines[j];
        if (l.trim() === "") {
          contLines.push("");
          j++;
          continue;
        }
        const indent = l.length - l.trimStart().length;
        if (indent > 0) {
          contLines.push(l.trim());
          j++;
        } else {
          break;
        }
      }
      while (contLines.length && contLines[contLines.length - 1] === "") contLines.pop();
      const isFold = rest[0] === ">";
      const joined = isFold ? contLines.filter((l) => l !== "").join(" ") : contLines.join("\n");
      assign(key, joined.trim());
      i = j;
      continue;
    }

    if (rest === "") {
      // possible list value: following more-indented "- item" lines
      const itemLines: string[] = [];
      let j = i + 1;
      while (j < fmLines.length) {
        const l = fmLines[j];
        const trimmed = l.trim();
        if (trimmed === "") {
          j++;
          continue;
        }
        const indent = l.length - l.trimStart().length;
        if (indent > 0 && trimmed.startsWith("-")) {
          itemLines.push(stripQuotes(trimmed.replace(/^-\s?/, "").trim()));
          j++;
        } else {
          break;
        }
      }
      if (itemLines.length > 0) {
        assignList(key, itemLines);
        i = j;
        continue;
      }
      assign(key, "");
      i++;
      continue;
    }

    assign(key, stripQuotes(rest));
    i++;
  }

  return { name, description, version, userInvocable, model, tools, body };
}

function unescapeToml(s: string): string {
  return s.replace(/\\(.)/g, (_, c: string) => {
    switch (c) {
      case "n":
        return "\n";
      case "t":
        return "\t";
      case '"':
        return '"';
      case "\\":
        return "\\";
      default:
        return c;
    }
  });
}

function extractTomlString(text: string, key: string): string | null {
  const multiRe = new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*"""([\\s\\S]*?)"""`, "m");
  const multiMatch = text.match(multiRe);
  if (multiMatch) return unescapeToml(multiMatch[1]);
  const basicRe = new RegExp(`(?:^|\\n)\\s*${key}\\s*=\\s*"((?:\\\\.|[^"\\\\])*)"`, "m");
  const basicMatch = text.match(basicRe);
  if (basicMatch) return unescapeToml(basicMatch[1]);
  return null;
}

/**
 * Regex-based extraction of the two fields /hub shows from a ponytail-style
 * command .toml file: `description = "..."` and `prompt = "..."` / `prompt = """...""".
 * Not a full TOML parser — handles escaped quotes (`\"`) in both basic and
 * multi-line basic strings, nothing else.
 */
export function parseTomlCommand(toml: string): { description: string | null; prompt: string | null } {
  return {
    description: extractTomlString(toml, "description"),
    prompt: extractTomlString(toml, "prompt"),
  };
}

/** Normalizes then lowercases a filesystem path, stripping a trailing slash, so the
 *  same project resolves to one key regardless of drive-letter case, slash direction,
 *  or a trailing separator (mirrors the `projects` dedupe cc-track needs on Windows). */
export function projectKey(p: string): string {
  const normalized = normalizePath(p).toLowerCase();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

/** Splits a `"name@marketplace"` plugin key on its last "@"; a key with no "@"
 *  (shouldn't happen on disk, but pluginUsage keys are free-form) gets marketplace "unknown". */
export function pluginKey(key: string): { name: string; marketplace: string } {
  const idx = key.lastIndexOf("@");
  if (idx === -1) return { name: key, marketplace: "unknown" };
  return { name: key.slice(0, idx), marketplace: key.slice(idx + 1) };
}

/** Stable identity for a hook entry, used to dedupe exact duplicates (e.g. the same
 *  hook appearing in both settings.json and settings.local.json). `command` wins over
 *  `commandWindows` so a win32-only variant of an otherwise-identical hook does not
 *  produce a distinct signature. */
export function hookSignature(
  event: string,
  matcher: string | undefined,
  hook: { command?: string; commandWindows?: string; type?: string }
): string {
  const cmd = hook.command ?? hook.commandWindows ?? "";
  return `${event}|${matcher ?? "*"}|${cmd}`;
}

/** Returns sorted key names only for a plain object (never values) — used so MCP
 *  server `env` blocks can be shown in the hub without ever exposing secrets. */
export function redactEnv(env: unknown): string[] {
  if (env === null || typeof env !== "object" || Array.isArray(env)) return [];
  return Object.keys(env as Record<string, unknown>).sort();
}

export function scopeKey(scope: HubScope): string {
  switch (scope.kind) {
    case "user":
      return "user";
    case "project":
      return `project:${projectKey(scope.path)}`;
    case "plugin":
      return `plugin:${scope.marketplace}/${scope.plugin}`;
    case "inline":
      return `inline:${scope.plugin}`;
    default:
      return scope satisfies never;
  }
}

export function makeItemId(type: HubType, scope: HubScope, name: string): string {
  return `${type}:${scopeKey(scope)}:${name}`;
}
