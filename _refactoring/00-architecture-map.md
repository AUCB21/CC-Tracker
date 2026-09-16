# CC-Track — Architecture Map (Phase 1)

**Method**: `codebase-explorer` skill against the full repo (~153 tracked files, ~90 TS/TSX, ~11.5k LOC across code files).
**Priority axes for later phases**: maintainability/over-engineering → coupling → performance.

---

## Phase 0 — Archetype

**Primary**: Backend API + Frontend Application (Next.js 16 App Router — the two archetypes are one artifact here).
**Secondary**: CLI Tool (`bin/cctrack.mjs`, `bin/agent.mts`), and an external Hooks producer (Node scripts wired into Claude Code that POST into the API).

The system is a hybrid pipeline: Claude Code fires hook events → Node hook scripts → HTTP → Next.js API routes → Supabase; the same Next.js app renders the retrospective UI on top of the same DB. Two vertical slices need to be traced:

- **Ingest slice** (Pipeline Strategy B): follow one hook event from Claude Code's stdin to a rendered row.
- **Attend slice** (Backend API Strategy C, with a spawned CLI child): follow one "Attend" click through queue → agent → child claude → verifier → task auto-complete.

---

## Phase 1 — Orientation

### Q1 · Where is the dirt? (I/O boundary map)

```
                      ┌───────────────────────────────────────────────────────────────────────┐
                      │                                                                       │
Claude Code hooks ──▶ hooks/claude-tracker.mjs ── stdin JSON, timeouts 1.5s ──┐                │
                      │  · git rev-parse / remote get-url  (execFileSync)     │                │
                      │  · summarizeTranscriptText(readFile(transcript_path)) │                │
                      │  · touch .heartbeat, write ~/.cc-track/current-session.json           │
                      │  · fetch /api/health → maybe spawn(wscript.exe VBS)   │  x-api-key   │
                      └───────────────────────────────────────────────────────┘             │
                                                                                              │
Claude Code PreToolUse ─▶ hooks/hitl.mjs ── POST /api/hitl/approvals ── poll GET /[id] ──────▶│
                          exit 0 / 2 to gate the tool call                                    │
                                                                                              ▼
CLI (bin/cctrack.mjs) ── fetch /api/ingest/plan | /api/ingest/task | /api/sessions/*/focus ──▶┤
                                                                                              │
                                                                                              ▼
                                                              ┌────────────────────────────────────┐
                                                              │ Next.js API routes (app/api/**)    │
                                                              │  checkApiKey (x-api-key) ─┐        │
                                                              │  getSupabase() ─── service key ────┼──▶ Supabase (Postgres + Realtime)
                                                              │  processHook / ensureSession / …   │
                                                              └────────────────────────────────────┘
                                                                                              ▲
Browser (server components + Realtime WS) ── read: lib/queries.ts (unstable_cache, 15s) ─────┘
                                              write: server actions (app/**/actions.ts)
                                              live: task_runs, hitl_approvals, sessions, plans, tasks

bin/agent.mts (npm run agent)  ── polls task_runs (POLL_MS=3000) ──▶ spawn `claude -p` cwd=project.path
                                    ├── git rev-parse HEAD, git diff --shortstat, git diff  (spawnSync)
                                    ├── verifier: spawn `claude -p …` again with budget 0.10 USD, max-turns 3
                                    └── cancel poller: DB round trip every POLL_MS

/hub page          ── lib/hub.ts reads (fs, no DB, all guarded):
                        · ~/.claude/settings.json + settings.local.json
                        · ~/.claude.json (mcpServers, projects, pluginUsage, skillUsage)
                        · ~/.claude/plugins/installed_plugins.json + each plugin's install dir
                        · each project's .claude/ + .mcp.json
                     (hubProjectPaths() does one DB call to know which project paths to scan)

/hub toggles       ── lib/hub-write.ts: JSON backup → atomic rename OR `claude plugin enable/disable` exec
                     Backups live in ~/.cc-track/backups/<slug>.<iso>.json (kept 10 latest)
```

**Impurity legend** (○ pure · ● impure · ◐ mixed):

