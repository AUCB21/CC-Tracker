import { Card, PageHeader } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { isDbConfigured, ingestionKeyConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const HOOKS_JSON = `{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs" }] }
    ],
    "PostToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs" }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node $HOME/cc-track/hooks/claude-tracker.mjs" }] }
    ]
  }
}`;

const VERIFY_SNIPPET = `curl -s http://localhost:3000/api/health
# {"ok":true,"db_configured":true,"ingestion_key_configured":true}

curl -s -X POST http://localhost:3000/api/ingest/hook \\
  -H 'content-type: application/json' \\
  -H "x-api-key: $CC_TRACKER_API_KEY" \\
  -d '{"hook_event_name":"SessionStart","session_id":"'$(uuidgen)'","cwd":"/tmp/demo","source":"startup"}'`;

function EnvRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel2 px-3 py-2.5">
      <code className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-foreground">{label}</code>
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[0.125rem] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${
          configured
            ? "bg-[color:var(--color-green)] text-background"
            : "bg-[color:var(--color-yellow)] text-background"
        }`}
      >
        {configured ? "configured" : "missing"}
      </span>
    </div>
  );
}

export default function SetupPage() {
  const dbOk = isDbConfigured();
  const keyOk = ingestionKeyConfigured();
  const urlOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const svcOk = Boolean(process.env.SUPABASE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  const readyCount = [urlOk, svcOk, keyOk].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Setup"
        sub="One-time wiring between Claude Code, this app, and Supabase."
        right={
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[0.6875rem] uppercase tracking-[0.06em] text-muted">
            <span
              aria-hidden
              className={`inline-block h-2 w-2 rounded-full ${
                readyCount === 3
                  ? "bg-[color:var(--color-green)]"
                  : "bg-[color:var(--color-yellow)]"
              }`}
            />
            <span className="font-mono tabular-nums text-foreground">{readyCount}/3</span> ready
          </span>
        }
      />

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:gap-8">
        {/* Left rail: environment + verify (sticky on xl) */}
        <aside className="min-w-0 space-y-6 xl:sticky xl:top-16 xl:self-start">
          <Card title="Environment">
            <div className="space-y-2">
              <EnvRow label="NEXT_PUBLIC_SUPABASE_URL" configured={urlOk} />
              <EnvRow label="SUPABASE_SECRET" configured={svcOk} />
              <EnvRow label="CC_TRACKER_API_KEY" configured={keyOk} />
              <p className="pt-2 text-[0.75rem] leading-relaxed text-muted">
                {dbOk
                  ? "Supabase connection is configured. If tables are missing, run supabase/schema.sql in the SQL editor."
                  : "Set these in .env.local (copy .env.example as a starting point), then restart the dev server."}
              </p>
            </div>
          </Card>

          <Card title="Verify" right={<CopyButton text={VERIFY_SNIPPET} label="Copy snippet" />}>
            <pre className="overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">
{VERIFY_SNIPPET}
            </pre>
          </Card>
        </aside>

        {/* Main lane: install steps */}
        <div className="min-w-0 space-y-6">
          <Card title="1. Supabase schema">
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">
              Open your Supabase project, SQL Editor, New query, paste the contents of{" "}
              <code className="font-mono text-foreground">supabase/schema.sql</code> and run it. It
              creates the projects, sessions, plans, tasks, and events tables with RLS enabled (the
              app uses the service-role key server-side).
            </p>
          </Card>

          <Card
            title="2. Claude Code hooks"
            right={
              <CopyButton text={HOOKS_JSON} label="Copy hooks JSON" />
            }
          >
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">
              Need a <code className="font-mono text-foreground">CC_TRACKER_API_KEY</code>? Generate a
              random one:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">
{`# Git Bash
openssl rand -hex 32

# PowerShell
$b=[byte[]]::new(32);(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b);($b|ForEach-Object{$_.ToString('x2')}) -join ''`}
            </pre>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">
              Run the installer once. It writes{" "}
              <code className="font-mono text-foreground">~/.cc-track/config.json</code> (URL plus
              API key) and tells you where to paste the hooks snippet:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem]">
{`node $HOME/cc-track/hooks/install.mjs \\
  --url http://localhost:3000 \\
  --key <your CC_TRACKER_API_KEY>`}
            </pre>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">
              Then merge this into{" "}
              <code className="font-mono text-foreground">~/.claude/settings.json</code> (adjust the
              path if you cloned the repo elsewhere):
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">
{HOOKS_JSON}
            </pre>
          </Card>

          <Card title="3. cctrack CLI (plans and tasks)">
            <p className="max-w-[75ch] text-sm leading-relaxed text-muted">
              Make the CLI available globally, then Claude Code (or you) can log plans and tasks:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-line bg-background p-4 font-mono text-[0.75rem] leading-relaxed">
{`npm link   # inside the cc-track folder, exposes \`cctrack\`

cctrack plan add --title "Refactor auth to JWT" --desc "optional context"
cctrack task add --plan <plan-id> --content "Write migration"
cctrack task done <task-id>
cctrack session end`}
            </pre>
            <p className="mt-4 max-w-[75ch] text-sm leading-relaxed text-muted">
              Tip: paste the snippet from{" "}
              <code className="font-mono text-foreground">CLAUDE.md.snippet</code> into your
              project&apos;s CLAUDE.md so Claude logs a plan at the start of every task and updates
              tasks as it works.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
