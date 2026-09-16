# CC-Track — Quality Audit (Phase 2)

**Method**: `thermo-nuclear-code-quality-review` per module, following the scan order from `_refactoring/00-architecture-map.md`.
**Priority axes**: maintainability/over-engineering → coupling → performance.
**Severity legend**: **RED** (must fix, structural), **YELLOW** (should fix, real cost), **GREEN** (nit, note only).

Findings normalized as:
- **[SEVERITY]** category — `file:line` — description — suggested direction.

Each module also gets a one-line health tally at the end.

**Method note**: `thermo-nuclear-code-quality-review` was installed post-session and could not be invoked as a live skill; its `SKILL.md` was read from `~/.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` and its rubric (ambitious code-judo restructuring, spaghetti detection, boundary/type cleanliness, file-size discipline, canonical-layer reuse) is applied by hand per module.

---

## Module 1 — `components/ui.tsx` (883 LOC, 25 commits/6mo)

### Findings

- **[RED]** file-sprawl — `components/ui.tsx:1-883` — one file exports 23+ unrelated primitives (Card, Fold, Stat, Chip, IconButton, ErrorAlert, Badge, Progress, RailIcons, ActionIcons, LiveDot, Sparkline, TrendDelta, SetupBanner, Empty, PageHeader, Breadcrumbs, TaskLine, NavBadge, Input, Textarea, Label, InlineError, three style constants). **Judo move**: split into `components/ui/{card,chip,stat,field,icons,list,tokens}.tsx` + `components/ui/index.ts` barrel. Import paths stay stable; blast radius per change collapses. This actively blocks parallel UI work today (25 commits in 6 months on one file = merge-conflict magnet).
- **[YELLOW]** duplicate-variant — `components/ui.tsx:667-687` — `CHIP_VARIANT_CLASS` has seven variants but `pass` = `allow` and `fail` = `deny` (identical border/bg/text tuples). Collapse to five variants; alias `pass/fail` at call sites via a small `variantForVerdict()` helper if the naming matters at call-sites.
- **[YELLOW]** duplicated-style-source — `components/ui.tsx:12-34` — `PANEL_STYLE`, `STAT_STYLE`, `CELL_STYLE` live as inline JS style objects AND (per the calls to `className="deck-card"`) exist as CSS classes. Two owners of the same tokens will drift. Pick one — CSS classes with `var(--…)` tokens are the norm in this project and win here; delete the JS `*_STYLE` objects.
- **[YELLOW]** three-layer-icon-map — `components/ui.tsx:569-612` — `RAIL_ICON_PATHS` object + `RailIcon` wrapper + `RailIcons` mapping is triple-indirection over `<svg><path d="…"/></svg>`. Callers only use `RailIcons.tasks` etc. Options: (a) collapse to `<RailIcon name="tasks"/>` reading the map internally; (b) inline the SVGs in `components/deck-rail.tsx` (their sole consumer) and delete the abstraction entirely. Prefer (b) — less code, less indirection.
- **[GREEN]** magic-level-prop — `components/ui.tsx:81-128` (Fold) — `level: 1 | 2` reads clumsily at call sites; `variant: "owner" | "type"` would name the intent. Cosmetic; note only.

### Health
**RED** — one file is one file too many; split first, everything else is easier after.

---

## Module 2 — `bin/agent.mts` (527 LOC)

### Findings

