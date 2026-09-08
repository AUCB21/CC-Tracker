// Exercises lib/hub-write.ts against temp dirs (mkdtemp) and the fake CLI binary at
// tests/fixtures/hub/fake-claude.mjs. Never touches the real ~/.claude or the real claude
// binary — see lib/hub.ts's "server-only" stub trick, reused here so this runs as a plain
// script: `import "server-only"` compiles (via tsx) to a CJS `require("server-only")`,
// and patching Module._load before the dynamic import below swaps it for an empty module.
// Run: npx tsx tests/hub-write.test.mts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import Module from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

type ModuleLoad = (request: string, parent: unknown, isMain: boolean) => unknown;
const moduleWithLoad = Module as unknown as { _load: ModuleLoad };
const originalLoad = moduleWithLoad._load;
moduleWithLoad._load = function (request: string, parent: unknown, isMain: boolean) {
  if (request === "server-only" || /[\\/]server-only([\\/]index\.js)?$/.test(request)) return {};
  return originalLoad.call(this, request, parent, isMain);
};

const { backupFile, resolveClaudeBin, setMcpJsonDecision, setPluginEnabled, updateJsonFile, BACKUP_DIR } =
  (await import("../lib/hub-write.ts")) as typeof import("../lib/hub-write.ts");

const fakeClaudePath = join(import.meta.dirname, "fixtures", "hub", "fake-claude.mjs");

async function withTmpDir<T>(prefix: string, fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// ---- resolveClaudeBin ----
{
  assert.equal(resolveClaudeBin({ CLAUDE_BIN: "custom-claude" } as NodeJS.ProcessEnv), "custom-claude");
  // Without CLAUDE_BIN, resolveClaudeBin looks at ~/.local/bin/claude(.exe) on disk — which
  // this machine actually has (a real native install), so the honest expectation here is
  // "whatever that lookup would independently produce", not a hardcoded "claude". This
  // still exercises the env-var-absent code path; the "no local install found -> 'claude'"
  // branch is covered structurally by reading the source, not re-derivable without an
  // injectable homedir().
  const { existsSync } = await import("node:fs");
  const { homedir } = await import("node:os");
  const expected =
    process.platform === "win32"
      ? existsSync(join(homedir(), ".local", "bin", "claude.exe"))
        ? join(homedir(), ".local", "bin", "claude.exe")
        : "claude"
      : existsSync(join(homedir(), ".local", "bin", "claude"))
        ? join(homedir(), ".local", "bin", "claude")
        : "claude";
  assert.equal(resolveClaudeBin({} as NodeJS.ProcessEnv), expected);
}

// ---- backupFile: nonexistent file -> null ----
await withTmpDir("hub-write-backup-missing-", async (dir) => {
  const result = await backupFile(join(dir, "nope.json"), join(dir, "backups"));
  assert.equal(result, null);
});

// ---- backupFile: 12 backups in a row keep only the newest 10 ----
await withTmpDir("hub-write-backup-prune-", async (dir) => {
  const target = join(dir, "settings.json");
  const backupDir = join(dir, "backups");
  const paths: string[] = [];
  for (let i = 0; i < 12; i++) {
    await writeFile(target, JSON.stringify({ n: i }), "utf8");
    const p = await backupFile(target, backupDir);
    assert.ok(p, `backup ${i} should not be null`);
    if (p) paths.push(p);
    // ISO timestamps only change per-millisecond; without this the slug+timestamp name can
    // collide within the same tick and prune the wrong count.
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  const entries = await readdir(backupDir);
  assert.equal(entries.length, 10, `backup file count: ${entries.length}`);
  // the 10 remaining must be the 10 most recent (last 10 of the 12 we made)
  const remaining = new Set(entries.map((e) => join(backupDir, e)));
  for (const p of paths.slice(-10)) assert.ok(remaining.has(p), `expected newest backup kept: ${p}`);
  for (const p of paths.slice(0, 2)) assert.ok(!remaining.has(p), `expected oldest backup pruned: ${p}`);
});

// ---- updateJsonFile: invalid JSON -> error, file left intact ----
await withTmpDir("hub-write-update-invalid-", async (dir) => {
  const target = join(dir, "settings.json");
  await writeFile(target, "{ not valid json", "utf8");
  const result = await updateJsonFile(target, (c: Record<string, unknown>) => c, { backupDir: join(dir, "backups") });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /invalid JSON/);
  assert.equal(await readFile(target, "utf8"), "{ not valid json");
});

// ---- setPluginEnabled: success reflects the change and produces a backup ----
await withTmpDir("hub-write-plugin-ok-", async (dir) => {
  const configDir = join(dir, "config");
  const backupDir = join(dir, "backups");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "settings.json"), JSON.stringify({ enabledPlugins: { "other@mk": true } }), "utf8");

  const result = await setPluginEnabled("demo@mk", true, {
    configDir,
    backupDir,
    claudeBin: [process.execPath, fakeClaudePath],
  });
  assert.equal(result.ok, true, `expected ok, got: ${JSON.stringify(result)}`);
  if (result.ok) {
    assert.equal(result.file, join(configDir, "settings.json"));
    assert.ok(result.backup, "expected a backup path");
  }
  const settings = JSON.parse(await readFile(join(configDir, "settings.json"), "utf8"));
  assert.equal(settings.enabledPlugins["demo@mk"], true);
  assert.equal(settings.enabledPlugins["other@mk"], true, "unrelated key preserved");
});

