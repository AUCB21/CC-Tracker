// Exercises lib/hub-parse.ts (pure, no fs) for real. Run: npx tsx tests/hub-parse.test.mts
import assert from "node:assert/strict";
import {
  hookSignature,
  makeItemId,
  parseFrontmatter,
  parseTomlCommand,
  pluginKey,
  projectKey,
  redactEnv,
  scopeKey,
} from "../lib/hub-parse";

// ---- parseFrontmatter: simple ----
{
  const md = `---
name: demo
description: A simple skill
version: 1.0.0
---
Body content here.`;
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, "demo");
  assert.equal(fm.description, "A simple skill");
  assert.equal(fm.version, "1.0.0");
  assert.equal(fm.userInvocable, null);
  assert.equal(fm.model, null);
  assert.equal(fm.tools, null);
  assert.equal(fm.body, "Body content here.");
}

// ---- parseFrontmatter: real "impeccable" shape ----
// long single-line description + user-invocable: true + allowed-tools: list
// (must be ignored without breaking) + argument-hint: quoted scalar
{
  const md = `---
name: impeccable
description: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface.
version: 4.1.3
user-invocable: true
argument-hint: "[shape · audit|critique]"
license: Apache 2.0
allowed-tools:
  - Bash(npx impeccable *)
  - Bash(node .claude/skills/impeccable/scripts/*)
---

This skill gives you the tools.`;
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, "impeccable");
  assert.equal(
    fm.description,
    "Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface."
  );
  assert.equal(fm.version, "4.1.3");
  assert.equal(fm.userInvocable, true);
  // allowed-tools is not a tracked field: must not corrupt parsing or throw
  assert.equal(fm.tools, null);
  assert.equal(fm.body, "This skill gives you the tools.");
}

// ---- parseFrontmatter: real "ponytail" shape — folded description (>) ----
{
  const md = `---
name: ponytail
description: >
  Forces the laziest solution that actually works, simplest, shortest, most
  minimal. Channels a senior dev who has seen everything: question whether the
  task needs to exist at all (YAGNI).
argument-hint: "[lite|full|ultra]"
license: MIT
---
# Ponytail`;
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, "ponytail");
  assert.equal(
    fm.description,
    "Forces the laziest solution that actually works, simplest, shortest, most minimal. Channels a senior dev who has seen everything: question whether the task needs to exist at all (YAGNI)."
  );
}

// ---- parseFrontmatter: literal block (|) keeps newlines ----
{
  const md = `---
name: x
description: |
  line one
  line two
---
body`;
  const fm = parseFrontmatter(md);
  assert.equal(fm.description, "line one\nline two");
}

// ---- parseFrontmatter: agent shape — tools scalar vs list, model: inherit ----
{
  const mdScalar = `---
name: impeccable-asset-producer
description: Produces clean reusable raster assets.
tools: Read, Write, Bash
model: inherit
---
body`;
  const fmScalar = parseFrontmatter(mdScalar);
  assert.equal(fmScalar.tools, "Read, Write, Bash");
  assert.equal(fmScalar.model, "inherit");

  const mdList = `---
name: impeccable-asset-producer
description: Produces clean reusable raster assets.
tools:
  - Read
  - Write
  - Bash
model: inherit
---
body`;
  const fmList = parseFrontmatter(mdList);
  assert.equal(fmList.tools, "Read, Write, Bash");
  assert.equal(fmList.model, "inherit");
}

// ---- parseFrontmatter: CRLF line endings + leading BOM ----
{
  const md = "\uFEFF---\r\nname: crlf-demo\r\ndescription: has crlf\r\n---\r\nbody line";
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, "crlf-demo");
  assert.equal(fm.description, "has crlf");
  assert.equal(fm.body, "body line");
}

// ---- parseFrontmatter: no frontmatter → nulls, body intact ----
{
  const md = "Just plain markdown.\nNo frontmatter here.";
  const fm = parseFrontmatter(md);
  assert.equal(fm.name, null);
  assert.equal(fm.description, null);
  assert.equal(fm.version, null);
  assert.equal(fm.userInvocable, null);
  assert.equal(fm.model, null);
  assert.equal(fm.tools, null);
  assert.equal(fm.body, md);
}