| Module | Class |
|---|---|
| `lib/agent-parse.ts`, `lib/agent-verify.ts`, `lib/series.ts`, `lib/format.ts`, `lib/cost.ts`, `lib/hub-parse.ts` | ○ pure |
| `lib/utils.ts`, `lib/types.ts` | ○ pure |
| `lib/queries.ts`, `lib/attend.ts` | ● impure (Supabase reads/writes) |
| `lib/ingest.ts` | ● impure (Supabase writes) |
| `lib/hub.ts` | ● impure (fs) |
| `lib/hub-write.ts` | ● impure (fs + `execFile("claude", …)`) |
| `lib/supabase.ts`, `lib/supabase-browser.ts` | ● impure factory (env + WS) |
| `hooks/*.mjs`, `bin/*` | ● impure (stdin, fs, spawn, fetch) |
| App-router pages | ◐ mostly server-component reads via `lib/queries.ts` |

### Q2 · What is the substrate? (Constraints in force)

| Constraint | Value | Source |
|---|---|---|
| Hook fetch timeout | 1500ms | `hooks/claude-tracker.mjs` |
| Hook git-info timeout | 1500ms each | `hooks/claude-tracker.mjs` |
| Health probe timeout | 500ms | `ensureTrackerUp` |
| HITL post/poll timeout | 5s / 3s / 2s (create/poll/timeout-mark) | `hooks/hitl.mjs` |
| HITL overall timeout | 60s default | `CC_TRACK_HITL_TIMEOUT_MS` |
| HITL fail-open policy | flips fail-closed once `config.json` sets `hitl_fail_closed: true` | `install.mjs` sets it |
| CLI fetch timeout | 10s | `bin/cctrack.mjs` |
| Agent poll interval | 3000ms | `POLL_MS` |
| Agent DLL-init retries | 3 attempts, 1s/2s/4s backoff, only on exit `0xC0000142` | `bin/agent.mts` |
| Agent concurrent runs | **1 per agent** (`busy` flag) | `bin/agent.mts:77` |
| Verifier budget | $0.10 / 3 turns / 64KB diff, 20KB cap into prompt | `bin/agent.mts`, `lib/agent-verify.ts` |
| Task-run stdout tail | 8 KB | `TAIL_BYTES` |
| Supabase `.limit()` silent cap | **1000 rows** — driver-side, not documented | `lib/queries.ts` keyset paginates via `getEventsSince` |
| Server-component list cache | 15s `unstable_cache` revalidate | `lib/queries.ts` (stats, recent sessions, facets, activity) |
| Prompt truncation | 4000 chars | `processHook` UserPromptSubmit, SubagentStop |
| Tool input/response truncation | 2000 chars | `truncStr` |
| Hub backup retention | 10 newest per slug | `lib/hub-write.ts` |
| Idle timeout | `IDLE_TIMEOUT` env, 60s default | `start.sh` (autoshut) |
| Client heartbeat | 10s while `visibilityState === "visible"` | `app/layout.tsx` inline script |
| Auto-boot | Windows-only via `wscript.exe start-hidden.vbs`; other OSes silently no-op | `hooks/claude-tracker.mjs:34` (self-flagged ponytail comment) |
| Row-page overrun | PostgREST 416 → `count = null` → shown as 0; UI Pager never links there | `lib/queries.ts:282` (self-documented) |

### Q3 · What are the implicit contracts? (Fragility list)

**Magic strings** that encode business semantics:

