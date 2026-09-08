// Exercises lib/hub.ts (getHub) against the fixture tree in tests/fixtures/hub/.
// lib/hub.ts imports "server-only", whose real module body is a top-level throw meant to
// fail a Client Component bundle at build time — not useful outside Next's bundler. tsx
// compiles that `import "server-only"` down to a CJS `require("server-only")` under the
// hood, so patching Node's CJS Module._load (below, before lib/hub.ts is dynamically
// imported) to swap it for an empty module is what lets this run as a plain script.
// Run: npx tsx tests/hub.test.mts
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

const { getHub } = (await import("../lib/hub.ts")) as typeof import("../lib/hub.ts");

const fixturesRoot = join(import.meta.dirname, "fixtures", "hub");
const configDir = join(fixturesRoot, "dotclaude");
const projDir = join(fixturesRoot, "proj");
const missingProjectDir = join(fixturesRoot, "does-not-exist");

// ---- build claude.json from the template: substitute two differently-cased/slashed
// variants of the same project path so the merge produces an unnormalized-project-key
// warning, matching what a real ~/.claude.json looks like on Windows. ----
const template = await readFile(join(fixturesRoot, "claude.json.template"), "utf8");
const variantA = projDir.replace(/\\/g, "/"); // forward-slash variant
const variantB = projDir.toLowerCase(); // lowercase, native-separator variant
const claudeJsonText = template
  .replace("__PROJ_A__", JSON.stringify(variantA).slice(1, -1))
  .replace("__PROJ_B__", JSON.stringify(variantB).slice(1, -1));

const tmpDir = await mkdtemp(join(tmpdir(), "hub-test-"));
const claudeJsonPath = join(tmpDir, "claude.json");
await writeFile(claudeJsonPath, claudeJsonText, "utf8");

