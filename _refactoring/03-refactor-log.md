# CC-Track — Refactor Log (Phase 4)

Each landed refactor gets one entry. Contract = the RFC from `_refactoring/02-architecture-rfcs/`.
Ponytail is active during implementation.

---

## RFC 01 · Split `components/ui.tsx` — 2026-09-16

### Change
Split the 883-LOC kitchen-sink `components/ui.tsx` into 7 primitive-family files + a barrel. Zero consumer changes (imports resolve via `components/ui/index.ts`).

### Files modified
- **Deleted**: `components/ui.tsx` (883 LOC)
- **Created**:
  - `components/ui/tokens.ts` (32) — `PANEL_STYLE`, `STAT_STYLE`, `CELL_STYLE` (STAT_STYLE additively promoted from internal to exported so `stat.tsx` can import it cleanly)
  - `components/ui/card.tsx` (252) — Card, Fold, PageHeader, Breadcrumbs, SetupBanner, Empty
  - `components/ui/chip.tsx` (237) — IconButton, ErrorAlert, Badge, Chip + types, InlineError, NavBadge
  - `components/ui/stat.tsx` (202) — Stat, Progress, Sparkline, TrendDelta
  - `components/ui/field.tsx` (47) — Label, Input, Textarea, LabelTag type
  - `components/ui/icons.tsx` (85) — RailIcons, ActionIcons, LiveDot
  - `components/ui/list.tsx` (27) — TaskLine
  - `components/ui/index.ts` (9) — pure barrel

Net LOC: 891 (+8 vs 883 original — barrel + one comment on newly-exported `STAT_STYLE`).

### RFC reference
`_refactoring/02-architecture-rfcs/01-ui-split.md` — **Option A** (file split + barrel) applied. **Option C** narrowed by user decision: constants kept in `tokens.ts` rather than migrating to CSS classes (Phase 2 finding was overstated — `.deck-card` in globals.css is a density-variant selector, not the visual source). CSS-class migration deferred as a follow-up.

### Quality gate
Manual application of the `thermo-nuclear-code-quality-review` rubric (skill itself not invocable in this session; SKILL.md read + applied by hand):
- **File-sprawl**: 883 → largest new file 252. ✅ every file under 300 LOC.
- **Grow-a-file-past-1k**: no file created is anywhere near 1k. ✅
- **Spaghetti / random conditionals added**: none — implementations copied verbatim. ✅
- **Boundary / cast churn**: none introduced. ✅
- **Canonical-layer duplication**: none introduced. ✅
- **Judo move claim vs delivered**: RFC promised "consumer imports keep working via barrel; every export preserved bit-for-bit." Verified: `git status` shows only `components/ui.tsx` deleted + `components/ui/*` created; no consumer file in the working tree changed.

**Gate**: ✅ PASS.

### Verification
- `npm run build` — exit 0, all routes generated.
- `npx tsc --noEmit` — exit 0.
- `git status` confirms scope: only intended files touched.
- Barrel completeness cross-checked: every symbol exported from the original `components/ui.tsx` (30 identifiers + 4 types) is re-exported from `components/ui/index.ts`.

### Notes for the next session

> **Superseded 2026-09-16.** The two style-constant notes below were acted on in the follow-up pass: `components/ui/tokens.ts` is deleted and `PANEL_STYLE` / `STAT_STYLE` / `CELL_STYLE` are now `.deck-card` / `.deck-stat` / `.deck-cell` rules in `app/globals.css`. Kept for the audit trail; do not act on them. See "Follow-ups · 2026-09-16" at the end of this file.

- `STAT_STYLE` is now a public export. Previously it was module-private in `ui.tsx`. If a future consumer starts importing it, that's fine; if the design decides `STAT_STYLE` should stay conceptually internal, drop it from `components/ui/index.ts`'s re-export list and it becomes private again (only `stat.tsx` uses it today).
- CSS-class migration (moving `PANEL_STYLE`/`STAT_STYLE`/`CELL_STYLE` into globals.css `.deck-*` classes) is deferred. When picked up, grep for the four callers first: `components/ui/card.tsx`, `components/ui/stat.tsx`, `app/page.tsx`, `app/live/live-feed.tsx`.
- Sub-agent completed in ~225s with 19 tool uses; no visible errors.