// ---- parseTomlCommand ----
{
  const toml = `description = "Code review \\"strict\\" mode"
prompt = "Do the thing"`;
  const parsed = parseTomlCommand(toml);
  assert.equal(parsed.description, 'Code review "strict" mode');
  assert.equal(parsed.prompt, "Do the thing");
}
{
  const toml = 'description = "short"\nprompt = """multi\nline"""';
  const parsed = parseTomlCommand(toml);
  assert.equal(parsed.description, "short");
  assert.equal(parsed.prompt, "multi\nline");
}
{
  const parsed = parseTomlCommand("# nothing relevant here\nother = 1");
  assert.equal(parsed.description, null);
  assert.equal(parsed.prompt, null);
}

// ---- projectKey: collapses drive-letter / slash-direction / trailing-slash variants ----
{
  const variants = [
    "c:/Users/Agus/x",
    "C:/Users/Agus/x",
    "C:\\Users\\Agus\\x",
    "C:/Users/Agus/x/",
    "/c/Users/Agus/x",
  ];
  const keys = variants.map(projectKey);
  for (const k of keys) assert.equal(k, keys[0], `projectKey mismatch: ${k} vs ${keys[0]}`);
  assert.equal(keys[0], "c:/users/agus/x");
}

// ---- pluginKey ----
{
  assert.deepEqual(pluginKey("ponytail@ponytail"), { name: "ponytail", marketplace: "ponytail" });
  assert.deepEqual(pluginKey("engineering@inline"), { name: "engineering", marketplace: "inline" });
  assert.deepEqual(pluginKey("noat"), { name: "noat", marketplace: "unknown" });
}

// ---- hookSignature: stable across a commandWindows variant when command is present ----
{
  const withoutWin = hookSignature("PostToolUse", "Bash", { command: "echo hi" });
  const withWin = hookSignature("PostToolUse", "Bash", { command: "echo hi", commandWindows: "echo hi win" });
  assert.equal(withoutWin, withWin);
  assert.equal(withoutWin, "PostToolUse|Bash|echo hi");
  // matcher missing → "*"; command missing entirely → falls back to commandWindows, then ""
  assert.equal(hookSignature("Stop", undefined, {}), "Stop|*|");
  assert.equal(
    hookSignature("Stop", undefined, { commandWindows: "win-only" }),
    "Stop|*|win-only"
  );
}

// ---- redactEnv ----
{
  assert.deepEqual(redactEnv({ B: "secret", A: "x" }), ["A", "B"]);
  assert.deepEqual(redactEnv(null), []);
  assert.deepEqual(redactEnv(undefined), []);
  assert.deepEqual(redactEnv("not-an-object"), []);
  assert.deepEqual(redactEnv(["array", "not", "object"]), []);
}

// ---- scopeKey / makeItemId: one per HubScope kind ----
{
  assert.equal(scopeKey({ kind: "user" }), "user");
  assert.equal(
    scopeKey({ kind: "project", path: "C:\\Users\\Agus\\x", name: "x" }),
    "project:c:/users/agus/x"
  );
  assert.equal(
    scopeKey({ kind: "plugin", plugin: "ponytail", marketplace: "ponytail" }),
    "plugin:ponytail/ponytail"
  );
  assert.equal(scopeKey({ kind: "inline", plugin: "engineering" }), "inline:engineering");

  assert.equal(makeItemId("skill", { kind: "user" }, "impeccable"), "skill:user:impeccable");
  assert.equal(
    makeItemId("mcp", { kind: "project", path: "C:/repo", name: "repo" }, "playwright"),
    "mcp:project:c:/repo:playwright"
  );
  assert.equal(
    makeItemId("skill", { kind: "plugin", plugin: "ponytail", marketplace: "ponytail" }, "ponytail:ponytail-review"),
    "skill:plugin:ponytail/ponytail:ponytail:ponytail-review"
  );
  assert.equal(
    makeItemId("plugin", { kind: "inline", plugin: "engineering" }, "engineering"),
    "plugin:inline:engineering:engineering"
  );
}

console.log("✔ tests/hub-parse.test.mts — all assertions passed");