- `hook_event_name`: `"SessionStart" | "UserPromptSubmit" | "PostToolUse" | "Stop" | "StopFailure" | "SessionEnd" | "SubagentStart" | "SubagentStop" | "Notification"` — big switch in `lib/ingest.ts`. `default:` catches unknown events as generic `<name>` type rows, so new upstream events fail open, not closed. **This is fine.**
- Tool names inside `PostToolUse`: `"TodoWrite" | "Agent" | "TaskStop" | "SendMessage" | "TaskGet" | "TaskOutput"` each has a hand-rolled event shape (`subagent_dispatch`, `subagent_poll`, `subagent_kill`). If Anthropic renames one, its events silently degrade to generic `tool_use` rows. Tracker keeps working; analytics that groups by these strings goes empty. **Yellow.**
- `status` string enums for `sessions`, `plans`, `tasks`, `task_runs`, `hitl_approvals`, `verdict` — mirrored in DB `CHECK` constraints AND in TS union types AND in code (`TASK_RUN_TERMINAL`). Three sources of truth. **Yellow.**
- `trigger` values on `task_runs`: `"manual" | "retry_on_fail" | "followup" | "chain"` — no DB CHECK constraint (deliberate, self-documented at `schema.sql:171`); `RESUME_TRIGGERS` in `bin/agent.mts` hardcodes the whitelist. `chain` never gets inserted anywhere but appears in the type. **Green (dead branch, harmless).**
- `dedupe_key` format: `` `tw:${projectId ?? sessionId}:${sha1(content)}` `` and `` `cli:${projectId ?? sessionId}:${sha1(content)}` ``. Because the hash is over content only, **editing a TodoWrite/CLI task's text produces a new row.** Historical rows keep old session-scoped keys — no backfill. **Yellow (documented as forward-only in `ingest.ts` + `task/route.ts`).**
- `SUPABASE_SECRET ?? SUPABASE_SERVICE_ROLE_KEY` fallback — server-only.
- `parseTrailingJson`: grabs the last balanced `{…}` in claude's stdout. If claude ever prints a JSON payload before the final result blob, this picks the wrong one. **Yellow.** Currently safe because `--output-format json` emits exactly one blob.
- HITL matcher: `JSON.stringify(tool_input).includes(substr)` — false-negatives against needles containing `"` or `\`. **Self-documented.**
- Windows-only auto-boot (`wscript.exe`, `taskkill /T /F`, `.local\bin\claude.exe`) — no POSIX equivalent yet. `hooks/claude-tracker.mjs:34` explicitly flags this. **Yellow, single-user Windows-primary repo.**

**Numeric literals worth noting**: `TAIL_BYTES = 8 * 1024`, `MAX_RETRIES_PER_LINEAGE = 2`, `VERIFIER_BUDGET_USD = 0.10`, `VERIFIER_MAX_TURNS = 3`, `PAGE = 1000` (Supabase limit workaround), `revalidate: 15`. All named, all in one place. **Fine.**

### Q4 · Where is attention flowing? (Activity heat map)

Git history: 158 commits in the last 6 months (velocity: healthy, single-author flow).

**Hot zone — heavy design/UI churn (top by commit count over 6 months)**:

| File | Commits (6mo) | LOC | Note |
|---|---|---|---|
| `components/ui.tsx` | 25 | 883 | Grew into a kitchen-sink primitive file (Card, Fold, Stat, Chip, IconButton, ErrorAlert, Badge, Progress, RailIcons, TrendDelta, Sparkline, Empty, Breadcrumbs, PageHeader, TaskLine, SetupBanner, NavBadge, Input, Textarea, Label, InlineError, ActionIcons, LiveDot, Fold, etc.) |
| `app/globals.css` | 22 | — | Tokens + recipes |
| `app/layout.tsx` | 21 | 242 | Root shell + inline `<Script>` bootstrap + heartbeat |
| `app/live/live-feed.tsx` | 15 | 508 | Big client component |
| `components/mobile-nav.tsx` | 14 | 287 | |
| `supabase/schema.sql` | 13 | 301 | Migrations kept as `alter table … if not exists` in one file |
| `app/tasks/attend-button.tsx` | 12 | 295 | Client component with many states + Realtime channel |
| `components/charts.tsx` | 11 | 356 | Recharts lazy-loaded |
| `app/plans/page.tsx` | 10 | 199 | |
| `app/page.tsx` | 10 | 296 | Overview |
| `components/deck-rail.tsx` | 10 | — | Sidebar rail |

**Stable zone (moderate churn, load-bearing)**:

| File | Commits | LOC | Role |
|---|---|---|---|
| `lib/queries.ts` | 8 | 427 | UI read path |
| `bin/agent.mts` | 8 | 527 | Attend runner + verifier |
| `lib/ingest.ts` | 7? | 469 | Hook write path |
| `lib/hub.ts` | — | 670 | /hub read |
| `app/hub/page.tsx` | — | 476 | /hub render |

Recent commit subjects reveal an ongoing **design system consolidation** (sidebar redesign, IconButton primitive, ErrorAlert primitive, Chip Phase-A extraction, light-theme audit). This is the branch's stated purpose (`feat/sidebar-and-polish`), so hot UI files are the *expected* battlefield, not necessarily where refactor value hides.

---

## Vertical Slice A — Ingest (Pipeline)

One TodoWrite event, end to end:

| Stage | File · Lines | Reads | Adds / modifies | External | Storage / next-stage contract |
|---|---|---|---|---|---|
| 1. hook fires | `hooks/claude-tracker.mjs:83` (`main`) | stdin JSON | `cwd`, `git_branch`, `repo`, `summary` (on Stop) | `execFileSync git`, `readFileSync transcript_path`, `touch .heartbeat`, `spawn wscript.exe VBS`, `fetch /api/health` | POST → `/api/ingest/hook` with `x-api-key`, 1.5s timeout, silent on fail (never blocks Claude Code) |
| 2. route | `app/api/ingest/hook/route.ts:6` | body | validates `session_id` present | `checkApiKey`, `getSupabase` | Calls `processHook(db, payload)` |
| 3. resolve project | `lib/ingest.ts:63` (`resolveProject`) | `cwd`, `repo` | upserts `projects` row by `path` (normalized) | Supabase | `project_id` |
| 4. ensure session | `lib/ingest.ts:84` (`ensureSession`) | `session_id`, `project_id` | upsert `sessions`, revives an ended session on new activity | Supabase | `session_id` |
| 5a. PostToolUse: TodoWrite branch | `lib/ingest.ts:265` | `tool_input.todos` | `syncTodoWrite`: dedupes by `sha1(content)`, updates or inserts each task | Supabase | `tasks` rows, one `tasks_synced` event |
| 5b. Other PostToolUse | `lib/ingest.ts:340` | `tool_name`, `tool_input`, `tool_response` | Increments `tool_use_count` + `tool_breakdown` on the session; inserts an event row (`tool_use` or one of `subagent_dispatch`/`subagent_poll`/`subagent_kill`) | Supabase | `events` row |
| 6. UI read | `lib/queries.ts` various | Supabase | Wrapped by `unstable_cache` (15s TTL, tag-invalidated) | | Server components read; browser subscribes to Realtime for live views |

**Inter-stage contracts**:
- Hook script assumes `payload.session_id` is a UUID; `processHook` throws if missing (returns 400). Router treats missing session_id as a validation error (see `route.ts:24`).
- `tool_input.todos` must be `{content, status, activeForm?}[]`; the code narrows via cast; malformed arrays fall through as ordinary `tool_use` events.
- `dedupe_key` is content-scoped (not identity-scoped) — editing a task's text creates a *new* task row on the next TodoWrite sync.

## Vertical Slice B — Attend (Backend + CLI child)

One "Attend" click:

| Stage | File · Lines | Contract |
|---|---|---|
| 1. Click | `app/tasks/attend-button.tsx` `handleAttend` | Server action `queueAttend(taskId, override)` |
| 2. Server action | `app/tasks/actions.ts` → `lib/attend.ts:enqueueTaskRun` | Fetches task+plan+project, checks `per_run_budget_usd` against `project_daily_spend` view, builds prompt (`buildAttendPrompt`), inserts `task_runs` row (`status=queued`) |
| 3. Poller | `bin/agent.mts:tick` every `POLL_MS` | Reads up to 5 queued rows joined with `projects(path, per_run_budget_usd, per_run_max_turns)`, skips if `path` doesn't exist locally |
| 4. Claim | `bin/agent.mts:claim` | Atomic guarded update `status: "queued" → "claimed"` with `agent_id` + `claimed_at` — the `.eq("status","queued")` clause serves as the compare-and-swap |
| 5. Execute | `bin/agent.mts:execute` | Spawns `claude -p <prompt>` (or `--resume <sid>` for followup/retry) with `--permission-mode acceptEdits`, tails 8KB of stdio, flushes DB every ≥2s. On `0xC0000142` retries up to 3 times |
| 6. Cancel channel | `bin/agent.mts:363` | Interval polls its own row every 3s; UI flips row to `cancelled` and the child gets `taskkill /T /F` (win) or `child.kill()` |
| 7. Post-run | `bin/agent.mts` | Parses trailing JSON blob → writes `claude_session_id`, `total_cost_usd`, `usage` |
| 8. Verifier | `runVerifier` → `lib/agent-verify.buildVerifyPrompt` | `git rev-parse HEAD` before and after; if same → verdict `needs_review` ("no committed changes"); else spawn cheap claude with budget $0.10 and 3 turns to grade the diff; verdict `pass / fail / needs_review` |
| 9. Auto-complete | last block of `execute` | Task → `completed` unless verdict is `fail` or `needs_review` |
| 10. Retry lineage | `enqueueRetry` + `countAncestorRetries` | Failed run + `retry_on_fail` inserts a child row; ≤ 2 retries per lineage (walks `parent_run_id` in memory, one DB round trip) |

**Cross-slice coupling**: the Attend flow's child spawns fire *the same* `hooks/claude-tracker.mjs`, so the same DB is written by both the child's tracker hooks and the parent's runner. `task_runs.claude_session_id` was originally a FK to `sessions(id)`; that FK was dropped (`schema.sql:167`) because the runner writes the session ID before the child's hooks have inserted the sessions row. **Race is documented.**

## Vertical Slice C — HITL gate

`hooks/hitl.mjs` receives Claude Code PreToolUse stdin → matcher tests → POST `/api/hitl/approvals` → poll `/api/hitl/approvals/[id]` every 1s → on `approved` exit 0, on `denied`/timeout exit 2. Best-effort mark-as-timeout on the way out. Realtime publication on `hitl_approvals` drives the /hitl UI live. Fail-open by default (never wedges when HITL isn't set up); once `hitl_fail_closed: true` is in `~/.cc-track/config.json` (installer sets this), a tracker error *after a matcher fired* denies the call.

## Vertical Slice D — Hub (config viewer)

`lib/hub.ts:getHub` reads user + project + plugin config files from disk with per-file guarded I/O (never throws). Produces a flat `HubItem[]` + `HubWarning[]`. Rendered by `app/hub/page.tsx` (476 LOC). Toggles route through `app/api/hub/toggle` → `lib/hub-write.ts` which either JSON-backup-then-atomic-rename or invokes the `claude` CLI for `plugin enable/disable` and confirms via re-read. **Never edits `~/.claude.json`** (has OAuth tokens; documented policy).

---

## Phase 3 — Smell scan (universal + backend-relevant)

| Smell | Presence | Notes |
|---|---|---|
| Hidden Schema | ● | String-matched tool names dispatch to different event shapes (`ingest.ts:264`). Impact: bounded to analytics coverage. |
| Silent Overflow | ○ | Everything reads finite Supabase pages; `getEventsSince` keyset-paginates; the loop breaks at `< PAGE`. Truncations are explicit (4000 for prompts, 2000 for tool payload, 8KB for stdout). |
| God Object | ● | `components/ui.tsx` at 883 LOC + 25 recent commits is trending toward one. `bin/agent.mts` at 527 LOC holds run-loop, DLL retry, cancel poller, verifier, retry-lineage, and process spawn in one file. |
| Orphaned Error | ● | Silence-on-fail is deliberate at the hook boundary (never block Claude Code). Inside API routes, `console.error("[ingest/hook]", e)` is the only log — no request id, no correlation. Impact: single-user, tolerable. |
| Time Bomb | ○ | No hardcoded years or fixed comparison dates found. |
| Drifting Duplicates | ● | Verdict enums live in three places (SQL CHECK, TS union, string comparisons). `dedupe_key` prefix (`"tw:"` / `"cli:"`) is duplicated between `ingest.ts:syncTodoWrite` and `app/api/ingest/task/route.ts` — same key format, two implementations. |
| Implicit Inter-Stage Contract | ● | `tool_input.todos` shape is cast, not validated (`ingest.ts:266`). Malformed data silently downgrades to a `tool_use` event. |
| Path Convention as Schema | ○ | Very little hardcoded path logic; `normalizePath` centralizes it. |
| Shared Utility SPOF | ● | `components/ui.tsx` is imported ubiquitously. `lib/queries.ts` is the single UI read surface. Both are healthy at this scale but note them. |
| CSRF-adjacent surface | ○ | All ingest routes require `x-api-key`; server actions are same-origin. |
| Feature-flag ghost | ● | `chain` trigger appears in `TaskRun.trigger` and `RESUME_TRIGGERS` comment but nothing inserts it. Small dead branch. |

---

## Phase 4 — Risk profile and ranked scan order for Phase 2

**Risk profile** (not vague — action-oriented):

1. **`components/ui.tsx` (883 LOC, 25 commits) is one file that is really seven files.** Any UI-primitive change enters a merge-conflict-magnet. Splitting into `ui/card.tsx`, `ui/chip.tsx`, `ui/rail-icons.tsx`, `ui/badge.tsx`, `ui/form.tsx`, `ui/typography.tsx`, `ui/misc.tsx` (or similar) is the highest-value single move; a barrel `components/ui/index.ts` keeps existing imports stable.
2. **`bin/agent.mts` (527 LOC) mixes six concerns**: polling, claiming, spawning, DLL retry, cancel poller, verifier, retry-lineage. Refactor target: pull the verifier (already partially split into `lib/agent-verify.ts`) fully out; pull the spawn + retry into a `runClaude()` helper; pull the cancel-poller into a small state machine. Impact: agent bugs are hardest to reproduce (need a queued row + a running child); smaller functions are testable in isolation.
3. **`lib/ingest.ts` (469 LOC) has a giant switch with hand-rolled per-tool cases embedded** in the `PostToolUse` branch. Extract each into a `handlePostToolUse<ToolName>` dispatcher entry — same logic, addressable by grep, easier to add the next Anthropic tool without editing the giant switch.
4. **`app/hub/page.tsx` (476 LOC) and `app/live/live-feed.tsx` (508 LOC) are big client components.** Both are hot in the branch. Worth an audit to see if the current density is warranted.
5. **`lib/queries.ts` (427 LOC) has ~15 similar functions with mixed caching.** Some pages hit `unstable_cache` versions, some don't. Worth checking whether the non-cached ones deserve it and whether the cached ones ever get invalidated (I see `tags: ["stats" / "sessions" / …]` but no `revalidateTag(...)` calls anywhere).
6. **`lib/hub.ts` (670 LOC) is dense but well-structured** (guarded I/O, per-source collectors, clear phases). Read carefully in Phase 2 — the density is what the domain is, not accidental complexity — but check if `getHub` could return a builder rather than a monolith to make it easier to unit-test.
7. **Dedupe-key duplication** between `syncTodoWrite` (ingest.ts) and the `POST /api/ingest/task` handler is a small extract-and-share opportunity.
8. **Verdict / status enum triple-source** (SQL CHECK, TS union, code string literals) — a single `lib/enums.ts` with `as const` arrays and derived types would keep them in lockstep.

**Unknowns** (won't fix in Phase 2 without your input):
- Whether the WhatsApp/NL ingestion path mentioned in `PRODUCT.md` will ever exist (currently theoretical, "no endpoint exists").
- Whether `chain` trigger dead branch is intentional (leave for future) or garbage.
- Whether density of `app/globals.css` tokens is over/under; needs the impeccable design lens, not a code review.

---

## Recommended Phase 2 scan order

Ranked by **impact × probability of finding real, actionable issues** at maintainability/coupling/perf priority. Modules in Phase 2 scans get one `thermo-nuclear-code-quality-review` pass each.

| Rank | Module (path glob) | Why first |
|---|---|---|
| 1 | **`components/ui.tsx`** | Biggest single file, hottest churn, most obvious split opportunity. |
| 2 | **`bin/agent.mts`** | Mixed concerns; refactors are highest-impact because bugs here are prod-visible (failed runs). |
| 3 | **`lib/ingest.ts`** | Central write path; giant switch is the classic maintainability tax. |
| 4 | **`lib/queries.ts`** | Central read path; caching consistency and projection width both worth checking. |
| 5 | **`app/hub/page.tsx` + `lib/hub.ts` + `lib/hub-parse.ts` + `lib/hub-write.ts`** | One coherent subsystem; audit as one module. |
| 6 | **`app/live/live-feed.tsx` + `components/live-timeline.tsx`** | Big client components; audit together. |
| 7 | **`app/tasks/attend-button.tsx` + `app/tasks/actions.ts` + `lib/attend.ts`** | The Attend UI chain; state-heavy client + server action + queue insert. |
| 8 | **`app/api/**/route.ts` (small routes)** | Boilerplate consistency (checkApiKey, error handling, JSON parsing) — batch-audit as one group. |
| 9 | **`app/analytics/page.tsx` + `components/charts.tsx` + `lib/series.ts`** | Analytics rollup; check aggregate projections against `lib/queries.ts` output. |
| 10 | **`hooks/*.mjs` + `bin/cctrack.mjs` + `bin/agent.mts`** | Node scripts — different lint/style rules; audit as a group. |

Files **NOT** worth a Phase 2 pass in this priority:
- `lib/agent-parse.ts`, `lib/agent-verify.ts`, `lib/hub-parse.ts`, `lib/series.ts`, `lib/cost.ts`, `lib/format.ts`, `lib/utils.ts`, `hooks/transcript.mjs` — pure helpers with tests; stable; small; well-scoped.
- `supabase/schema.sql` — audit only if a Phase 3 RFC touches the data model.
- The many small `app/api/*/[id]/route.ts` files — 1-2 line handlers each; batch with #8 if at all.

---

## Handoff to Phase 2

Phase 2 (`thermo-nuclear-code-quality-review`) runs per module in the order above; findings collect at `_refactoring/01-quality-audit.md`. After each module, the tally updates and progress writes back to `_refactoring/scope.md`. User picks the modules that graduate to Phase 3.