---

## RFC 02 · Decompose `bin/agent.mts` — 2026-09-16

### Change
Split the 527-LOC `bin/agent.mts` into a shallow entry (~136 LOC) + a deep `lib/agent-run.ts` (`runOne`) + a `lib/agent-git.ts` (git wrappers). `lib/agent-verify.ts` extended with the no-diff → `needs_review` branch that was previously inline in `execute`. `busy` flag + `setInterval` replaced with a `while (true)` loop that awaits `sleep(POLL_MS)` — same "one concurrent run per agent" contract, no shared mutable state. `TaskRunTrigger` + `RESUMES` added to `lib/types.ts`.

### Files modified
- `bin/agent.mts`: 527 → 136 LOC (entry: env, main loop, claim, single-flight guard via `while+await`)
- `lib/agent-run.ts`: NEW, 354 LOC (`runOne` interface; internally: `spawnOnce`, drive-child + DLL retry + cancel poller, `finishRun`, `retryIfNeeded`, `resumeSessionFor`)
- `lib/agent-git.ts`: NEW, ~45 LOC (`gitHead`, `gitShortstat`, `gitDiffText`, `parseShortstat` — pure parser moved here to break a cycle discovered during review)
- `lib/agent-verify.ts`: extended (~180 LOC total). `runVerifier` moved here from `bin/agent.mts` and gained the no-diff branch. Signature: `(taskCtx, cwd, parentCommit, headCommit, claudeBin, permissionMode)`.
- `lib/types.ts`: +11 LOC — `TaskRunTrigger` union + `RESUMES` record.
- `tests/agent-verify.test.mts`: import for `parseShortstat` re-pointed to `../lib/agent-git`.

Net: `-1309 / +147` in shipped files, plus 2 new files (agent-run: 354, agent-git: 45). Roughly LOC-neutral overall; shape dramatically deeper.

### RFC reference
`_refactoring/02-architecture-rfcs/02-agent-decomposition.md` — **Option A** (function-based decomposition) + the busy-flag sub-option. Option B (state-machine class) and Option C (event pipeline) rejected as speculative.

