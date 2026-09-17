"use client";

import { Card, Label, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

const HOOKS_JSON = `{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "PostToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "StopFailure": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "SubagentStart": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs", "async": true }] }
    ]
  }
}`;

const VERIFY_SNIPPET = `curl -s http://localhost:3000/api/health
# {"ok":true,"db_configured":true,"ingestion_key_configured":true}

curl -s -X POST http://localhost:3000/api/ingest/hook \
  -H 'content-type: application/json' \
  -H "x-api-key: $CC_TRACKER_API_KEY" \
  -d '{"hook_event_name":"SessionStart","session_id":"'$(uuidgen)'","cwd":"/tmp/demo","source":"startup"}'`;

const RAND_KEY_BASH = `openssl rand -hex 32`;
const RAND_KEY_POWERSHELL = `$b=[byte[]]::new(32);(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b);($b|ForEach-Object{$_.ToString('x2')}) -join ''`;
const INSTALL_COMMAND = `node $HOME/cc-track/hooks/install.mjs \
  --url http://localhost:3000 \
  --key <your CC_TRACKER_API_KEY>`;
const HITL_CONFIG_SNIPPET = `{
  "url": "http://localhost:3000",
  "key": "<your CC_TRACKER_API_KEY>",
  "hitl_matchers": ["ExitPlanMode", "Bash:git push"],
  "hitl_timeout_ms": 600000,
  "hitl_fail_closed": false
}`;
const WHERE_CLAUDE_SNIPPET = `where claude`;
const CCTRACK_CLI_SNIPPET = `npm link   # inside the cc-track folder, exposes \`cctrack\`

cctrack plan add --title "Refactor auth to JWT" --desc "optional context"
cctrack task add --plan <plan-id> --content "Write migration"
cctrack task done <task-id>
cctrack session end`;

function EnvRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
      <code className="min-w-0 flex-1 break-all font-mono text-[0.75rem] text-foreground">{label}</code>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[0.125rem] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${
          configured ? "bg-[color:var(--color-green)] text-background" : "bg-[color:var(--color-yellow)] text-background"
        }`}
      >
        {configured ? "configured" : "missing"}
      </span>
    </div>
  );
}

function WindowsNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-[0.75rem] leading-relaxed text-muted-2">{children}</p>;
}

export function SetupContent({
  dbOk,
  urlOk,
  svcOk,
  keyOk,
  embedded = false,
}: {
  dbOk: boolean;
  urlOk: boolean;
  svcOk: boolean;
  keyOk: boolean;
  embedded?: boolean;
}) {
  const readyCount = [urlOk, svcOk, keyOk].filter(Boolean).length;
  return (
    <>
      {!embedded && (
        <PageHeader
          title="Setup"
          sub="One-time wiring between Claude Code, this app, and Supabase."
          right={
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.06em] text-muted">
              <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${readyCount === 3 ? "bg-[color:var(--color-green)]" : "bg-[color:var(--color-yellow)]"}`} />
              <span className="font-mono tabular-nums text-foreground">{readyCount}/3</span> ready
            </span>
          }
        />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-8">
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-16 xl:self-start">
          <Card title="Environment">
            <div className="space-y-2">
              <EnvRow label="NEXT_PUBLIC_SUPABASE_URL" configured={urlOk} />
              <EnvRow label="SUPABASE_SECRET" configured={svcOk} />
              <EnvRow label="CC_TRACKER_API_KEY" configured={keyOk} />
              <p className="pt-2 text-[0.75rem] leading-relaxed text-muted">
                {dbOk ? "Supabase connection is configured. If tables are missing, run supabase/schema.sql in the SQL editor." : "Set these in .env.local (copy .env.example as a starting point), then restart the dev server."}
              </p>
            </div>
          </Card>

          <Card title="Verify" right={<CopyButton text={VERIFY_SNIPPET} label="Copy snippet" />}>
            <pre className="overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{VERIFY_SNIPPET}</pre>
          </Card>
        </aside>

        <div className="min-w-0 space-y-6">
          <Card title="1. Supabase schema">
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">Open your Supabase project, SQL Editor, New query, paste the contents of <code className="font-mono text-foreground">supabase/schema.sql</code> and run it. It creates the projects, sessions, plans, tasks, and events tables with RLS enabled (the app uses the service-role key server-side).</p>
          </Card>

          <Card title="2. Claude Code hooks" right={<CopyButton text={HOOKS_JSON} label="Copy hooks JSON" />}>
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">Need a <code className="font-mono text-foreground">CC_TRACKER_API_KEY</code>? Generate a random one:</p>
            <div className="mt-3 space-y-3">
              <div><div className="mb-1.5 flex items-center justify-between gap-2"><Label as="span">Git Bash</Label><CopyButton text={RAND_KEY_BASH} label="Copy" /></div><pre className="overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{RAND_KEY_BASH}</pre></div>
              <div><div className="mb-1.5 flex items-center justify-between gap-2"><Label as="span">PowerShell</Label><CopyButton text={RAND_KEY_POWERSHELL} label="Copy" /></div><pre className="overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{RAND_KEY_POWERSHELL}</pre></div>
            </div>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">Run the installer once. It writes <code className="font-mono text-foreground">~/.cc-track/config.json</code> (URL plus API key) and tells you where to paste the hooks snippet:</p>
            <div className="mb-1.5 mt-3 flex items-center justify-end"><CopyButton text={INSTALL_COMMAND} label="Copy install command" /></div>
            <pre className="overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem]">{INSTALL_COMMAND}</pre>
            <WindowsNote>On Windows PowerShell: use $env:USERPROFILE\cc-track\hooks\install.mjs</WindowsNote>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">Then merge this into <code className="font-mono text-foreground">~/.claude/settings.json</code> (adjust the path if you cloned the repo elsewhere):</p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{HOOKS_JSON}</pre>
            <WindowsNote>On Windows PowerShell: replace $HOME/cc-track with $env:USERPROFILE\cc-track in every command path above.</WindowsNote>
          </Card>

          <Card title="3. HITL matchers (optional)" right={<CopyButton text={HITL_CONFIG_SNIPPET} label="Copy HITL config" />}>
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">HITL intercepts specific tool calls, holds them, and lets you approve or deny them from the dashboard before Claude Code proceeds. It requires an entry in <code className="font-mono text-foreground">~/.cc-track/config.json</code>. Timeout is 60s in code but the sample below sets it to 600000ms (10 minutes) so you have time to approve; on a tracker error it can either fail-open (allow the tool call) or fail-closed (deny it), depending on <code className="font-mono text-foreground">hitl_fail_closed</code>. HITL also needs the synchronous <code className="font-mono text-foreground">PreToolUse</code> hook wired to <code className="font-mono text-foreground">hooks/hitl.mjs</code>, which <code className="font-mono text-foreground">install.mjs</code> adds automatically; without it, the matchers below do nothing.</p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{HITL_CONFIG_SNIPPET}</pre>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted"><li>A matcher is either <code className="font-mono text-foreground">ToolName</code> (any use of that tool) or <code className="font-mono text-foreground">ToolName:&lt;substring&gt;</code> (only when that substring shows up in the tool call).</li><li>The substring is searched against the JSON serialization of <code className="font-mono text-foreground">tool_input</code>, so it can match a flag, a path fragment, or part of a command string.</li><li>Matching is case-sensitive.</li></ul>
          </Card>

          <Card title="4. Prompts and Send" right={<CopyButton text={WHERE_CLAUDE_SNIPPET} label="Copy check" />}>
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted"><code className="font-mono text-foreground">/prompts</code> lets you save reusable prompts. Each saved prompt has a Send button that copies the body to your clipboard and spawns <code className="font-mono text-foreground">claude</code> in a new terminal, inside the linked project&apos;s folder (or your home directory if no project is attached).</p>
            <div className="mt-3 rounded-lg border border-line bg-panel2 px-3 py-2.5 text-sm leading-relaxed text-muted"><span className="font-semibold text-foreground">Prerequisite: </span>the <code className="font-mono text-foreground">claude</code> CLI must be on your PATH. If it isn&apos;t, the terminal opens but nothing runs. Test with <code className="font-mono text-foreground">where claude</code> (Windows).</div>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{WHERE_CLAUDE_SNIPPET}</pre>
          </Card>

          <Card title="5. Auto-boot lifecycle"><p className="max-w-[75ch] text-sm leading-relaxed text-muted">The hook probes <code className="font-mono text-foreground">/api/health</code> at <code className="font-mono text-foreground">SessionStart</code> and every <code className="font-mono text-foreground">UserPromptSubmit</code>; if the tracker is down it launches it via <code className="font-mono text-foreground">start-hidden.vbs</code> (fire-and-forget). Each hook fire also touches a heartbeat, so <code className="font-mono text-foreground">start.sh</code>&apos;s idle timer (<code className="font-mono text-foreground">IDLE_TIMEOUT</code>, default 60s) keeps resetting while any session is active, and the server shuts itself down once nothing pings it anymore.</p></Card>

          <Card title="6. cctrack CLI (plans and tasks)" right={<CopyButton text={CCTRACK_CLI_SNIPPET} label="Copy CLI commands" />}>
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">Make the CLI available globally, then Claude Code (or you) can log plans and tasks:</p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">{CCTRACK_CLI_SNIPPET}</pre>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">Tip: paste the snippet from <code className="font-mono text-foreground">CLAUDE.md.snippet</code> into your project&apos;s CLAUDE.md so Claude logs a plan at the start of every task and updates tasks as it works.</p>
          </Card>

          <Card title="7. Hub"><p className="max-w-[75ch] text-sm leading-relaxed text-muted"><code className="font-mono text-foreground">/hub</code> is a read-only view of your global <code className="font-mono text-foreground">~/.claude/settings.json</code> and <code className="font-mono text-foreground">.mcp.json</code>, plus any per-project ones, showing plugins and MCP servers grouped by owner. From /hub you can enable or disable plugins and approve or reject <code className="font-mono text-foreground">.mcp.json</code> servers directly.</p></Card>
        </div>
      </div>
    </>
  );
}