- **[RED]** mixed-concerns — `bin/agent.mts:1-527` — one file holds env resolution, single-flight polling, claim, spawn primitive, git wrappers, verifier, retry-lineage arithmetic, cancel poller, DLL-init retry, and the huge orchestration function. **Judo move**: keep `bin/agent.mts` as a ~150-line entry (env + poll loop + claim), extract `lib/agent-run.ts` (spawnOnce + execute + cancel), `lib/agent-git.ts` (three git helpers). `lib/agent-parse.ts` and `lib/agent-verify.ts` already prove the split works — finish it.
- **[RED]** 160-line-function — `bin/agent.mts:310-468` (`execute`) — parent-commit snapshot, resume-session lookup, three stdout callbacks with shared flush-debounce, DLL retry loop, cancel poller, post-run patch, verifier dispatch, task auto-completion all inline. Extract at minimum `driveClaudeChild(args, cwd, run, flush) → {result, stdoutFull, stdoutTail}` and `finishRun(run, parentCommit, projectPath) → {verdict, taskAutoCompleted}`. `execute` then reads top-to-bottom in ~30 lines.
- **[YELLOW]** mutable-global-plus-timer — `bin/agent.mts:77 + 524-527` — `let busy = false` + `setInterval(tick, POLL_MS)` + `finally { busy = false }` is the "one concurrent run per agent" policy expressed as shared mutable state read+written across awaits. A `while (true) { await tick(); await sleep(POLL_MS); }` shape has the same guarantee with no shared state; the `busy` flag disappears.
- **[YELLOW]** dual-timer-per-run — `bin/agent.mts:362-371` — cancel poller uses its own `setInterval`; after child exits, the last tick can still fire once. Fold cancellation into `driveClaudeChild` via `AbortController` or via a shared flush timer; one less concurrent side-effect per run.
- **[YELLOW]** whitelist-set-plus-comment — `bin/agent.mts:252 + lib/types.ts:73` — `RESUME_TRIGGERS = new Set(["followup","retry_on_fail"])` is a runtime whitelist for a string field that has no DB CHECK constraint and no TS enum. And `chain` is declared valid in comments but never inserted anywhere. Extract `type TaskRunTrigger = "manual" | "retry_on_fail" | "followup"` with `RESUMES: Record<TaskRunTrigger, boolean>` in `lib/types.ts`; the Set disappears; `chain` gets deleted.
- **[YELLOW]** leaking-verifier-policy — `bin/agent.mts:428-455` — the "HEAD unchanged → verdict=needs_review" branch is authored inline in `execute`. `runVerifier` already accepts (parentCommit, headCommit); it should detect the no-diff case itself and return that verdict. Moves policy behind the abstraction; caller stays orchestration-only.
- **[GREEN]** DLL-init retry (`bin/agent.mts:48-49, 374-390`) is a real Windows problem, well-documented, and correctly self-limits. Leave alone.

### Health
**RED** — highest-impact refactor in the repo; bugs here are prod-visible (broken attend runs) and hardest to reproduce.

---

## Module 3 — `lib/ingest.ts` (469 LOC)

### Findings

- **[RED]** nested-switch-dispatch — `lib/ingest.ts:206-466` — one 260-line function with an 8-case outer switch on `hook_event_name`, whose `PostToolUse` case wraps a 6-case inner switch on `tool_name`. Adding an event or a tool means editing a giant function. **Judo move**: dispatch map `const hookHandlers: Record<string, HookHandler> = { SessionStart, UserPromptSubmit, PostToolUse: dispatchPostToolUse, ... }`; `dispatchPostToolUse` is its own file with one exported handler per instrumented tool. Everything greppable, everything small.
- **[YELLOW]** duplicated-dedupe-key — `lib/ingest.ts:152 + app/api/ingest/task/route.ts:85` — dedupe-key format `` `<kind>:${projectId ?? sessionId}:${sha1(content)}` `` is authored inline in both places. Extract `dedupeKeyFor(kind: "tw" | "cli", scopeId: string, content: string): string` in `lib/ingest.ts` (or a new `lib/dedupe.ts`) and call it from both sites.
- **[YELLOW]** local-helpers-in-a-fn — `lib/ingest.ts:200-204` — `withPid`, `truncStr` defined inside `processHook`. They close over nothing (pure) and could sit at module scope; then event handler extractions can use them without lifting each helper. `truncate` already exists in `lib/format.ts`; consider consolidating there.
- **[YELLOW]** N+1-in-todowrite — `lib/ingest.ts:143-186` (`syncTodoWrite`) — one `.select("id,status").eq("dedupe_key", ...).maybeSingle()` per todo item. On a 20-item TodoWrite that's 20 sequential round trips. Batch: one `.in("dedupe_key", allKeys)` + in-memory map, then a single upsert per row. Even better: Postgres upsert on `dedupe_key UNIQUE` with `onConflict` collapses the read-or-update-else-insert branch entirely.
- **[YELLOW]** stale-repo-write — `lib/ingest.ts:213-215` — `SessionStart` handler runs `update({repo: payload.repo}).eq("id", projectId)` if `payload.repo`. This is projects-table logic tacked into the session handler, and `resolveProject` only writes repo on `insert`, never on subsequent SessionStarts for an existing project row. Move repo-writing into `resolveProject` (upsert-if-missing) or a dedicated `updateProjectRepoIfChanged` helper. Delete the inline branch.
- **[YELLOW]** unknown-drilling — `lib/ingest.ts:257-263, 266-273` — `tool_input` and `tool_response` typed as `unknown` at the payload boundary, then cast to `Record<string, unknown>` (`asRecord`) and drilled with property access + more casts (`todos as {content: string; ...}[]`). Two options: (a) discriminated union per tool name with a small parser at the switch; (b) accept the loose shape and validate each field explicitly. Right now the code type-asserts and hopes.
- **[GREEN]** `default:` catch-all (line 460) that inserts a generic event row for unknown hook events is the right choice — new upstream events fail-open. Leave alone.