try {
  const hub = await getHub({
    configDir,
    claudeJsonPath,
    projectPaths: [projDir, missingProjectDir],
  });

  const byType = (t: string) => hub.items.filter((i) => i.type === t);
  const warningCodes = hub.warnings.map((w) => w.code);

  // ---- counts per type ----
  // plugins: pl (installed, user scope) + ghost (stale) + foo (inline) = 3
  assert.equal(byType("plugin").length, 3, `plugin count: ${byType("plugin").length}`);
  // skills: demo (user) + x (plugin) = 2
  assert.equal(byType("skill").length, 2, `skill count: ${byType("skill").length}`);
  // agents: helper (user) + pa (plugin) = 2
  assert.equal(byType("agent").length, 2, `agent count: ${byType("agent").length}`);
  // commands: c.toml + d.md (both plugin) = 2
  assert.equal(byType("command").length, 2, `command count: ${byType("command").length}`);
  // mcp: play (user, claude.json) + plugin:pl:plsrv (plugin) + approved/rejected/unknown (project) = 5
  assert.equal(byType("mcp").length, 5, `mcp count: ${byType("mcp").length}`);
  // hooks: SessionStart (user) + PostToolUse deduped-to-1 (user local) + PreToolUse (plugin)
  // + Notification (project) = 4
  assert.equal(byType("hook").length, 4, `hook count: ${byType("hook").length}`);

  // ---- pl@mk: enabled (user-level), meta.overrides mentions proj:false ----
  const plPlugin = hub.items.find((i) => i.type === "plugin" && i.name === "pl");
  assert.ok(plPlugin, "pl plugin item present");
  assert.equal(plPlugin?.state, "enabled");
  assert.ok(plPlugin?.meta.overrides?.includes("proj:false"), `overrides: ${plPlugin?.meta.overrides}`);
  assert.equal(plPlugin?.meta.version, "1.0.0");
  assert.equal(plPlugin?.meta.usageCount, "3");

  // ---- ghost@mk: stale + warning ----
  const ghostPlugin = hub.items.find((i) => i.type === "plugin" && i.name === "ghost");
  assert.ok(ghostPlugin, "ghost plugin item present");
  assert.equal(ghostPlugin?.state, "stale");
  assert.ok(warningCodes.includes("stale-plugin"), "stale-plugin warning present");

  // ---- foo@inline present ----
  const inlinePlugin = hub.items.find((i) => i.type === "plugin" && i.scope.kind === "inline");
  assert.ok(inlinePlugin, "inline plugin item present");
  assert.equal(inlinePlugin?.name, "foo");
  assert.equal(inlinePlugin?.state, "enabled");
  assert.equal(inlinePlugin?.meta.usageCount, "7");

  // ---- pl:x skill: usageCount "5" ----
  const plXSkill = hub.items.find((i) => i.type === "skill" && i.name === "pl:x");
  assert.ok(plXSkill, "pl:x skill present");
  assert.equal(plXSkill?.meta.usageCount, "5");

  // ---- plugin:pl:plsrv mcp: envKeys "TOKEN", no secret leakage ----
  const plMcp = hub.items.find((i) => i.type === "mcp" && i.name === "plugin:pl:plsrv");
  assert.ok(plMcp, "plugin:pl:plsrv mcp item present");
  assert.equal(plMcp?.meta.envKeys, "TOKEN");
  const serialized = JSON.stringify(hub);
  assert.ok(!serialized.includes("secret"), "no leaked env value 'secret'");
  assert.ok(!serialized.includes("nope@example.com"), "no leaked oauthAccount email");
  // "v" (the raw value of claude.json's mcpServers.play.env.KEY) is a single character that
  // legitimately appears inside unrelated strings (e.g. item names ending in "...srv"), so a
  // blind substring search on the whole payload is too fragile — check structurally instead:
  // no meta value anywhere in the hub is the bare env value "v".
  for (const item of hub.items) {
    for (const [k, v] of Object.entries(item.meta)) {
      assert.notEqual(v, "v", `meta.${k} on ${item.id} leaked raw env value`);
    }
  }

  // ---- project mcp: approved enabled, rejected disabled, unknown pending + warning ----
  const approved = hub.items.find((i) => i.type === "mcp" && i.name === "approved");
  const rejected = hub.items.find((i) => i.type === "mcp" && i.name === "rejected");
  const unknown = hub.items.find((i) => i.type === "mcp" && i.name === "unknown");
  assert.equal(approved?.state, "enabled");
  assert.equal(rejected?.state, "disabled");
  assert.equal(unknown?.state, "pending");
  assert.ok(warningCodes.includes("mcp-pending"), "mcp-pending warning present");

  // ---- duplicate PostToolUse hook: exactly one item + duplicate-hook warning ----
  const postToolUseHooks = hub.items.filter((i) => i.type === "hook" && i.meta.event === "PostToolUse");
  assert.equal(postToolUseHooks.length, 1, `PostToolUse hook items: ${postToolUseHooks.length}`);
  assert.ok(warningCodes.includes("duplicate-hook"), "duplicate-hook warning present");

  // ---- unnormalized-project-key warning ----
  assert.ok(warningCodes.includes("unnormalized-project-key"), "unnormalized-project-key warning present");

  // ---- missing-project warning + excluded from projectsScanned ----
  assert.ok(warningCodes.includes("missing-project"), "missing-project warning present");
  assert.ok(!hub.projectsScanned.includes(missingProjectDir), "missing project excluded from projectsScanned");
  assert.ok(hub.projectsScanned.some((p) => p === projDir), "existing project included in projectsScanned");

  // ---- sorted: plugin first, hook last ----
  assert.equal(hub.items[0]?.type, "plugin", `first item type: ${hub.items[0]?.type}`);
  assert.equal(hub.items[hub.items.length - 1]?.type, "hook", `last item type: ${hub.items[hub.items.length - 1]?.type}`);
  const typeOrder = ["plugin", "mcp", "skill", "command", "agent", "hook"];
  let lastIdx = -1;
  for (const item of hub.items) {
    const idx = typeOrder.indexOf(item.type);
    assert.ok(idx >= lastIdx, `type order violated at ${item.type} (${item.id})`);
    lastIdx = idx;
  }

  // ---- generatedAt present ----
  assert.ok(hub.generatedAt.length > 0);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

// ---- getHub never throws: nonexistent configDir/claudeJsonPath -> empty hub ----
{
  const emptyHub = await getHub({
    configDir: join(fixturesRoot, "does-not-exist-either"),
    claudeJsonPath: join(fixturesRoot, "also-does-not-exist.json"),
  });
  assert.equal(emptyHub.items.length, 0, `empty hub items: ${emptyHub.items.length}`);
  assert.equal(emptyHub.warnings.length, 0, `empty hub warnings: ${emptyHub.warnings.length}`);
  assert.deepEqual(emptyHub.projectsScanned, []);
}

// ---- a project path whose .claude dir IS the configDir (e.g. the user's home directory
// passed as a project path) is not a distinct project scope: it must not be double-counted
// as a "project" scope, and must not trigger a missing-project warning. ----
{
  const homeAliasDir = await mkdtemp(join(tmpdir(), "hub-test-homealias-"));
  try {
    const aliasConfigDir = join(homeAliasDir, ".claude");
    await mkdir(join(aliasConfigDir, "skills", "s"), { recursive: true });
    await writeFile(join(aliasConfigDir, "skills", "s", "SKILL.md"), "---\nname: s\n---\nbody", "utf8");

    const hub = await getHub({
      configDir: aliasConfigDir,
      claudeJsonPath: join(homeAliasDir, "nope.json"),
      projectPaths: [homeAliasDir],
    });

    const skills = hub.items.filter((i) => i.type === "skill");
    assert.equal(skills.length, 1, `skill count: ${skills.length}`);
    assert.equal(skills[0]?.scope.kind, "user", `skill scope kind: ${skills[0]?.scope.kind}`);
    assert.ok(!hub.projectsScanned.includes(homeAliasDir), "home-alias project excluded from projectsScanned");
    assert.ok(!hub.warnings.some((w) => w.code === "missing-project"), "no missing-project warning for home-alias project");
  } finally {
    await rm(homeAliasDir, { recursive: true, force: true });
  }
}

console.log("✔ tests/hub.test.mts — all assertions passed");
