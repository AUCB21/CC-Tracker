import "server-only";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { projectKey } from "./hub-parse";

// Mutating counterpart to lib/hub.ts (which is read-only). Every export here degrades to
// `{ ok: false, error }` instead of throwing, and every write goes through a backup +
// atomic-rename so a crash mid-write never leaves a half-written settings file. Never
// touches ~/.claude.json (see plan: no flag exists there, and it carries OAuth tokens).

const execFileAsync = promisify(execFile);

export type WriteResult = { ok: true; file: string; backup: string | null } | { ok: false; error: string };

export const BACKUP_DIR = join(homedir(), ".cc-track", "backups");

function backupSlug(path: string): string {
  return projectKey(path).replace(/[^a-z0-9]+/g, "-");
}

/** Copies `path` into `<backupDir>/<slug>.<ISO timestamp>.json` (slug derived from `path`
 *  via projectKey), then prunes that slug's backups down to the 10 most recent (ISO
 *  timestamps sort lexicographically, so a plain name sort is enough). Returns the backup
 *  path, or null if `path` did not exist (nothing to back up). */
export async function backupFile(path: string, backupDir: string = BACKUP_DIR): Promise<string | null> {
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch {
    return null;
  }

  await mkdir(backupDir, { recursive: true });
  const slug = backupSlug(path);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(backupDir, `${slug}.${ts}.json`);
  await writeFile(backupPath, content, "utf8");

  let entries: string[];
  try {
    entries = await readdir(backupDir);
  } catch {
    entries = [];
  }
  const prefix = `${slug}.`;
  const forSlug = entries.filter((e) => e.startsWith(prefix) && e.endsWith(".json")).sort();
  const stale = forSlug.slice(0, Math.max(0, forSlug.length - 10));
  for (const name of stale) {
    try {
      await unlink(join(backupDir, name));
    } catch {
      // best-effort pruning; a leftover old backup is not worth failing the write for
    }
  }

  return backupPath;
}

/** Reads `path` as JSON, backs it up, applies `mutate` to a deep clone, then writes the
 *  result atomically (tmp file + rename). `mutate` may either return the new object or
 *  mutate its argument in place and return nothing. Refuses to overwrite a file that
 *  exists but fails to parse as JSON. */