### Health
**RED** — central write path; the switch is the classic maintainability tax and the N+1 has a real cost.

---

## Module 4 — `lib/queries.ts` (427 LOC)

### Findings

- **[YELLOW]** repeated-null-guard — `lib/queries.ts` × 22 functions — same three lines `const db = getSupabase(); if (!db) return null; ... return (data as X[]) ?? []`. One `withDb<T>(fn: (db) => Promise<T>): Promise<T | null>` helper collapses every call to 3-5 lines. Kills 60+ lines of ceremony.
- **[YELLOW]** cache-inconsistency — `lib/queries.ts` — `getStats`, `getRecentSessions`, `getSessionStartsSince`, `getSessionFacetRows`, `getTaskFacetRows`, `getPlanFacetRows`, `getRecentActivityEventsCached` use `unstable_cache` (15s TTL). Everything else doesn't. Overview page hits some cached + some uncached reads for the same dashboard. Establish an explicit rule ("dashboard aggregates → 15s cache, per-record reads → uncached") or extract a `cached15(fn, key, tags)` decorator so the pattern is visible everywhere.
- **[YELLOW]** dead-cache-tags — `lib/queries.ts` × 7 sites — every `unstable_cache` call passes `tags: ["stats" | "sessions" | ...]` but `revalidateTag(...)` is never called anywhere in the repo. Tags are decorative. Either wire tag invalidation on `processHook` writes (`revalidateTag("stats")` after any ingest that changes counts) or drop the `tags` config so it stops implying invalidation that never happens.
- **[YELLOW]** projection-width — `lib/queries.ts:96, 244, 303` — `getSessions`, `getRecentSessions`, `getSessionsPage` all use `select("*")` on a table with a `tool_breakdown jsonb` column. `getAllSessions` has a narrow `ANALYTICS_SESSION_COLS` — the discipline exists, it's just not applied everywhere. Add a `SESSION_LIST_COLS` and use it on every list-view read. Same treatment for tasks and plans.
- **[YELLOW]** columns-escape-hatch — `lib/queries.ts:110, 121` — `opts.columns?: string` on `getPlans`, `getTasks` is a per-call override with `as unknown as X[]` casts. That knob exists precisely to fix the projection-width problem above — but as an opt-in per-caller, not a default. Fix the defaults and delete the knob.
- **[YELLOW]** page-cap-magic — `lib/queries.ts:173` — `const PAGE = 1000` is Supabase's silent driver cap, not a page size the caller chose. Rename to `SUPABASE_ROW_CAP` and consider hoisting to `lib/supabase.ts` where the same cap will apply to any future keyset paginator.
- **[GREEN]** `rangeFor` + PostgREST 416 note (line 282) is precisely the kind of defensive doc-comment I want to see. Leave alone.

