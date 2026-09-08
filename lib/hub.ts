import "server-only";
import { readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, isAbsolute, join, posix as pathPosix } from "node:path";
import { normalizePath } from "./ingest";
import { getProjects } from "./queries";
import {
  type Hub,
  type HubItem,
  type HubScope,
  type HubState,
  type HubType,
  type HubWarning,
  hookSignature,
  makeItemId,
  parseFrontmatter,
  parseTomlCommand,
  pluginKey,
  projectKey,
  redactEnv,
  scopeKey,
} from "./hub-parse";

// Reads the full Claude Code configuration surface (user + project(s) + plugins) purely
// from disk and assembles it into the shared `Hub` shape. Every fs call below is wrapped
// individually (readJsonSafe/readTextSafe/readdirSafe/statSafe) so a missing or corrupt
// file degrades to "empty" rather than throwing — getHub itself never throws.

export type HubOptions = {
  configDir?: string;
  claudeJsonPath?: string;
  projectPaths?: string[];
};

type HookEntry = {
  type?: string;
  command?: string;
  commandWindows?: string;
  timeout?: number;
  async?: boolean;
  statusMessage?: string;
};
type HookGroup = { matcher?: string; hooks?: HookEntry[] };
type SettingsFile = {
  hooks?: Record<string, HookGroup[]>;
  enabledPlugins?: Record<string, boolean>;
  disableAllHooks?: boolean;
  enabledMcpjsonServers?: string[] | "all";
  disabledMcpjsonServers?: string[] | "all";
  enableAllProjectMcpServers?: boolean;
};
type McpServerDef = {
  type?: string;
  command?: string;
  args?: string[];
  url?: string;
  env?: unknown;
  headers?: unknown;
};
type PluginEntry = { scope?: string; installPath?: string; version?: string; [k: string]: unknown };
type ClaudeProjectEntry = {
  mcpServers?: Record<string, McpServerDef>;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
};
type ClaudeJsonShape = {
  mcpServers?: Record<string, McpServerDef>;
  projects?: Record<string, ClaudeProjectEntry>;
  pluginUsage?: Record<string, unknown>;
  skillUsage?: Record<string, unknown>;
};
type MergedClaudeProject = {
  mcpServers: Record<string, McpServerDef>;
  enabledMcpjsonServers: string[] | "all";
  disabledMcpjsonServers: string[] | "all";
  rawKeys: string[];
};
type HookCandidate = { event: string; matcher?: string; hook: HookEntry; source: string; scope: HubScope };

// ---- guarded I/O ----

async function readJsonSafe<T = unknown>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}
async function readTextSafe(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}
async function readdirSafe(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}
async function statSafe(path: string) {
  try {
    return await stat(path);
  } catch {
    return undefined;
  }
}

// ---- small helpers ----

function setMeta(meta: Record<string, string>, key: string, value: string | null | undefined) {
  if (value != null && value !== "") meta[key] = value;
}

/** Normalizes a `skillUsage`/`pluginUsage` entry, which is a bare number in the /hub
 *  fixtures but `{ usageCount, lastUsedAt }` on a real `.claude.json` — into a string. */
function usageCountOf(entry: unknown): string | undefined {
  if (typeof entry === "number") return String(entry);
  if (entry && typeof entry === "object" && "usageCount" in entry) {
    const v = (entry as { usageCount?: unknown }).usageCount;
    if (typeof v === "number") return String(v);
  }
  return undefined;
}

function buildMcpMeta(server: McpServerDef): Record<string, string> {
  const meta: Record<string, string> = {};
  meta.transport = server.type ?? (server.url ? "http" : "stdio");
  if (server.command) meta.command = [server.command, ...(server.args ?? [])].join(" ");
  else if (server.url) meta.url = server.url;
  setMeta(meta, "envKeys", redactEnv(server.env).join(", "));
  setMeta(meta, "headerKeys", redactEnv(server.headers).join(", "));
  return meta;
}

function collectHooksFromEventsMap(
  eventsMap: Record<string, HookGroup[]> | undefined,
  source: string,
  scope: HubScope,
  out: HookCandidate[]
) {
  if (!eventsMap) return;
  for (const [event, groups] of Object.entries(eventsMap)) {
    if (!Array.isArray(groups)) continue;
    for (const group of groups) {
      if (!group || !Array.isArray(group.hooks)) continue;
      for (const hook of group.hooks) out.push({ event, matcher: group.matcher, hook, source, scope });
    }
  }
}
function collectHooksFromSettings(settings: SettingsFile | undefined, source: string, scope: HubScope, out: HookCandidate[]) {
  collectHooksFromEventsMap(settings?.hooks, source, scope, out);
}

