# cc-track Harness Plan

This document is the design plan for evolving cc-track (the Claude Code observability app living in the `cc-track/` directory of this Next.js project) from a passive observer into a proper "AI harness": a system with feedback, control, and orchestration around its agent runs. It is written to be self-contained, so a reader who has never seen the original discussion can pick up any gap below and implement it.

## Diagnosis: what cc-track is today

cc-track currently does three things:

1. **Passive observer.** Hooks in `cc-track/hooks/` push session, prompt, and tool telemetry into supabase.
2. **Task ledger.** Plans, tasks, and TodoWrite sync.
3. **One-shot remote runner.** The "Attend" button on `/tasks` inserts a `task_runs` row; a local process (`bin/agent.mts`, started via `npm run agent`) claims it and shells out to `claude -p <prompt>` in the project's cwd.

Nothing in that loop evaluates, steers, or composes. A run either exits 0 or it does not, and that is the entire story cc-track can tell about it. To become a harness, it needs feedback (did the run actually accomplish the task?), control (budgets, tool policy, human gates), and orchestration (retries, chains, follow-ups).

## Constraint: subscription auth

This shapes everything, so it comes first. The Anthropic Agent SDK requires an `ANTHROPIC_API_KEY` (pay per token) and does NOT support Claude subscription OAuth. From the docs: "Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." Source: https://code.claude.com/docs/en/agent-sdk/quickstart.md

The `claude` CLI, however, does support subscription OAuth for `-p` headless mode when no `ANTHROPIC_API_KEY` is set. Source: https://code.claude.com/docs/en/authentication.md

**Decision: stay on `claude -p` for the runtime.** Everything below assumes that.

## What Claude Code already provides (verified from docs)

The CLI gives us more than the runner currently uses:

