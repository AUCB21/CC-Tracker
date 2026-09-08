#!/usr/bin/env node
// Portable stand-in for the `claude` CLI, used by tests/hub-write.test.mts to exercise
// setPluginEnabled() without ever touching the real binary or ~/.claude. Invoked as
// `node fake-claude.mjs plugin <enable|disable> <key> -s user`. Reads/writes
// `<CLAUDE_CONFIG_DIR>/settings.json` the same way the real CLI does for this one flag.
//
// Env knobs for test scenarios:
//   FAKE_CLAUDE_FAIL=1        exit 2 with a stderr message, no write
//   FAKE_CLAUDE_NOOP=1        exit 0 without writing (simulates a CLI that "succeeds" but
//                             didn't actually flip the flag)
//   FAKE_CLAUDE_SLEEP=<ms>    sleep before acting (for timeout tests)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

async function main() {
  const args = process.argv.slice(2);
  const [command, action, pluginKey, scopeFlag, scopeValue] = args;

  if (command !== "plugin" || (action !== "enable" && action !== "disable")) {
    process.stderr.write(`fake-claude: unsupported invocation: ${args.join(" ")}\n`);
    process.exit(2);
  }
  if (scopeFlag !== "-s" || scopeValue !== "user") {
    process.stderr.write(`fake-claude: expected "-s user", got: ${args.join(" ")}\n`);
    process.exit(2);
  }
  if (!pluginKey) {
    process.stderr.write("fake-claude: missing <plugin> argument\n");
    process.exit(2);
  }

  const sleepMs = Number(process.env.FAKE_CLAUDE_SLEEP ?? "0");
  if (sleepMs > 0) await new Promise((resolve) => setTimeout(resolve, sleepMs));

  if (process.env.FAKE_CLAUDE_FAIL === "1") {
    process.stderr.write(`fake-claude: simulated failure enabling/disabling ${pluginKey}\n`);
    process.exit(2);
  }

  if (process.env.FAKE_CLAUDE_NOOP === "1") {
    process.stdout.write(`fake-claude: noop for ${pluginKey}\n`);
    process.exit(0);
  }

  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (!configDir) {
    process.stderr.write("fake-claude: CLAUDE_CONFIG_DIR not set\n");
    process.exit(2);
  }
  const settingsPath = join(configDir, "settings.json");

  let settings = {};
  try {
    settings = JSON.parse(await readFile(settingsPath, "utf8"));
  } catch {
    settings = {};
  }
  settings.enabledPlugins = { ...(settings.enabledPlugins ?? {}), [pluginKey]: action === "enable" };

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");

  process.stdout.write(`fake-claude: ${action}d ${pluginKey}\n`);
  process.exit(0);
}

main();