/** Dedupes exact-duplicate hook definitions (same scope + event + matcher + command) into
 *  one item, pushing a `duplicate-hook` warning for each collapsed group. Hook item ids use
 *  the full signature (not just name) because the same event name legitimately appears more
 *  than once per scope (e.g. a "Stop" hook from settings.json and a different "Stop" hook
 *  from settings.local.json) — using name alone would collide two distinct hook items. */
function buildHookItems(candidates: HookCandidate[], disableAllHooks: boolean, warnings: HubWarning[]): HubItem[] {
  const bySig = new Map<string, { candidate: HookCandidate; count: number }>();
  for (const c of candidates) {
    const sig = `${scopeKey(c.scope)}|${hookSignature(c.event, c.matcher, c.hook)}`;
    const existing = bySig.get(sig);
    if (existing) existing.count++;
    else bySig.set(sig, { candidate: c, count: 1 });
  }
  const items: HubItem[] = [];
  const isWin = process.platform === "win32";
  for (const { candidate, count } of bySig.values()) {
    if (count > 1) {
      warnings.push({
        code: "duplicate-hook",
        message: `${candidate.event}${candidate.matcher ? ` (${candidate.matcher})` : ""} hook defined ${count} times`,
        source: candidate.source,
      });
    }
    const command = (isWin && candidate.hook.commandWindows) || candidate.hook.command || candidate.hook.commandWindows || "";
    const name = candidate.matcher ? `${candidate.event} ${candidate.matcher}` : candidate.event;
    const meta: Record<string, string> = { event: candidate.event, matcher: candidate.matcher ?? "*" };
    setMeta(meta, "command", command);
    if (candidate.hook.timeout != null) meta.timeout = String(candidate.hook.timeout);
    if (candidate.hook.async != null) meta.async = String(candidate.hook.async);
    setMeta(meta, "statusMessage", candidate.hook.statusMessage);
    items.push({
      id: `hook:${scopeKey(candidate.scope)}:${hookSignature(candidate.event, candidate.matcher, candidate.hook)}`,
      type: "hook",
      name,
      description: null,
      scope: candidate.scope,
      state: disableAllHooks ? "disabled" : "enabled",
      source: candidate.source,
      meta,
    });
  }
  return items;
}

function unionMcpList(current: string[] | "all", incoming: string[] | undefined): string[] | "all" {
  if (current === "all") return "all";
  if (!incoming || incoming.length === 0) return current;
  if (incoming.includes("all")) return "all";
  return [...new Set([...current, ...incoming])];
}

type McpJsonSource = {
  path: string;
  enabled?: string[] | "all";
  disabled?: string[] | "all";
  enableAll?: boolean;
};
type McpJsonDecisionResult = { state: "enabled" | "disabled" | "pending"; decidedBy?: string };

// ponytail: most-specific-wins; Claude Code's exact merge is undocumented, revisit if a toggle looks ignored
/** Decides a single `.mcp.json` server's approve/reject state by walking `sources` in
 *  most-specific-first order and taking the first one that "names" the server: appears in
 *  either list, or the source sets `enabled === "all"` / `enableAll === true`. Within one
 *  source, an explicit `disabled` mention wins over `enableAll`. No source names it ->
 *  "pending" (caller still owns pushing the mcp-pending warning). */
function decideMcpJson(server: string, sources: McpJsonSource[]): McpJsonDecisionResult {
  for (const src of sources) {
    const disabledNamed = src.disabled === "all" || (Array.isArray(src.disabled) && src.disabled.includes(server));
    if (disabledNamed) return { state: "disabled", decidedBy: src.path };
    const enabledNamed = src.enabled === "all" || (Array.isArray(src.enabled) && src.enabled.includes(server));
    if (enabledNamed || src.enableAll === true) return { state: "enabled", decidedBy: src.path };
  }
  return { state: "pending" };
}