- `--output-format json` and `--output-format stream-json`: returns `session_id`, `total_cost_usd`, per-model `usage`. `stream-json` exposes per-turn `message_delta` events. Source: https://code.claude.com/docs/en/headless.md
- `--max-turns N`: hard cap on tool-use round trips. `--max-budget-usd $$$`: enforced by claude itself, no external polling required. Source: https://code.claude.com/docs/en/cli-reference.md
- `--allowedTools "Tool1,Tool2"` (camelCase, comma-separated) and `--disallowedTools`.
- `--permission-mode` accepts: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`. Source: https://code.claude.com/docs/en/permission-modes.md
- `--continue` resumes the most recent non-background session; `--resume <session-id>` resumes a specific session with a new prompt.
- Hooks fire in headless mode. `PreToolUse` can return "allow" or "deny" to gate individual tool calls. Source: https://code.claude.com/docs/en/hooks-guide.md

One gotcha worth calling out: project-level `.claude/settings.json` is NOT read during `-p` runs. Only user-scope settings (`~/.claude/settings.json`) and CLI flags apply. cc-track already installs its hooks at user scope via `hooks/install.mjs`, so hook-based features work; per-project tool policy MUST be passed via `--allowedTools` on the CLI.

## What is still not provided (we have to build it)

- **LLM-as-judge grading.** Only `claude plugin eval` exists, and it is early-access for plugins, not general use.
- **Mid-turn injection** (writing to the child's stdin during a run). Neither CLI nor SDK supports it. Between-turn resume via `--resume` is the only supported follow-up shape.
- **Windows `0xC0000142` DLL init failure guidance.** Not documented anywhere; our existing mitigation in `bin/agent.mts` (using `stdio: ["ignore", "pipe", "pipe"]` plus a 3-attempt exponential-backoff retry loop) is ours to maintain.

## Sequenced gap list

### Gap 0: Runner captures JSON output (0.5d, KEYSTONE)

**State today:** `bin/agent.mts` parses nothing structured out of `claude -p`; only exit code + last 8KB of stdout. `task_runs.claude_session_id` exists in `supabase/schema.sql:132` but is never populated.

**Do:** add `--output-format json` to the argv in `bin/agent.mts`. Parse the final JSON blob from stdout (has `result`, `session_id`, `total_cost_usd`, `usage`). Persist to new / existing columns: `task_runs.claude_session_id` (existing), `task_runs.total_cost_usd numeric`, `task_runs.usage jsonb`.

This is the keystone: every later gap consumes one or more of these fields.

### Gap 1: Feedback loop (1d, blocked by Gap 0)

**State today:** `bin/agent.mts:201` sets a run to `done` iff `exit_code === 0`. That is "process finished", not "task done".

**Do:** after a successful run, spawn a second `claude -p` with `--max-turns 3 --max-budget-usd 0.10 --output-format json`, prompt = task + plan context + `git diff <parent_commit>..HEAD --stat` since the run started. Parse the JSON `result` for `{verdict: pass|fail|needs_review, reason}`. Persist to new columns `task_runs.verdict text`, `task_runs.verdict_reason text`, `task_runs.diff_summary jsonb ({files_changed, insertions, deletions})`. Skip the verifier entirely when the project is not a git repo. The pill chip in `app/tasks/attend-button.tsx` shifts colour off run-status onto verdict when present (pass=green, fail=red, needs_review=yellow).

**Ceiling:** LLM-judge is not gospel. When a project has real tests, add `projects.verify_cmd text` and treat that command's exit code as the verdict; the LLM judge becomes a fallback.

### Gap 2: Cost/budget guards (1d, blocked by Gap 0)

**State today:** `sessions.*_tokens` are accumulated by hooks. No cap, no kill. A runaway session bills silently.

**Do:** add `projects.per_run_budget_usd numeric` and `projects.per_run_max_turns int`. Runner passes `--max-budget-usd` and `--max-turns` on every invoke, defaulting from the project row. Daily project spend = a supabase view summing `task_runs.total_cost_usd` for the last 24h; project cards turn amber at >80% of `projects.daily_budget_usd` and red at >100%. Over 100%, the server action refuses to queue new runs; also register a `PreToolUse` hook that denies further tool use for a project already over budget.

### Gap 3: Orchestration: parent_run_id, retry-on-fail, chain via --resume (2d, blocked by Gap 0, 1)

**State today:** `lib/attend.ts:34` creates exactly one `task_runs` row per Attend click. No lineage, no retries beyond the DLL retry loop.

**Do:** schema adds `task_runs.parent_run_id uuid references task_runs(id)`, `task_runs.trigger text` (values `manual|retry_on_fail|chain|followup|schedule`), `tasks.run_policy jsonb` (start with `{max_retries: n, retry_on_verdict: ["fail","needs_review"]}`). On `verdict=fail`, if the task's policy allows and retry-count-so-far is under the cap, the agent enqueues a new `task_runs` row with `parent_run_id` set and `trigger=retry_on_fail`; the runner passes `--resume <parent.claude_session_id>` so the retry inherits full context. UI: the pill grows a small "attempt 2/3" indicator; the "details" chip expands into a lineage view.

**Ceiling:** stop at retry + chain. Full DAG orchestration is a workflow-engine problem (Temporal, Inngest). ponytail: retry-only, add DAG only when a task genuinely needs it.

### Gap 4: Follow-up via --resume (1d, blocked by Gap 0)

**State today:** no way to say "actually also do X" after a run finishes without re-Attending from scratch.

**Do:** server action `followUp(runId, text)` inserts a new `task_runs` row with `parent_run_id` set, `trigger=followup`, `prompt=text`. Runner branch: if the row has a resolvable parent `claude_session_id`, invoke `claude -p --resume <session_id> "<text>"` instead of composing the full context template. UI: under any terminal run pill in `app/tasks/attend-button.tsx`, an inline text input + "send" chip.

Note: this replaces the earlier "mid-turn stdin injection" idea, which we now know is unsupported by both the CLI and the SDK.

### Gap 5: Prompt / policy library (3d, parallel-safe)

**State today:** `lib/attend.ts:8 buildAttendPrompt` is a hardcoded template. Per-run tweaks live in a free-text "override" textarea. No system prompt, no reusable templates, no per-project tool allowlist.

**Do:** new `prompts` table (`id, project_id, kind (system|template), name, body, version, created_at`), rows are immutable, saving creates a new version. `projects` gains `system_prompt_id uuid references prompts(id)` and `allowed_tools text[]`. `tasks` gains `template_prompt_id`. `buildAttendPrompt` composes `[system]\n\n[template with task/plan/project vars filled]\n\n[override]`. Runner adds `--allowedTools "<csv>"` from `projects.allowed_tools` on every invoke (must be on the CLI because `.claude/settings.json` is not read by `-p`). New `/prompts` page mirrors `/plans`, edit-in-place, "make active" pins a version to a project.

### Gap 6: HITL gates via PreToolUse hook (2d, parallel-safe)

**State today:** no way for a human to gate a specific tool call while a run is in flight. `--permission-mode acceptEdits` is the current best-we-can-do, and it either allows or denies unilaterally.

**Do:** new hook in `cc-track/hooks/` (registered at user scope via `hooks/install.mjs` so it fires for `-p` runs). For a configurable list of tool patterns (`Bash:git push*`, `Bash:rm -rf*`, `WebFetch:*`, and so on), the hook inserts an `approvals` row and polls it (or subscribes via supabase realtime) for a decision, returning `"allow"` or `"deny"` to claude. The UI sidebar shows pending approvals with one-click allow/deny chips. This is the real "steering" story, since mid-turn stdin is off the table.

## Ordered timeline

| Order | Gap                                | Time | Blocked by |
|-------|------------------------------------|------|------------|
| 1     | Runner captures JSON output        | 0.5d | -          |
| 2     | Feedback loop (verifier)           | 1d   | Gap 0      |
| 3     | Cost/budget guards                 | 1d   | Gap 0      |
| 4     | Orchestration (chain + retry)      | 2d   | Gap 0, 1   |
| 5     | Follow-up via --resume             | 1d   | Gap 0      |
| 6     | Prompt / policy library            | 3d   | -          |
| 7     | HITL gates via PreToolUse          | 2d   | -          |

Total: about 10 focused days, all additive to the existing schema.

## What NOT to build

- **A full DAG workflow engine.** Retry + chain covers ~95% of cases; anything harder should adopt Temporal or Inngest rather than reinvent it.
- **A prompt "IDE"** with syntax highlighting, forking, comments. A textarea and versioned rows are enough until multiple humans are editing prompts.
- **Auto-remediation** ("verdict=fail so rewrite the prompt and retry with a new one"). Too many ways to loop expensively. Keep the human in the retry-policy decision.
- **Anything requiring the Agent SDK**, until subscription auth exists for it.

## Existing task IDs

The seven gaps above are already tracked as tasks under the "Constant Improvement" plan (`45799aaa-c873-4386-b424-4b200ee90b1a`) in supabase:

- `31599dd2-451b-4468-92a2-2389bcda9207` Runner: --output-format json
- `8b05dca7-4385-496f-8b67-3d2df79e48d6` Feedback loop: post-run verifier
- `da9c553b-c8df-4181-a519-5842f4f7b0f2` Cost/budget guards
- `4239dc0e-1c4d-4b1e-9ee0-ea729f836c46` Orchestration: parent_run_id, retry, chain
- `1838f3ac-e541-4ace-872a-f09a46c36245` Follow-up via --resume
- `55b40acd-639a-4557-b8ad-f4236d79abee` Prompt / policy library
- `c459d218-e2b6-41c8-9d7b-e093980f709a` HITL gates via PreToolUse