### Quality gate
Manual application of the `thermo-nuclear-code-quality-review` rubric (skill still not invocable in-session):
- **File-sprawl**: `bin/agent.mts` 527 → 136 ✅; largest new file 354 ✅.
- **Grow-a-file-past-1k**: none. ✅
- **Spaghetti / random conditionals**: the sub-agent preserved behavior verbatim per contract; no new branches invented. ✅
- **Boundary / cast churn**: two `child.stdout!`/`child.stderr!` non-null assertions added; runtime-safe given `stdio: ["ignore","pipe","pipe"]`. Documented as a caught dormant typing gap (bin/*.mts was outside tsc's include list before). ✅ acceptable.
- **Canonical layer**: `RESUME_TRIGGERS` Set replaced by `TaskRunTrigger` type + `RESUMES` record in `lib/types.ts` — canonical home found. ✅
- **Cycle**: FLAGGED during review. `lib/agent-git.ts` and `lib/agent-verify.ts` had a real dependency cycle (each imported a function from the other). Fixed by a follow-up sub-agent: `parseShortstat` moved from `agent-verify.ts` to `agent-git.ts` (its natural home). Cycle now unidirectional. ✅ Only after this fix does the gate pass.

**Gate**: ✅ PASS (after the follow-up cycle fix).

### Verification
- `npm run build` — exit 0 (twice: after main refactor, after cycle fix).
- `npx tsc --noEmit` — exit 0.
- `npx tsx tests/agent-parse.test.mts` — pass.
- `npx tsx tests/agent-verify.test.mts` — pass (import for `parseShortstat` re-pointed).
- `bin/agent.mts` smoke-run: connects and enters the poll loop cleanly.
- `git status` scope check: only expected files modified; no consumer file touched.

### Notes for the next session
- **Dormant typing gap fixed**: `bin/agent.mts` was not in `tsconfig.json`'s `include`, so `child.stdout`/`child.stderr` possibly-null errors were never surfaced. Moving that code into `lib/agent-run.ts` (which IS in tsc's project) exposed the issue and required two `!` assertions. If a future refactor moves any bin/*.mts into a lib module, expect similar dormant errors to surface — that's actually the desired outcome.
- **`runVerifier` grew from 4 params to 6** (`claudeBin`, `permissionMode` added). Necessary because it now spawns its own child directly. If a third consumer of the verifier logic appears, wrap the spawn args in a `VerifierEnv` object.
- **`spawnOnce` intentionally private to `lib/agent-run.ts`.** `runVerifier` has its own small one-shot spawn helper for its verify child. Minor duplication; extract to `lib/spawn.ts` only if a third caller appears (one adapter = hypothetical seam).
- **`chain` trigger**: still in the codebase's comments as a historical curiosity (see `bin/agent.mts:249` original position, now in `lib/agent-run.ts`); never inserted anywhere; `RESUMES.chain` deliberately absent because `TaskRunTrigger` doesn't include it. Safe.

---

## RFC 03 · Ingest dispatch + N+1 fix — 2026-09-16

### Change
Split `lib/ingest.ts` (469 LOC) into a thin barrel (20 LOC re-exports + `processHook`) + a per-event handler tree under `lib/ingest/*`. TodoWrite's N+1 fetch collapsed to one bulk `.in("dedupe_key", allKeys)` + in-memory map + parallelized writes. `dedupeKeyFor` extracted to `lib/dedupe.ts` and shared between `syncTodoWrite` and `POST /api/ingest/task`.

### Files modified
- **Modified**:
  - `lib/ingest.ts`: 469 → 20 LOC (barrel: re-exports `normalizePath`, `ensureSession`, `HookPayload`, plus `processHook`)
  - `app/api/ingest/task/route.ts`: local `sha1` helper + `crypto` import deleted; now uses `dedupeKeyFor("cli", scopeId, body.content)`
- **New**:
  - `lib/dedupe.ts` (12 LOC) — `dedupeKeyFor(kind, scopeId, content)`
  - `lib/ingest/db.ts` (84 LOC) — `resolveProject`, `ensureSession`, `addEvent`, `normalizePath` (moved for cycle-safety; re-exported from `lib/ingest.ts`)
  - `lib/ingest/handlers.ts` (83 LOC) — `HandlerContext`, `HookHandler`, `buildContext`, `HOOK_HANDLERS` dispatch map, `handleUnknown`, shared helpers (`withPid`, `truncStr`, `truncField`, `asRecord`)
  - `lib/ingest/session-start.ts` (19) — `handleSessionStart` (preserves the `if (payload.repo) update projects.repo` side effect verbatim per contract)
  - `lib/ingest/user-prompt.ts` (22) — `handleUserPromptSubmit`
  - `lib/ingest/post-tool-use.ts` (218) — `TOOL_HANDLERS` map + `handleTodoWrite` (with the N+1 fix), `handleAgent`, `handleTaskStop`, `handleSendMessage`, `handleTaskGet`, `handleTaskOutput`, `handleUnknownTool`, plus module-private `syncTodoWrite`
  - `lib/ingest/stop.ts` (44) — `handleStop`
  - `lib/ingest/session-end.ts` (14) — `handleSessionEnd`
  - `lib/ingest/subagent.ts` (29) — `handleSubagentStart`, `handleSubagentStop`
  - `lib/ingest/misc.ts` (30) — `handleStopFailure`, `handleNotification`

Net LOC: -449 in `lib/ingest.ts`, +555 across new files. Structurally deeper: each event's handler is grep-friendly and small (largest is `post-tool-use.ts` at 218 LOC, which contains 7 tool sub-handlers + `syncTodoWrite`).

### RFC reference
`_refactoring/02-architecture-rfcs/03-ingest-dispatch.md` — **Option A** (dispatch map + per-event files) + upsert sub-option adapted as **bulk-select + parallel per-row writes** (semantically identical to the read-modify-write of the original code but with N reads collapsed to 1 and writes potentially parallel). Full Postgres `.upsert(rows, {onConflict})` was NOT applied because it would have overwritten the "only update if status/description changed" optimization; the bulk-select+map preserves it.

### Quality gate
Manual thermo-nuclear rubric:
- **File-sprawl**: 469 → largest new file 218. ✅
- **Grow-a-file-past-1k**: none. ✅
- **Spaghetti / random conditionals**: all preserved behaviors verified per contract; nothing new introduced. ✅
- **Boundary / cast churn**: casts preserved from original code (`asRecord`, `truncStr`) — not fixed here per RFC scope; audit's finding on cast-churn deferred to a future ingest-payload-narrowing pass. ✅
- **Canonical layer**: `dedupeKeyFor` in `lib/dedupe.ts` is the canonical home. `resolveProject/ensureSession/addEvent` in `lib/ingest/db.ts`. ✅
- **Cycle**: FLAGGED and FIXED (follow-up subagent). `lib/ingest.ts` and `lib/ingest/handlers.ts` had a mutual import; `lib/ingest/db.ts` created to isolate the DB primitives. `normalizePath` also moved to `db.ts` and re-exported from `lib/ingest.ts` to keep external consumers (`lib/hub.ts`, `lib/hub-parse.ts`, `lib/agent-*.ts`) unchanged. ✅

**Gate**: ✅ PASS (after cycle fix).

### Verification
- `npm run build` — exit 0.
- `npx tsc --noEmit` — exit 0.
- `npm run test:hooks` — pass.
- `npx tsx tests/lib.test.mts` — pass.
- `npx eslint .` — clean.
- `git status` scope: expected files only. All 9 hook event names + 7 tool names verified wired into dispatch maps.

### Notes for the next session
- **Barrel + fanout, not cycle**: handler files still import `ensureSession` (and a couple use `resolveProject`, `addEvent`) from `../ingest` (which re-exports from `./ingest/db`). At runtime this is a strict DAG — barrel re-exports don't count as edges. If a future audit wants ZERO indirection, change those imports to `./db` directly; 6 files, 6 lines, purely cosmetic.
- **Postgres `.upsert()` deferred**: the RFC's upsert sub-option would drop the "only update if changed" optimization. Bulk-select + per-row writes preserves that. If Supabase adds partial-column upsert semantics, revisit.
- **Cast churn in ingest handlers is preserved**: the `asRecord(payload.tool_input)`, `truncStr`/`truncField` casts are still present. Phase 2 flagged this as a type-boundary weakness; the fix (discriminated-union parser at the switch boundary) was intentionally out of RFC 03 scope.
- **Two subagents total for RFC 03**: main refactor + cycle fix. ~600s cumulative.

---

## RFC 04 · EventRow + lineage extraction — 2026-09-16

### Change
Two independent extractions to kill three copies of the same code:
1. **EventRow component** — one `components/event-row.tsx` replaces `FeedEventRow` (in `app/live/live-feed.tsx`) and `TimelineRow` (in `components/live-timeline.tsx`), which had ~80 LOC of copy-pasted IIFE branches each.
2. **Lineage arithmetic** — one pure `computeLineage(rows)` + `ancestorTriggers(rows, id, trigger)` in `lib/lineage.ts` replaces three separate walks: `computeLineageMap` in live-feed, `countAncestorRetries` in agent-run, the inline walk inside `getLineageStatsByTask` in attend.

### Files modified
- **Modified**:
  - `app/live/live-feed.tsx` — removed local `EVENT_MARK`, `eventTone`, `FeedEventRow`, `computeLineageMap`; imports `EventRow` and `computeLineage` instead
  - `components/live-timeline.tsx` — same removal for timeline's copy; imports `EventRow`
  - `lib/agent-run.ts` — `countAncestorRetries` now fetches rows + calls `ancestorTriggers(rows, run.id, "retry_on_fail")`; inline `Row` type + walk loop deleted
  - `lib/attend.ts` — `getLineageStatsByTask` uses `computeLineage` internally; outer shape (`Map<taskId, RunLineage>`) preserved
- **New**:
  - `components/event-row.tsx` (120 LOC) — `"use client"` component with props `timeFormat`, `showSessionId`, `truncate`, `isNew`; renders via switch on the discriminated content type
  - `lib/event-content.ts` (66 LOC) — `FeedEventContent` discriminated union + `parseEventContent(e)` (RFC 04 **Option C** — the union kills the IIFE-per-event pattern)
  - `lib/lineage.ts` (95 LOC) — pure functions, NO imports, leaf module

### RFC reference
`_refactoring/02-architecture-rfcs/04-event-row-lineage.md` — **Option A + Option C** applied.

### Quality gate
Manual thermo-nuclear rubric:
- **File-sprawl**: no file grew; live-feed and live-timeline each got smaller.
- **Grow-a-file-past-1k**: none.
- **Spaghetti / random conditionals**: IIFEs replaced by an explicit discriminant switch. Cleaner.
- **Boundary / cast churn**: `parseEventContent` narrows `e.data` at ONE boundary (the row rendering) with explicit `typeof x === "string"` checks; callers see typed values thereafter. Big win.
- **Canonical layer**: `computeLineage` is the canonical walker; three consumers use it uniformly. Out-of-window semantics normalized (parent-not-in-window ⇒ depth = 2, matching live-feed's original UI-safe behavior; agent-run and attend fetch complete row sets so the branch never fires in practice).
- **Cycle**: `lib/lineage.ts` has NO imports — pure leaf. `components/event-row.tsx` imports from `@/lib/format`, `@/lib/event-content`, `@/lib/types` — one-way. No cycle introduced.

**Gate**: ✅ PASS.

### Verification
- `npm run build` — exit 0.
- `npx tsc --noEmit` — exit 0.
- `npm run test:hooks` — pass. All `tests/*.mts` — pass.
- `git status` scope: expected files only. `grep "computeLineageMap" app/live/` returns nothing. `grep "parentOf.get\|while.*parent_run_id"` in agent-run/attend returns nothing.

### Notes for the next session
- **First subagent was terminated mid-task** by a rate-limit (session monthly spend cap hit). Parts 1+2 (EventRow + event-content + live-feed + live-timeline updates) landed cleanly before termination. A second focused subagent handled Part 3 (lineage) after the limit reset.
- **`RunCard` in live-feed was NOT touched** — that's for `task_runs`, a different concern from event rows. Its custom-compare `memo` (which the audit noted was correct) is preserved.
- **`data-new` attribute preserved via `isNew` prop** on EventRow. Timeline passes `isNew={e.id > initialMax}`; feed doesn't pass it. CSS in globals.css that targets `[data-new="1"]` keeps working.
- **`getLineageStatsByTask` interface unchanged.** Callers on `/tasks` and `/live` see the same `Map<taskId, RunLineage>`. Internal implementation is one bulk fetch + one `computeLineage` call + a per-task "latest run" lookup.

---

## RFC 05 · `withDb` + `handlerWithDb` — 2026-09-16

### Change
Added `withDb<T>(fn)` helper to `lib/supabase.ts` and refactored 19 of `lib/queries.ts`'s ~22 functions to use it. Added `handlerWithDb(parseBody, fn)` in a new `lib/api.ts` and refactored 5 POST routes (hook / task / plan / hitl-approvals / sessions-focus) to use it. **Response shapes preserved bit-for-bit** — the RFC 05 Option A "standardize on `{ok:true, data: T}`" was intentionally NOT applied because it would break `hooks/hitl.mjs`, `bin/cctrack.mjs`, and `components/hub-toggle.tsx` (all out-of-scope callers). Route handlers keep returning their existing shapes; `handlerWithDb` deletes only the auth+db+parse+error-wrap ceremony.

### Files modified
- **Modified**:
  - `lib/supabase.ts` (+11 LOC) — added `withDb<T>(fn)` next to `getSupabase`
  - `lib/queries.ts` — 19 of 22 functions now use `withDb`. LOC net-flat (~428 → 427) because the wrapper is 2 lines and the guard it replaces was 2 lines. Win is centralization, not deletion.
  - `app/api/ingest/hook/route.ts` — refactored via `handlerWithDb`
  - `app/api/ingest/task/route.ts` — refactored
  - `app/api/ingest/plan/route.ts` — refactored
  - `app/api/hitl/approvals/route.ts` (POST) — refactored
  - `app/api/sessions/[id]/focus/route.ts` (POST, dynamic segment) — refactored; `handlerWithDb` extended to thread Next.js's `context: { params }` through
- **New**:
  - `lib/api.ts` (50 LOC) — `handlerWithDb` + `ApiRouteHandler` type

### Routes NOT refactored (with reason, per subagent report)
- `hitl/approvals/[id]/route.ts` — GET only, no POST body
- `hitl/approvals/[id]/timeout/route.ts` — POST but no getSupabase / no JSON body (fully delegates to `decideApproval()`)
- `hub/toggle/route.ts` — POST but writes via `lib/hub-write`, not Supabase; no `checkApiKey`
- `tasks/[id]/attend/route.ts` — different auth/body shape
- All GET/PATCH/DELETE routes (`sessions/[id]/events`, `tasks/[id]`, `sessions/[id]`, `projects/[id]`, `plans/[id]`, `prompts/[id]`, `task-runs/[id]`, `health`, `heartbeat`) — `handlerWithDb` is POST-with-JSON-body only

### RFC reference
`_refactoring/02-architecture-rfcs/05-api-handler-helpers.md` — **Scoped-down Option A**: withDb + handlerWithDb applied, but the `ApiOk/ApiErr` envelope standardization is deferred. Rationale documented in this session — response-shape standardization would break out-of-scope callers.

### Quality gate
Manual thermo-nuclear rubric:
- **File-sprawl**: no file grew. `lib/queries.ts` net-flat. `lib/supabase.ts` grew by 11 LOC — trivial.
- **Grow-a-file-past-1k**: none.
- **Spaghetti / random conditionals**: `handlerWithDb`'s try/catch chain is now the single owner of "auth failed → 401", "db not configured → 503", "body malformed → 400", "handler threw → 500". Five routes' inline copies deleted.
- **Boundary / cast churn**: `parseBody: (raw: unknown) => TBody | null` is a proper narrowing seam. The single deviation the subagent flagged (non-object JSON bodies now 400 instead of 500) is a strict improvement.
- **Canonical layer**: `withDb` and `handlerWithDb` are the canonical `lib/queries.ts` and `app/api/**/route.ts` shapes going forward. New queries and new POST routes have an obvious template.
- **Cycle**: `lib/api.ts` imports only from `lib/supabase.ts`. Every route stays a leaf. No cycle introduced.

**Gate**: ✅ PASS.

### Verification
- `npm run build` — exit 0 (29 routes compiled).
- `npx tsc --noEmit` — exit 0.
- `npm run test:hooks` — pass. All `tests/*.mts` — pass.
- Response-shape spot-check: for each of the 5 refactored routes, the subagent diffed old vs new logic and confirmed same status codes + same JSON body shapes for the same inputs. Two minor error-message wording normalizations noted (see Deviations).

### Deviations
1. **503 error-message wording normalized.** The hook route previously returned `"Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)"`; hitl/approvals returned `"Supabase not configured"`. Both now return the shared `"Supabase is not configured"`. Status still 503. Consumers (hooks, hitl.mjs) only check `res.ok`; wording doesn't affect them.
2. **Non-object JSON body now 400 instead of undefined behavior.** `parseBody` returns null when `raw` isn't a plain object → `handlerWithDb` returns 400 "invalid body shape". Previously this depended on the specific route (some crashed to 500, some silently accepted). Strict improvement.

### Notes for the next session
- **Response-shape standardization NOT done.** RFC 05 Option A's full envelope (`{ok, data}` everywhere) is deferred. If pursued, it needs `hooks/hitl.mjs`, `bin/cctrack.mjs`, and `components/hub-toggle.tsx` updated to read `res.body.data.X` instead of `res.body.X`. Small work but crosses the ingest/CLI boundary.
- **Cycle-free by construction**: `lib/api.ts` and `lib/supabase.ts` are dependency-graph leaves. All routes import from `lib/api.ts`; nothing imports back.
- **19 of 22 queries use withDb**. The 3 that don't (`getProjectDailySpend` and similar) return non-nullable values (Map or []), which don't fit `withDb`'s `T | null` shape. Those stay with the direct `getSupabase()` pattern by design.

---

## Follow-ups · 2026-09-16

Picked up 3 of the 5 follow-ups listed in `scope.md`; the other 2 declined. Uncommitted at time of writing.

### Change
1. **CSS-class migration (follow-up 2)** — `components/ui/tokens.ts` deleted; `PANEL_STYLE`/`STAT_STYLE`/`CELL_STYLE` replaced by `.deck-card`/`.deck-stat`/`.deck-cell` rules in `app/globals.css`, placed just above the existing `[data-density="compact"] .deck-card` rule, property-for-property identical, rem units.
2. **Cache-tag config dropped (follow-up 4)** — all 7 `unstable_cache` option objects in `lib/queries.ts` are now `{ revalidate: 15 }`; tags removed rather than wiring `revalidateTag`.
3. **Barrel-fanout cleanup (follow-up 5)** — the 7 handler files now import `ensureSession` from `./db` instead of the `../ingest` barrel.

### Files modified
- **Deleted**: `components/ui/tokens.ts` (-32 LOC)
- **Modified**: `app/globals.css` (+26 LOC, new `.deck-card`/`.deck-stat`/`.deck-cell` rules), `components/ui/card.tsx` (Card keeps `deck-card`, `style={style}` only; Fold level 1 shell class is now `deck-card`), `components/ui/stat.tsx` (`deck-stat` on both the `<Link>` and `<article>` branches; dead empty `emphasisStyle` object deleted), `app/page.tsx` (three `<li className="deck-cell">`, task row keeps its inline `borderRadius: "0.625rem"` override), `app/live/live-feed.tsx` (run card `<li className="deck-cell p-4">`, both lane `<section>`s `deck-card`), `components/ui/index.ts` (tokens re-export removed)
- **Modified**: `lib/queries.ts` (7 `unstable_cache` option objects: tags dropped, `{ revalidate: 15 }` kept)
- **Modified**: `lib/ingest/misc.ts`, `post-tool-use.ts`, `session-end.ts`, `session-start.ts`, `stop.ts`, `subagent.ts`, `user-prompt.ts` (one-line import change each, `../ingest` → `./db`); `lib/ingest/handlers.ts` untouched (its `import type { HookPayload } from "../ingest"` is type-only, no runtime edge)

### Decisions
- **CSS-class migration**: new rules are unlayered plain classes, so they still beat Tailwind utilities (which live in `@layer utilities`) — same precedence outcome as the old inline styles for the props they set.
- **Cache tags**: chose "drop the tags" over "wire revalidateTag" — every ingest write would have had to call `revalidateTag`, firing on every hook and busting the cache continuously, defeating the 15s window. If on-demand invalidation is ever wanted, add tags back together with the `revalidateTag` call, not before.
- **Declined — full API response envelope (follow-up 1)**: no consumer needs a uniform `{ok, data}` shape; would be cross-boundary churn (`hooks/hitl.mjs`, `bin/cctrack.mjs`, `components/hub-toggle.tsx`) for zero behavior gain. Revisit only if a second generic API client appears.
- **Declined — ingest cast-boundary narrowing (follow-up 3)**: `asRecord` already narrows once at the switch boundary in `handlePostToolUse`; the only remaining casts are the two in `handleTodoWrite`, and `syncTodoWrite` already filters rows lacking `content`. A per-tool discriminated union would add ~40 lines of types to remove two casts. Revisit if hook payload shapes start drifting between Claude Code versions.

### Quality gate
- `tsc --noEmit` — clean.
- `next build` — green.
- Computed styles checked in the browser on `/` and `/live`: radii 0.875rem / 0.75rem / 0.625rem override, borders, backgrounds, shadows all identical to the pre-migration inline styles.
- Net: -32 LOC `tokens.ts`, +26 LOC CSS, callers slightly shorter.

### Notes for the next session
- Follow-ups 2, 4, and 5 are closed; drop them from `scope.md`'s open list if a future session wants a clean slate.
- Follow-ups 1 and 3 are declined, not deferred-forever — each has an explicit revisit trigger noted above.