function buildClaudeProjectsMap(
  rawProjects: Record<string, ClaudeProjectEntry> | undefined,
  claudeJsonPath: string,
  warnings: HubWarning[]
): Map<string, MergedClaudeProject> {
  const map = new Map<string, MergedClaudeProject>();
  if (!rawProjects) return map;
  for (const [rawKey, entry] of Object.entries(rawProjects)) {
    const key = projectKey(rawKey);
    let merged = map.get(key);
    if (!merged) {
      merged = { mcpServers: {}, enabledMcpjsonServers: [], disabledMcpjsonServers: [], rawKeys: [] };
      map.set(key, merged);
    }
    merged.rawKeys.push(rawKey);
    Object.assign(merged.mcpServers, entry.mcpServers ?? {});
    merged.enabledMcpjsonServers = unionMcpList(merged.enabledMcpjsonServers, entry.enabledMcpjsonServers);
    merged.disabledMcpjsonServers = unionMcpList(merged.disabledMcpjsonServers, entry.disabledMcpjsonServers);
  }
  for (const merged of map.values()) {
    if (merged.rawKeys.length > 1) {
      warnings.push({
        code: "unnormalized-project-key",
        message: `Project has ${merged.rawKeys.length} differing keys in .claude.json: ${merged.rawKeys.join(", ")}`,
        source: claudeJsonPath,
      });
    }
  }
  return map;
}

/** Enumerates `skills/*\/SKILL.md`, `agents/*.md`, `commands/*.{md,toml}` directly under
 *  `rootDir` (used for both the user's configDir and each project's `.claude/`), pushing
 *  one HubItem per file found. */
async function collectSkillsAgentsCommands(
  rootDir: string,
  scope: HubScope,
  skillUsage: Record<string, unknown>,
  items: HubItem[]
) {
  for (const d of (await readdirSafe(join(rootDir, "skills"))).filter((e) => e.isDirectory())) {
    const skillPath = join(rootDir, "skills", d.name, "SKILL.md");
    const text = await readTextSafe(skillPath);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    const name = fm.name ?? d.name;
    const meta: Record<string, string> = {};
    setMeta(meta, "version", fm.version);
    setMeta(meta, "usageCount", usageCountOf(skillUsage[name]));
    if (fm.userInvocable != null) meta.userInvocable = String(fm.userInvocable);
    items.push({ id: makeItemId("skill", scope, name), type: "skill", name, description: fm.description, scope, state: "enabled", source: skillPath, meta });
  }
  for (const f of (await readdirSafe(join(rootDir, "agents"))).filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".md")) {
    const filePath = join(rootDir, "agents", f.name);
    const text = await readTextSafe(filePath);
    if (text == null) continue;
    const fm = parseFrontmatter(text);
    const name = fm.name ?? f.name.slice(0, -3);
    const meta: Record<string, string> = {};
    setMeta(meta, "model", fm.model);
    setMeta(meta, "tools", fm.tools);
    items.push({ id: makeItemId("agent", scope, name), type: "agent", name, description: fm.description, scope, state: "enabled", source: filePath, meta });
  }
  for (const f of (await readdirSafe(join(rootDir, "commands"))).filter((e) => e.isFile())) {
    const ext = extname(f.name).toLowerCase();
    if (ext !== ".md" && ext !== ".toml") continue;
    const filePath = join(rootDir, "commands", f.name);
    const text = await readTextSafe(filePath);
    if (text == null) continue;
    const baseNoExt = f.name.slice(0, -ext.length);
    let description: string | null = null;
    let fmName: string | null = null;
    if (ext === ".toml") {
      description = parseTomlCommand(text).description;
    } else {
      const fm = parseFrontmatter(text);
      description = fm.description;
      fmName = fm.name;
    }
    const name = fmName ?? baseNoExt;
    items.push({
      id: makeItemId("command", scope, name),
      type: "command",
      name,
      description,
      scope,
      state: "enabled",
      source: filePath,
      meta: { format: ext === ".toml" ? "toml" : "md" },
    });
  }
}