### Health
**YELLOW** — patterns work individually; consolidation removes ~80 LOC and makes cache behavior legible at a glance.

---

## Module 5 — Hub subsystem (`lib/hub.ts` + `lib/hub-parse.ts` + `lib/hub-write.ts` + `app/hub/page.tsx`)

### Findings

- **[YELLOW]** single-func-orchestration — `lib/hub.ts:325-660` — `getHub` is one 336-line function with clearly-commented phases. Each `// ---- X ----` block should be its own function; `getHub` becomes ~40 lines of orchestration. Beyond readability: phases become independently unit-testable (the pure `lib/hub-parse.ts` bits already are; orchestration isn't).
- **[YELLOW]** type-home-scatter — `lib/hub.ts:35-79` — `SettingsFile`, `ClaudeJsonShape`, `PluginEntry`, `McpServerDef`, `ClaudeProjectEntry`, `MergedClaudeProject`, `HookCandidate`, `HookGroup`, `HookEntry`, `McpJsonSource`, `McpJsonDecisionResult` all live in `lib/hub.ts` while related types live in `lib/hub-parse.ts`. Move them to `lib/hub-parse.ts` (the "no server-only, no fs, safe from tests" module by intent) or split off `lib/hub-schema.ts`. Right now: parse module owns some types, write module owns some more, hub.ts hoards the rest.
- **[YELLOW]** duplicated-fs-guards — `lib/hub.ts:82-108 + lib/hub-write.ts:186` — `readJsonSafe`/`readTextSafe`/`readdirSafe`/`statSafe` in hub.ts and `readJsonQuiet` in hub-write.ts do the same "swallow error, return undefined/[]" trick. Extract `lib/fs-safe.ts`, import from both.
- **[YELLOW]** three-copies-of-skills-agents-commands — `lib/hub.ts:266-323 (collectSkillsAgentsCommands) + 442-496 (plugin dir walk)` — same "iterate `skills/*/SKILL.md`, `agents/*.md`, `commands/*.{md,toml}`" walk in two places (called from three call sites: user configDir, per-project, per-plugin). Extract one async iterator; caller decides the naming namespace. Kills ~60 lines of parallel code.
- **[YELLOW]** page-owns-derived-view — `app/hub/page.tsx:118-199 (deriveOwners) + 226-255 (ItemRow)` — 90 lines of "flatten HubItem[] into owner groups + presentation types" and a 30-line component sit in the page module. `deriveOwners` belongs in `lib/hub-view.ts` (pure data transform). `ItemRow` belongs in `components/hub-item-row.tsx`. Page shrinks to ~250 LOC of rendering.
- **[GREEN]** `hub-write.ts:updateJsonFile` (backup → atomic rename) is well-designed. Leave alone.
- **[NOTE]** `lib/hub.ts:216` self-flags an unknown ("most-specific-wins; Claude Code's exact merge is undocumented, revisit if a toggle looks ignored") — worth harvesting via `/ponytail-debt` for tracking.

### Health
**YELLOW** — dense but structurally sound; opportunistic decomposition unlocks unit tests and cross-file reuse.

---

## Module 6 — Live subsystem (`app/live/live-feed.tsx` + `components/live-timeline.tsx`)

### Findings

- **[RED]** cross-file-duplication — `app/live/live-feed.tsx:29-42 + 178-244` ⇔ `components/live-timeline.tsx:8-29 + 35-108` — `EVENT_MARK`, `eventTone`, and the ~80-line block that renders a row for prompt/tool_use/subagent_dispatch/subagent_kill/subagent_poll is copy-pasted between the two files. Truncation lengths differ (140 vs 90 for prompt content) but the structure is identical. **Judo move**: extract `components/event-row.tsx` with `EventRow` component + `eventTone` + `EVENT_MARK`; both callers import it and pass a `truncate: {prompt, toolInput}` prop.
- **[YELLOW]** iife-per-event-type — `app/live/live-feed.tsx:208-241 + components/live-timeline.tsx:72-105` — `subagent_dispatch/kill/poll` branches are `(() => { const d = e.data as {...}; if (...) return ...; })()` IIFEs. Structurally these are subtype-dispatched renderers. Introduce `type FeedEventContent = { kind: "prompt", prompt } | { kind: "tool_use", ... } | { kind: "subagent_dispatch", ... } | ...` and a `parseEventContent(e: EventRow): FeedEventContent | null`. Row rendering becomes a switch on the discriminant; adding a new event type = one new branch, one new type variant, done.
- **[YELLOW]** two-lineage-computations — `app/live/live-feed.tsx:47-77 (computeLineageMap)` ⇔ `bin/agent.mts:273-294 (countAncestorRetries)` ⇔ `lib/attend.ts:126-169 (getLineageStatsByTask)` — three independent implementations of "walk parent_run_id from a leaf". They disagree on out-of-window behavior (server returns nothing, client returns 2). If the client truly needs realtime lineage, extract `lib/lineage.ts` with one pure `computeLineage(runs: Row[]): Map<id, {n,m}>` and share.
- **[YELLOW]** poll-vs-realtime-inconsistency — `app/live/live-feed.tsx:362-404` uses Realtime subscription; `components/live-timeline.tsx:128-168` uses HTTP polling with exponential backoff. This is deliberate (per-session filtering in the timeline) but documented nowhere. Add a one-line comment at the top of each explaining the trade-off, or move the timeline to Realtime with a client-side `session_id` filter.
- **[YELLOW]** manual-searchparams — `app/live/live-feed.tsx:420-425` — `new URLSearchParams(window.location.search)` + `router.push` roundtrip could use `useSearchParams` + `useRouter` idioms. Cosmetic.
- **[GREEN]** `RunCard` with a custom `memo` compare (`app/live/live-feed.tsx:168-174`) is exactly right. Leave alone.

### Health
**RED** — copy-paste debt is the story here; one extraction eliminates 80 LOC and 2 drift sources.

---

## Module 7 — Attend UI chain (`app/tasks/attend-button.tsx` + `app/tasks/actions.ts` + `lib/attend.ts`)

### Findings

- **[YELLOW]** state-fan-out — `app/tasks/attend-button.tsx:26-46` — 11 `useState` hooks + 2 `useRef` timers in one client component, spanning five concerns: primary attend flow, cancel, details expandable, follow-up form, Realtime subscription. Extract `<RunDetails run={} />` (details block + `showDetails`) and `<RunFollowUp run={} />` (followup* state + form). Main component shrinks to ~150 LOC and reads top-to-bottom.
- **[YELLOW]** triplicate-status-mapping — `app/tasks/attend-button.tsx:12-24` ⇔ `app/live/live-feed.tsx:16-27` ⇔ `<Badge color={...}>` in `components/ui.tsx` — three copies of "TaskRun.status → color" and "TaskRun.verdict → color". Extract `lib/status.ts` with `taskRunStatusBadgeColor(status)` and `verdictBadgeColor(v)`. Delete the inline chip-class recipes; the button and the feed both use `<Badge color={...}>`.
- **[YELLOW]** realtime-fallback-gap — `app/tasks/attend-button.tsx:67-99` — 6s polling fallback only activates when `getBrowserSupabase()` returns null (env not set). If Realtime is configured but flaky mid-session, the poll never kicks in. Either commit to Realtime-only (drop the poller) or add a "Realtime subscription failed within N seconds → start polling" guard.
- **[YELLOW]** inconsistent-useTransition — `app/tasks/attend-button.tsx:45` — `useTransition` is used for followUp but not for attend or cancel. All three are server-action calls with optimistic UI. Either apply to all three or drop from followup for consistency.
- **[GREEN]** `lib/attend.ts:enqueueTaskRun` is clean, uses `project_daily_spend` view for the budget gate, well-scoped. Leave alone.
- **[GREEN]** `app/tasks/actions.ts:followUp` guards on `TASK_RUN_TERMINAL`. Correct.

### Health
**YELLOW** — the chain works; the client component wants a component split and duplicated status→color begs extraction.

---

## Module 8 — Small API routes group (`app/api/**`)

### Findings

- **[YELLOW]** repeating-boilerplate — every `app/api/**/route.ts` starts with `checkApiKey` + `getSupabase` + `try { req.json() } catch { return 400 }` + big try/catch around the body. That's ~10 lines of boilerplate per route × ~15 routes. **Judo move**: `handlerWithDb<TBody>(schema, fn): (req: Request) => Promise<Response>` in `lib/api-handler.ts` that returns a Response, handles auth + db + JSON parse + error wrapping. Each route becomes `export const POST = handlerWithDb(async (db, body) => {...})`.
- **[YELLOW]** local-sha1-helper — `app/api/ingest/task/route.ts:5` — `const sha1 = (s: string) => …` re-implements `lib/ingest.ts`'s inline `createHash("sha1")`. Consolidate via the `dedupeKeyFor` extraction proposed for Module 3; this file stops needing crypto at all.
- **[YELLOW]** inconsistent-response-shape — routes return `{ok: true, task: data}`, `{plan: data}`, `{run: {...}}`, `{error: string}` interchangeably. Client-side, callers handle a soup of shapes. Define `type ApiOk<T> = {ok: true, data: T}` and `type ApiErr = {ok: false, error: string, status?: number}` in `lib/api-types.ts` and standardize. `checkApiKey` returns `ApiErr` too.
- **[GREEN]** File-per-endpoint organization is idiomatic Next.js App Router. Leave alone.

### Health
**YELLOW** — pure ceremony reduction; no behavior changes needed.

---

## Module 9 — Analytics (`app/analytics/page.tsx` + `components/charts.tsx` + `lib/series.ts`)

### Findings

- **[YELLOW]** copy-pasted-spark-blocks — `app/analytics/page.tsx:81-103` — three near-identical delta-computation blocks (`avgPromptsSpark`, `cacheShareSpark`, `costPerSessionSpark`), each with `series2N` → split → sum current + prior → `deltaPct`. Extract `sparkAndDelta(series2N: number[], N: number): {spark, deltaPct}`; three call sites shrink from ~7 lines to one.
- **[YELLOW]** duplicated-color-palette — `components/charts.tsx:41-75` — DEFAULT_COLORS + LIGHT_COLORS are hardcoded hex triples that mirror the CSS `var(--color-*)` tokens (documented; Recharts can't read CSS vars). But this means every design-system color change touches BOTH `globals.css` AND `charts.tsx`. Either: (a) read once with `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')` inside `useDeckColors` and cache — one source of truth; (b) add a snapshot test that parses globals.css and asserts equality with the JS constants.
- **[YELLOW]** chart-boilerplate — `components/charts.tsx` — `ActivityChart`, `ToolUsageChart`, `TokenCostChart`, `SimpleBarChart` all repeat `useDeckColors → useDeckStyles → useId → <ResponsiveContainer><Chart><defs><CartesianGrid><XAxis><YAxis><Tooltip>` skeleton. A `<DeckBarChart data bars xKey />` HOC would collapse ~90 LOC. Not urgent; note.
- **[YELLOW]** bucket-label-off-by-boundary — `lib/series.ts:98-118` — `sessionDurationBuckets` uses `mins < b.max` with labels like `"<5m"`, `"5-15m"`. A 5.0-min session lands in `"5-15m"` (correct); ambiguity is at the boundary. Labels or comparators should be consistent: `"<5m"`, `"5–15m"`, ..., `"≥120m"` reads honestly.
- **[GREEN]** `lib/series.ts` aggregators are pure, tested, and small. Leave alone.

### Health
**YELLOW** — cosmetic + one real cross-file drift risk (palette).

---

## Module 10 — Node scripts group (`hooks/*.mjs` + `bin/cctrack.mjs`)

*(`bin/agent.mts` audited under Module 2.)*

### Findings

- **[YELLOW]** duplicated-config-loader — `hooks/claude-tracker.mjs:46-58 + hooks/hitl.mjs:36-43 + bin/cctrack.mjs:20-29` — three copies of "load `~/.cc-track/config.json`, override with env, return {url, key, …}". Extract `hooks/lib/config.mjs` (or a shared `bin/lib/config.mjs`) with one loader + one shape. All three consumers import it.
- **[YELLOW]** duplicated-post-with-key — `hooks/claude-tracker.mjs:131-137 + hooks/hitl.mjs:113-127 + bin/cctrack.mjs:52-70` — three copies of "POST to /api/…, `x-api-key`, AbortSignal.timeout, silent-on-fail" pattern. Extract `postToTracker(path, body, {timeout}) → Response | null`. Nine lines each × 3 → nine lines total.
- **[YELLOW]** custom-arg-parser — `bin/cctrack.mjs:39-50` — home-grown `parseFlags` for kebab-case flags. Node 20+ ships `util.parseArgs` (also handles `--foo=bar`, subcommands, etc.). Direct replacement.
- **[GREEN]** silent-exit-0 discipline throughout the hooks (never blocks Claude Code) is load-bearing. Leave alone.
- **[GREEN]** hitl.mjs's polling-not-Realtime choice is deliberate (hooks stay stdlib-only, no supabase-js dep in a hot boot path). Worth a one-line comment noting this decision.

### Health
**YELLOW** — cross-script dedup is the main win; ~30 LOC of removable duplication.

---

## Summary — module health tally

| # | Module | Findings (R/Y/G) | Health |
|---|---|---|---|
| 1 | `components/ui.tsx` | 1/3/1 | 🔴 **RED** |
| 2 | `bin/agent.mts` | 2/4/1 | 🔴 **RED** |
| 3 | `lib/ingest.ts` | 1/5/1 | 🔴 **RED** |
| 4 | `lib/queries.ts` | 0/6/1 | 🟡 YELLOW |
| 5 | Hub subsystem | 0/5/1 | 🟡 YELLOW |
| 6 | Live subsystem | 1/4/1 | 🔴 **RED** |
| 7 | Attend UI chain | 0/4/2 | 🟡 YELLOW |
| 8 | API routes group | 0/3/1 | 🟡 YELLOW |
| 9 | Analytics | 0/4/1 | 🟡 YELLOW |
| 10 | Node scripts | 0/3/2 | 🟡 YELLOW |

**Repo-wide themes**:

- **Sprawl in a few load-bearing files.** `ui.tsx`, `bin/agent.mts`, `lib/ingest.ts`, `lib/hub.ts`, `app/hub/page.tsx`. One judo-move per file collapses each of them to ~40% of its current size without behavior changes.
- **Copy-paste across live surfaces.** Event-row rendering, status→color mapping, config loading, lineage computation each exists in 2-3 places. Small extractions delete meaningful line counts.
- **Boundary/type-contract weakness at the ingest edge.** `unknown` payloads → casts → drilled properties. A narrow discriminated-union parser at the switch boundary would let the rest of the pipeline stay strictly-typed.
- **Cache-tag config that isn't wired.** `unstable_cache` tags exist; `revalidateTag` is never called. Either wire it or drop it.

**Recommended Phase 3 targets** (my ranking — will present for user approval):

1. Split `components/ui.tsx` into `components/ui/*` + barrel. Highest ROI, unblocks parallel UI work immediately.
2. Decompose `bin/agent.mts` into `bin/agent.mts` + `lib/agent-run.ts` + `lib/agent-git.ts`; extract `execute` sub-functions.
3. Refactor `lib/ingest.ts` switch into a dispatch map + per-event handler modules; fix N+1 in `syncTodoWrite`; consolidate `dedupeKeyFor`.
4. Extract `components/event-row.tsx` + `lib/lineage.ts` (Modules 6 + 7 both benefit).
5. Introduce `withDb` + `handlerWithDb` + `ApiOk/ApiErr` (Modules 4 + 8 together).

Not recommended for Phase 3 (either too small or too cosmetic to justify an RFC):
- Chart color consolidation (Module 9) — batch into a design-system pass if one comes.
- Node-script dedup (Module 10) — trivial, apply directly if Phase 4 has capacity.
- Analytics spark-block extraction (Module 9) — same.