// setPluginEnabled always forwards the parent's full env to the child, so scenario env
// vars (FAKE_CLAUDE_FAIL etc.) must be set on this process before calling it, then
// cleared after — the fake binary reads them straight off process.env.
async function withFakeClaudeEnv<T>(vars: Record<string, string>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) prev[k] = process.env[k];
  Object.assign(process.env, vars);
  try {
    return await fn();
  } finally {
    for (const k of Object.keys(vars)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

await withTmpDir("hub-write-plugin-fail2-", async (dir) => {
  const configDir = join(dir, "config");
  await mkdir(configDir, { recursive: true });
  await withFakeClaudeEnv({ FAKE_CLAUDE_FAIL: "1" }, async () => {
    const result = await setPluginEnabled("demo@mk", true, {
      configDir,
      backupDir: join(dir, "backups"),
      claudeBin: [process.execPath, fakeClaudePath],
    });
    assert.equal(result.ok, false, `expected failure, got: ${JSON.stringify(result)}`);
    if (!result.ok) assert.match(result.error, /simulated failure/);
  });
});

// ---- setPluginEnabled: CLI "succeeds" but doesn't actually flip the flag -> ok:false ----
await withTmpDir("hub-write-plugin-noop-", async (dir) => {
  const configDir = join(dir, "config");
  await mkdir(configDir, { recursive: true });
  await writeFile(join(configDir, "settings.json"), JSON.stringify({ enabledPlugins: {} }), "utf8");
  await withFakeClaudeEnv({ FAKE_CLAUDE_NOOP: "1" }, async () => {
    const result = await setPluginEnabled("demo@mk", true, {
      configDir,
      backupDir: join(dir, "backups"),
      claudeBin: [process.execPath, fakeClaudePath],
    });
    assert.equal(result.ok, false, `expected failure, got: ${JSON.stringify(result)}`);
    if (!result.ok) assert.match(result.error, /does not reflect/);
  });
});

// ---- setPluginEnabled: timeout ----
await withTmpDir("hub-write-plugin-timeout-", async (dir) => {
  const configDir = join(dir, "config");
  await mkdir(configDir, { recursive: true });
  await withFakeClaudeEnv({ FAKE_CLAUDE_SLEEP: "3000" }, async () => {
    const result = await setPluginEnabled("demo@mk", true, {
      configDir,
      backupDir: join(dir, "backups"),
      claudeBin: [process.execPath, fakeClaudePath],
      timeoutMs: 200,
    });
    assert.equal(result.ok, false, `expected timeout failure, got: ${JSON.stringify(result)}`);
  });
});

// ---- setMcpJsonDecision: creates settings.local.json if missing, preserves other keys ----
await withTmpDir("hub-write-mcp-create-", async (dir) => {
  const result = await setMcpJsonDecision(dir, "srv", "enabled", { backupDir: join(dir, "backups") });
  assert.equal(result.ok, true, `expected ok, got: ${JSON.stringify(result)}`);
  const path = join(dir, ".claude", "settings.local.json");
  const text = await readFile(path, "utf8");
  assert.equal(text, `${JSON.stringify({ enabledMcpjsonServers: ["srv"] }, null, 2)}\n`, "2-space format, srv enabled");
});

// ---- setMcpJsonDecision: preserves other keys, moves server between lists, clear removes ----
await withTmpDir("hub-write-mcp-move-", async (dir) => {
  const settingsDir = join(dir, ".claude");
  await mkdir(settingsDir, { recursive: true });
  const path = join(settingsDir, "settings.local.json");
  await writeFile(
    path,
    JSON.stringify({ enabledPlugins: { "kept@mk": true }, disabledMcpjsonServers: ["srv"] }, null, 2) + "\n",
    "utf8"
  );

  const enabledResult = await setMcpJsonDecision(dir, "srv", "enabled", { backupDir: join(dir, "backups") });
  assert.equal(enabledResult.ok, true, `expected ok, got: ${JSON.stringify(enabledResult)}`);
  let settings = JSON.parse(await readFile(path, "utf8"));
  assert.deepEqual(settings.enabledMcpjsonServers, ["srv"]);
  assert.equal(settings.disabledMcpjsonServers, undefined, "server removed from disabled list");
  assert.deepEqual(settings.enabledPlugins, { "kept@mk": true }, "unrelated key preserved");

  const clearResult = await setMcpJsonDecision(dir, "srv", "clear", { backupDir: join(dir, "backups") });
  assert.equal(clearResult.ok, true, `expected ok, got: ${JSON.stringify(clearResult)}`);
  settings = JSON.parse(await readFile(path, "utf8"));
  assert.equal(settings.enabledMcpjsonServers, undefined, "empty list removed from object");
  assert.equal(settings.disabledMcpjsonServers, undefined);
  assert.deepEqual(settings.enabledPlugins, { "kept@mk": true }, "unrelated key still preserved");
});

// ---- setMcpJsonDecision: list is "all" -> error, no write ----
await withTmpDir("hub-write-mcp-all-", async (dir) => {
  const settingsDir = join(dir, ".claude");
  await mkdir(settingsDir, { recursive: true });
  const path = join(settingsDir, "settings.local.json");
  const original = JSON.stringify({ enabledMcpjsonServers: "all" }, null, 2) + "\n";
  await writeFile(path, original, "utf8");

  const result = await setMcpJsonDecision(dir, "srv", "disabled", { backupDir: join(dir, "backups") });
  assert.equal(result.ok, false, `expected error, got: ${JSON.stringify(result)}`);
  if (!result.ok) assert.match(result.error, /list is 'all'/);
  assert.equal(await readFile(path, "utf8"), original, "file left untouched");
});

// ---- setMcpJsonDecision: invalid JSON -> { ok: false }, file intact ----
await withTmpDir("hub-write-mcp-invalid-", async (dir) => {
  const settingsDir = join(dir, ".claude");
  await mkdir(settingsDir, { recursive: true });
  const path = join(settingsDir, "settings.local.json");
  await writeFile(path, "{ nope", "utf8");

  const result = await setMcpJsonDecision(dir, "srv", "enabled", { backupDir: join(dir, "backups") });
  assert.equal(result.ok, false, `expected error, got: ${JSON.stringify(result)}`);
  if (!result.ok) assert.match(result.error, /invalid JSON/);
  assert.equal(await readFile(path, "utf8"), "{ nope");
});

// ---- BACKUP_DIR sanity: lives under ~/.cc-track/backups ----
assert.ok(BACKUP_DIR.includes(".cc-track"), `BACKUP_DIR: ${BACKUP_DIR}`);
assert.ok(BACKUP_DIR.endsWith("backups") || BACKUP_DIR.endsWith(join("backups")), `BACKUP_DIR: ${BACKUP_DIR}`);

console.log("✔ tests/hub-write.test.mts — all assertions passed");