export async function getHub(opts: HubOptions = {}): Promise<Hub> {
  const configDir = opts.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const claudeJsonPath = opts.claudeJsonPath ?? join(homedir(), ".claude.json");
  const rawProjectPaths = opts.projectPaths ?? [];

  const items: HubItem[] = [];
  const warnings: HubWarning[] = [];
  const hookCandidates: HookCandidate[] = [];

  // ---- user settings ----
  const userSettingsPath = join(configDir, "settings.json");
  const userLocalSettingsPath = join(configDir, "settings.local.json");
  const userBase = await readJsonSafe<SettingsFile>(userSettingsPath);
  const userLocal = await readJsonSafe<SettingsFile>(userLocalSettingsPath);
  const mergedUserEnabledPlugins: Record<string, boolean> = {
    ...(userBase?.enabledPlugins ?? {}),
    ...(userLocal?.enabledPlugins ?? {}),
  };
  const disableAllHooks = userBase?.disableAllHooks === true || userLocal?.disableAllHooks === true;
  collectHooksFromSettings(userBase, userSettingsPath, { kind: "user" }, hookCandidates);
  collectHooksFromSettings(userLocal, userLocalSettingsPath, { kind: "user" }, hookCandidates);

  // ---- resolve + dedupe project paths ----
  // A project whose `.claude` dir IS the user's configDir (e.g. a project path of the
  // user's home directory) is not a distinct project scope: every file under it would be
  // the same file already read as user scope. Drop it here, at the single resolution
  // point, so every downstream reader (settings, hooks, skills/agents/commands, .mcp.json,
  // .claude.json project lookup) skips it for free. It's not "missing" — it exists on
  // disk — so no missing-project warning either.
  const configDirKey = projectKey(configDir);
  const seenProjectKeys = new Map<string, string>();
  for (const raw of rawProjectPaths) {
    const key = projectKey(raw);
    if (!seenProjectKeys.has(key)) seenProjectKeys.set(key, raw);
  }
  const projects: { path: string; name: string }[] = [];
  for (const raw of seenProjectKeys.values()) {
    if (projectKey(join(raw, ".claude")) === configDirKey) continue;
    const st = await statSafe(raw);
    if (!st || !st.isDirectory()) {
      warnings.push({ code: "missing-project", message: `Project path does not exist: ${raw}`, source: raw });
      continue;
    }
    projects.push({ path: raw, name: pathPosix.basename(normalizePath(raw)) });
  }

  // ---- per-project settings: hooks + enabledPlugins overrides ----
  const pluginOverridesByPlugin = new Map<string, { project: string; value: boolean }[]>();
  // Keyed by project.path (not projectKey) since every downstream consumer below iterates
  // the same `projects` array and already has the raw path in hand.
  const projectSettingsMap = new Map<string, { base?: SettingsFile; local?: SettingsFile }>();
  for (const project of projects) {
    const baseP = join(project.path, ".claude", "settings.json");
    const localP = join(project.path, ".claude", "settings.local.json");
    const base = await readJsonSafe<SettingsFile>(baseP);
    const local = await readJsonSafe<SettingsFile>(localP);
    projectSettingsMap.set(project.path, { base, local });
    const scope: HubScope = { kind: "project", path: project.path, name: project.name };
    collectHooksFromSettings(base, baseP, scope, hookCandidates);
    collectHooksFromSettings(local, localP, scope, hookCandidates);
    const merged = { ...(base?.enabledPlugins ?? {}), ...(local?.enabledPlugins ?? {}) };
    for (const [pk, value] of Object.entries(merged)) {
      const arr = pluginOverridesByPlugin.get(pk) ?? [];
      arr.push({ project: project.name, value });
      pluginOverridesByPlugin.set(pk, arr);
    }
  }

  // ---- .claude.json: only mcpServers, projects, pluginUsage, skillUsage ----
  const claudeJsonRaw = await readJsonSafe<ClaudeJsonShape>(claudeJsonPath);
  const claudeMcpServers = claudeJsonRaw?.mcpServers ?? {};
  const pluginUsage = claudeJsonRaw?.pluginUsage ?? {};
  const skillUsage = claudeJsonRaw?.skillUsage ?? {};
  const claudeProjectsMap = buildClaudeProjectsMap(claudeJsonRaw?.projects, claudeJsonPath, warnings);

  // ---- installed plugins ----
  const installedPluginsPath = join(configDir, "plugins", "installed_plugins.json");
  const installedPlugins = await readJsonSafe<{ plugins?: Record<string, PluginEntry[]> }>(installedPluginsPath);
  const pluginsMap = installedPlugins?.plugins ?? {};
  const handledPluginKeys = new Set<string>();

  for (const [pluginKeyStr, entries] of Object.entries(pluginsMap)) {
    handledPluginKeys.add(pluginKeyStr);
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const { name: pluginName, marketplace } = pluginKey(pluginKeyStr);
    const primaryEntry = entries[0];
    const rawInstallPath = primaryEntry.installPath ?? "";
    // installPath is absolute on a real machine; fixtures use a path relative to
    // <configDir>/plugins so the fixture tree stays portable across checkouts.
    const resolvedInstallPath = rawInstallPath
      ? isAbsolute(rawInstallPath)
        ? rawInstallPath
        : join(configDir, "plugins", rawInstallPath)
      : "";
    const installStat = resolvedInstallPath ? await statSafe(resolvedInstallPath) : undefined;
    const installExists = !!installStat?.isDirectory();
    const scope: HubScope = { kind: "plugin", plugin: pluginName, marketplace };

    let state: HubState;
    if (!installExists) {
      state = "stale";
      warnings.push({
        code: "stale-plugin",
        message: `${pluginKeyStr}: installPath not found on disk${resolvedInstallPath ? ` (${resolvedInstallPath})` : ""}`,
        source: resolvedInstallPath || installedPluginsPath,
      });
    } else {
      state = mergedUserEnabledPlugins[pluginKeyStr] === true ? "enabled" : "disabled";
    }

    let skillCount = 0;
    let commandCount = 0;
    let mcpCount = 0;
    let hooksFileCount = 0;
    const pluginJsonPath = join(resolvedInstallPath, ".claude-plugin", "plugin.json");

    if (installExists) {
      for (const d of (await readdirSafe(join(resolvedInstallPath, "skills"))).filter((e) => e.isDirectory())) {
        const skillPath = join(resolvedInstallPath, "skills", d.name, "SKILL.md");
        const text = await readTextSafe(skillPath);
        if (text == null) continue;
        const fm = parseFrontmatter(text);
        const baseName = fm.name ?? d.name;
        const itemName = `${pluginName}:${baseName}`;
        const meta: Record<string, string> = {};
        setMeta(meta, "version", fm.version);
        setMeta(meta, "usageCount", usageCountOf(skillUsage[`${pluginName}:${baseName}`]));
        if (fm.userInvocable != null) meta.userInvocable = String(fm.userInvocable);
        items.push({ id: makeItemId("skill", scope, itemName), type: "skill", name: itemName, description: fm.description, scope, state, source: skillPath, meta });
        skillCount++;
      }
      for (const f of (await readdirSafe(join(resolvedInstallPath, "commands"))).filter((e) => e.isFile())) {
        const ext = extname(f.name).toLowerCase();
        if (ext !== ".md" && ext !== ".toml") continue;
        const filePath = join(resolvedInstallPath, "commands", f.name);
        const text = await readTextSafe(filePath);
        if (text == null) continue;
        const baseNoExt = f.name.slice(0, -ext.length);
        let description: string | null = null;
        let fmName: string | null = null;
        if (ext === ".toml") {
          description = parseTomlCommand(text).description;
        } else {
          const fm = parseFrontmatter(text);
          description = fm.description;
          fmName = fm.name;
        }
        const itemName = `${pluginName}:${fmName ?? baseNoExt}`;
        items.push({
          id: makeItemId("command", scope, itemName),
          type: "command",
          name: itemName,
          description,
          scope,
          state,
          source: filePath,
          meta: { format: ext === ".toml" ? "toml" : "md" },
        });
        commandCount++;
      }
      for (const f of (await readdirSafe(join(resolvedInstallPath, "agents"))).filter((e) => e.isFile() && extname(e.name).toLowerCase() === ".md")) {
        const filePath = join(resolvedInstallPath, "agents", f.name);
        const text = await readTextSafe(filePath);
        if (text == null) continue;
        const fm = parseFrontmatter(text);
        const itemName = `${pluginName}:${fm.name ?? f.name.slice(0, -3)}`;
        const meta: Record<string, string> = {};
        setMeta(meta, "model", fm.model);
        setMeta(meta, "tools", fm.tools);
        items.push({ id: makeItemId("agent", scope, itemName), type: "agent", name: itemName, description: fm.description, scope, state, source: filePath, meta });
      }

      const pluginJson = await readJsonSafe<{ hooks?: string; mcpServers?: Record<string, McpServerDef> }>(pluginJsonPath);
      const hooksRel = pluginJson?.hooks ?? "hooks/hooks.json";
      const hooksAbs = join(resolvedInstallPath, hooksRel);
      const hooksRaw = await readJsonSafe<Record<string, unknown>>(hooksAbs);
      if (hooksRaw) {
        const eventsMap = (
          hooksRaw.hooks && typeof hooksRaw.hooks === "object" ? hooksRaw.hooks : hooksRaw
        ) as Record<string, HookGroup[]>;
        const before = hookCandidates.length;
        collectHooksFromEventsMap(eventsMap, hooksAbs, scope, hookCandidates);
        if (hookCandidates.length > before) hooksFileCount = 1;
      }

      const mcpJson = await readJsonSafe<{ mcpServers?: Record<string, McpServerDef> }>(join(resolvedInstallPath, ".mcp.json"));
      const pluginServers: Record<string, McpServerDef> = { ...(pluginJson?.mcpServers ?? {}), ...(mcpJson?.mcpServers ?? {}) };
      const mcpSourcePath = mcpJson?.mcpServers ? join(resolvedInstallPath, ".mcp.json") : pluginJsonPath;
      for (const [serverName, server] of Object.entries(pluginServers)) {
        const itemName = `plugin:${pluginName}:${serverName}`;
        items.push({ id: makeItemId("mcp", scope, itemName), type: "mcp", name: itemName, description: null, scope, state, source: mcpSourcePath, meta: buildMcpMeta(server) });
        mcpCount++;
      }
    }

    const pluginMeta: Record<string, string> = { marketplace };
    setMeta(pluginMeta, "installPath", resolvedInstallPath);
    setMeta(pluginMeta, "version", primaryEntry.version);
    setMeta(
      pluginMeta,
      "installScope",
      entries
        .map((e) => e.scope)
        .filter((s): s is string => Boolean(s))
        .join(", ")
    );
    setMeta(pluginMeta, "usageCount", usageCountOf(pluginUsage[pluginKeyStr]));
    setMeta(
      pluginMeta,
      "overrides",
      (pluginOverridesByPlugin.get(pluginKeyStr) ?? []).map((o) => `${o.project}:${o.value}`).join(", ")
    );
    pluginMeta.components = `${skillCount} skills, ${commandCount} commands, ${hooksFileCount} hooks file, ${mcpCount} mcp`;
    items.push({ id: makeItemId("plugin", scope, pluginName), type: "plugin", name: pluginName, description: null, scope, state, source: installedPluginsPath, meta: pluginMeta });
  }

  // plugins referenced in enabledPlugins but never installed
  for (const key of Object.keys(mergedUserEnabledPlugins)) {
    if (handledPluginKeys.has(key) || key.endsWith("@inline")) continue;
    const { name, marketplace } = pluginKey(key);
    const scope: HubScope = { kind: "plugin", plugin: name, marketplace };
    warnings.push({ code: "stale-plugin", message: `${key}: referenced in enabledPlugins but not found in installed_plugins.json`, source: installedPluginsPath });
    items.push({ id: makeItemId("plugin", scope, name), type: "plugin", name, description: null, scope, state: "stale", source: userSettingsPath, meta: { marketplace } });
  }

  // inline plugins: bundled with the CLI, never on disk
  for (const key of Object.keys(pluginUsage)) {
    if (!key.endsWith("@inline")) continue;
    const { name } = pluginKey(key);
    const scope: HubScope = { kind: "inline", plugin: name };
    const meta: Record<string, string> = { components: "bundled, not enumerable on disk" };
    setMeta(meta, "usageCount", usageCountOf(pluginUsage[key]));
    items.push({ id: makeItemId("plugin", scope, name), type: "plugin", name, description: null, scope, state: "enabled", source: claudeJsonPath, meta });
  }

  // ---- user + project skills/agents/commands ----
  await collectSkillsAgentsCommands(configDir, { kind: "user" }, skillUsage, items);
  for (const project of projects) {
    await collectSkillsAgentsCommands(join(project.path, ".claude"), { kind: "project", path: project.path, name: project.name }, skillUsage, items);
  }

  // ---- mcp: user scope ----
  for (const [name, server] of Object.entries(claudeMcpServers)) {
    const scope: HubScope = { kind: "user" };
    items.push({ id: makeItemId("mcp", scope, name), type: "mcp", name, description: null, scope, state: "enabled", source: claudeJsonPath, meta: buildMcpMeta(server) });
  }

  // ---- mcp: project .mcp.json (state via enabledMcpjsonServers/disabledMcpjsonServers) ----
  for (const project of projects) {
    const mcpJsonPath = join(project.path, ".mcp.json");
    const mcpJson = await readJsonSafe<{ mcpServers?: Record<string, McpServerDef> }>(mcpJsonPath);
    if (!mcpJson?.mcpServers) continue;
    const scope: HubScope = { kind: "project", path: project.path, name: project.name };
    const claudeProj = claudeProjectsMap.get(projectKey(project.path));
    const projSettings = projectSettingsMap.get(project.path);
    // Most-specific-first: project settings.local.json, project settings.json, user
    // settings.local.json, user settings.json, then the .claude.json project entry.
    const sources: McpJsonSource[] = [
      {
        path: join(project.path, ".claude", "settings.local.json"),
        enabled: projSettings?.local?.enabledMcpjsonServers,
        disabled: projSettings?.local?.disabledMcpjsonServers,
        enableAll: projSettings?.local?.enableAllProjectMcpServers,
      },
      {
        path: join(project.path, ".claude", "settings.json"),
        enabled: projSettings?.base?.enabledMcpjsonServers,
        disabled: projSettings?.base?.disabledMcpjsonServers,
        enableAll: projSettings?.base?.enableAllProjectMcpServers,
      },
      {
        path: userLocalSettingsPath,
        enabled: userLocal?.enabledMcpjsonServers,
        disabled: userLocal?.disabledMcpjsonServers,
        enableAll: userLocal?.enableAllProjectMcpServers,
      },
      {
        path: userSettingsPath,
        enabled: userBase?.enabledMcpjsonServers,
        disabled: userBase?.disabledMcpjsonServers,
        enableAll: userBase?.enableAllProjectMcpServers,
      },
      {
        path: claudeJsonPath,
        enabled: claudeProj?.enabledMcpjsonServers,
        disabled: claudeProj?.disabledMcpjsonServers,
      },
    ];
    for (const [name, server] of Object.entries(mcpJson.mcpServers)) {
      const decision = decideMcpJson(name, sources);
      const meta = buildMcpMeta(server);
      if (decision.state === "pending") {
        warnings.push({ code: "mcp-pending", message: `${name} (${project.name}) is not approved or rejected`, source: mcpJsonPath });
      } else if (decision.decidedBy) {
        meta.decidedBy = decision.decidedBy;
      }
      items.push({ id: makeItemId("mcp", scope, name), type: "mcp", name, description: null, scope, state: decision.state, source: mcpJsonPath, meta });
    }
  }

  // ---- mcp: project-local (from .claude.json projects[key].mcpServers) ----
  for (const project of projects) {
    const claudeProj = claudeProjectsMap.get(projectKey(project.path));
    if (!claudeProj || Object.keys(claudeProj.mcpServers).length === 0) continue;
    const scope: HubScope = { kind: "project", path: project.path, name: project.name };
    for (const [name, server] of Object.entries(claudeProj.mcpServers)) {
      const meta = buildMcpMeta(server);
      meta.local = "true";
      // id gets a ":local" suffix (not the display name) because the same server name can
      // also appear in this project's .mcp.json — same type/scope/name would otherwise collide.
      items.push({ id: `${makeItemId("mcp", scope, name)}:local`, type: "mcp", name, description: null, scope, state: "enabled", source: claudeJsonPath, meta });
    }
  }

  // ---- hooks (deduped) ----
  items.push(...buildHookItems(hookCandidates, disableAllHooks, warnings));

  // ---- sort: type, then scope, then name ----
  const typeOrder: HubType[] = ["plugin", "mcp", "skill", "command", "agent", "hook"];
  const scopeOrder = ["user", "project", "plugin", "inline"];
  items.sort((a, b) => {
    const t = typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
    if (t !== 0) return t;
    const s = scopeOrder.indexOf(a.scope.kind) - scopeOrder.indexOf(b.scope.kind);
    if (s !== 0) return s;
    return a.name.localeCompare(b.name);
  });

  return {
    items,
    warnings,
    generatedAt: new Date().toISOString(),
    projectsScanned: projects.map((p) => p.path),
    configDir,
  };
}

/** The `projectPaths` getHub() needs to scan every known project: every project the DB
 *  knows about, plus the current working directory (so /hub always covers "this repo"
 *  even when it isn't itself a tracked project), deduped. This is the one DB touch in the
 *  module — getHub itself stays pure/fs-only; callers (the /hub page, the toggle API
 *  route) call this first and pass the result in. */
export async function hubProjectPaths(): Promise<string[]> {
  const projects = await getProjects();
  return Array.from(new Set([...(projects ?? []).map((p) => p.path), process.cwd()]));
}