export async function updateJsonFile<T extends object>(
  path: string,
  mutate: (current: T) => T | void,
  opts?: { backupDir?: string; createIfMissing?: boolean }
): Promise<WriteResult> {
  const backupDir = opts?.backupDir ?? BACKUP_DIR;
  let current: T;
  let existed = true;
  try {
    const raw = await readFile(path, "utf8");
    try {
      current = JSON.parse(raw) as T;
    } catch {
      return { ok: false, error: `invalid JSON in ${path}, refusing to overwrite` };
    }
  } catch {
    existed = false;
    if (!opts?.createIfMissing) return { ok: false, error: `file not found: ${path}` };
    current = {} as T;
  }

  let backup: string | null = null;
  if (existed) {
    try {
      backup = await backupFile(path, backupDir);
    } catch (err) {
      return { ok: false, error: `backup failed: ${errorMessage(err)}` };
    }
  }

  const draft = structuredClone(current);
  const result = mutate(draft);
  const next = result === undefined ? draft : result;
  const text = `${JSON.stringify(next, null, 2)}\n`;

  try {
    if (opts?.createIfMissing) await mkdir(dirname(path), { recursive: true });
    const tmpPath = `${path}.tmp-${process.pid}`;
    await writeFile(tmpPath, text, "utf8");
    await rename(tmpPath, path);
  } catch (err) {
    return { ok: false, error: `write failed: ${errorMessage(err)}` };
  }

  return { ok: true, file: path, backup };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function trim300(s: string): string {
  return s.length > 300 ? s.slice(0, 300) : s;
}

/** Resolves the `claude` CLI binary to invoke: `CLAUDE_BIN` env var wins; otherwise the
 *  native win32 install at `~/.local/bin/claude.exe` if it exists on disk; otherwise the
 *  bare `"claude"` (resolved via PATH by the shell/execFile). */
export function resolveClaudeBin(env: NodeJS.ProcessEnv = process.env): string {
  const fromEnv = env.CLAUDE_BIN;
  if (fromEnv) return fromEnv;
  if (process.platform === "win32") {
    const candidate = join(homedir(), ".local", "bin", "claude.exe");
    if (existsSync(candidate)) return candidate;
  } else {
    const candidate = join(homedir(), ".local", "bin", "claude");
    if (existsSync(candidate)) return candidate;
  }
  return "claude";
}

/** Enables or disables an installed plugin at user scope via the `claude` CLI (the
 *  supported, versioned interface — see plan: never edit `enabledPlugins` by hand), then
 *  re-reads `settings.json` to confirm the CLI actually applied the change before
 *  reporting success. */
export async function setPluginEnabled(
  pluginKey: string,
  enabled: boolean,
  opts?: { configDir?: string; backupDir?: string; claudeBin?: string | string[]; timeoutMs?: number }
): Promise<WriteResult & { stdout?: string }> {
  const configDir = opts?.configDir ?? process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const backupDir = opts?.backupDir ?? BACKUP_DIR;
  const settingsPath = join(configDir, "settings.json");
  const timeout = opts?.timeoutMs ?? 20000;

  let backup: string | null;
  try {
    backup = await backupFile(settingsPath, backupDir);
  } catch (err) {
    return { ok: false, error: `backup failed: ${errorMessage(err)}` };
  }

  const claudeBin = opts?.claudeBin ?? resolveClaudeBin();
  const [bin, ...prefixArgs] = Array.isArray(claudeBin) ? claudeBin : [claudeBin];
  const args = [...prefixArgs, "plugin", enabled ? "enable" : "disable", pluginKey, "-s", "user"];

  let stdout = "";
  try {
    const res = await execFileAsync(bin, args, {
      timeout,
      windowsHide: true,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, CLAUDE_CONFIG_DIR: configDir },
    });
    stdout = res.stdout;
  } catch (err) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const detail = e.stderr?.trim() || e.stdout?.trim() || e.message || String(err);
    return { ok: false, error: trim300(detail) };
  }

  const settings = await readJsonQuiet<{ enabledPlugins?: Record<string, boolean> }>(settingsPath);
  if (settings?.enabledPlugins?.[pluginKey] !== enabled) {
    return { ok: false, error: "cli ran but settings.json does not reflect the change", stdout: trim300(stdout) };
  }

  return { ok: true, file: settingsPath, backup, stdout: trim300(stdout) };
}

async function readJsonQuiet<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return undefined;
  }
}

export type McpJsonDecision = "enabled" | "disabled" | "clear";

type ProjectLocalSettings = {
  enabledMcpjsonServers?: string[] | "all";
  disabledMcpjsonServers?: string[] | "all";
  [k: string]: unknown;
};

/** Approves, rejects, or clears one server's decision in a project's
 *  `.claude/settings.local.json` by moving `server` between `enabledMcpjsonServers` and
 *  `disabledMcpjsonServers`. Refuses (without writing) if either list is currently the
 *  string `"all"` — that's a documented settings value this function does not know how to
 *  partially edit. */
export async function setMcpJsonDecision(
  projectPath: string,
  server: string,
  decision: McpJsonDecision,
  opts?: { backupDir?: string }
): Promise<WriteResult> {
  const path = join(projectPath, ".claude", "settings.local.json");

  // Pre-check for the "all" case so we can refuse without writing, per contract, rather
  // than let updateJsonFile silently no-op inside its mutate callback.
  const existing = await readJsonQuiet<ProjectLocalSettings>(path);
  if (existing?.enabledMcpjsonServers === "all" || existing?.disabledMcpjsonServers === "all") {
    return { ok: false, error: `list is 'all' in ${path}, edit manually` };
  }

  return updateJsonFile<ProjectLocalSettings>(
    path,
    (current) => {
      const enabled = (Array.isArray(current.enabledMcpjsonServers) ? current.enabledMcpjsonServers : []).filter(
        (s) => s !== server
      );
      const disabled = (Array.isArray(current.disabledMcpjsonServers) ? current.disabledMcpjsonServers : []).filter(
        (s) => s !== server
      );
      if (decision === "enabled") enabled.push(server);
      else if (decision === "disabled") disabled.push(server);

      const next: ProjectLocalSettings = { ...current };
      if (enabled.length > 0) next.enabledMcpjsonServers = enabled;
      else delete next.enabledMcpjsonServers;
      if (disabled.length > 0) next.disabledMcpjsonServers = disabled;
      else delete next.disabledMcpjsonServers;
      return next;
    },
    { backupDir: opts?.backupDir, createIfMissing: true }
  );
}
