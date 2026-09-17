# Scan Scope & Progress

## Target
Full repo — `cc-track` (Next.js Claude Code tracker). ~153 tracked files, ~90 TS/TSX.

## Dependencies
- codebase-explorer — installed
- thermo-nuclear-code-quality-review — installed (user-installed after auto-mode block)
- improve-codebase-architecture — installed
- ponytail — installed (active)

## Priority
1. Maintainability / over-engineering
2. Architecture / coupling
3. Performance
(Correctness explicitly not top priority — user's call.)

## Known pain areas
None declared — let Phase 1 surface them.

## Completed
- [x] Dependency check
- [x] Scope decision
- [x] Phase 1: Architecture map — `00-architecture-map.md`
- [x] Phase 2: Quality audit — `01-quality-audit.md` (all 10 modules)
- [x] Phase 3: Architecture RFCs — `02-architecture-rfcs/{01..05}.md`
- [x] Phase 4: Constrained refactoring — all 5 RFCs landed. See `03-refactor-log.md`.

## Phase 2 notes
- `thermo-nuclear-code-quality-review` skill wasn't loaded in-session (installed after startup); its `SKILL.md` was read from `~/.agents/skills/thermo-nuclear-code-quality-review/SKILL.md` and its rubric applied by hand per module.
- 4 modules RED (components/ui.tsx, bin/agent.mts, lib/ingest.ts, live subsystem), 6 YELLOW, 0 GREEN.
- 5 RFC candidates proposed at the tail of `01-quality-audit.md`. Waiting on user to pick which graduate to Phase 3.

## Phase 3 notes
- `improve-codebase-architecture` skill's frontmatter had `disable-model-invocation: true`; user authorized flipping it to `false` in `.claude/skills/improve-codebase-architecture/SKILL.md` for this session.
- Skill's method is HTML-in-temp + grilling loop; adapted to Markdown output per orchestrator contract, kept the vocabulary (module / interface / depth / seam / adapter / leverage / locality / deletion test), moved "grilling" content up-front as competing design options.
- Each RFC: Files, Problem, Solution, 2-4 design options with tradeoffs, vocabulary check, before/after ASCII, test surface, estimated diff, recommendation.

## Phase 4 notes
- Each RFC → one Sonnet subagent with an explicit contract (per user's stored memory rule).
- Two subagents hit cycle issues on extract; both were fixed with focused follow-ups (`parseShortstat` moved for RFC 02, `lib/ingest/db.ts` created for RFC 03).
- RFC 04's main subagent was terminated mid-task by a session spend cap; state was coherent, so a smaller Part-3 subagent finished the lineage extraction after the limit reset.
- RFC 05 scoped down from full Option A (response-envelope standardization) to just deleting the ceremony — full envelope would break `hooks/hitl.mjs` + `bin/cctrack.mjs` + `components/hub-toggle.tsx`. Deferred.
- 6 total subagents fired across Phase 4; all builds green, all tests pass.

## Current State
All 4 phases complete. `_refactoring/` holds the full record: `00-architecture-map.md`, `01-quality-audit.md`, `02-architecture-rfcs/*.md`, `03-refactor-log.md`, `scope.md`. A follow-up pass landed 2026-09-16 (uncommitted at time of writing): 3 of the 5 listed follow-ups done, 2 declined. See `03-refactor-log.md`'s "Follow-ups · 2026-09-16" section.

## Follow-ups for future sessions
- [ ] declined — **RFC 05 full envelope** (`{ok, data}` on every route) — needs updating `hooks/hitl.mjs`, `bin/cctrack.mjs`, `components/hub-toggle.tsx` in lockstep. No consumer needs a uniform shape; would be cross-boundary churn for zero behavior gain. Revisit only if a second generic API client appears.
- [x] done — **CSS-class migration for `PANEL_STYLE`/`STAT_STYLE`/`CELL_STYLE`** — deferred from RFC 01. Expand `.deck-card`/`.deck-stat`/`.deck-cell` in `globals.css`, delete the JS style constants, update the 4 callers (`components/ui/card.tsx`, `components/ui/stat.tsx`, `app/page.tsx`, `app/live/live-feed.tsx`).
- [ ] declined — **Ingest cast-boundary narrowing** — Phase 2 finding deferred from RFC 03. Introduce discriminated union parsers at the switch boundary of `lib/ingest/handlers.ts` so `asRecord`/`truncStr` casts inside handlers can go away. `asRecord` already narrows once at the switch boundary in `handlePostToolUse`; only the two casts in `handleTodoWrite` remain, and `syncTodoWrite` already filters rows lacking `content`. A discriminated union would add ~40 lines of types to remove two casts. Revisit if hook payload shapes start drifting between Claude Code versions.
- [x] done — **Cache tag wiring** — Phase 2 finding: `unstable_cache` tags in `lib/queries.ts` are declared but `revalidateTag(...)` is never called. Either wire it on ingest writes (`revalidateTag("stats")` in `processHook`) or drop the tags. Chose drop: every ingest write would have had to call `revalidateTag`, firing on every hook and busting the cache continuously, defeating the 15s window.
- [x] done — **Handler-file barrel-fanout imports** — `lib/ingest/misc.ts`, `post-tool-use.ts`, `session-end.ts`, `session-start.ts`, `stop.ts`, `subagent.ts`, `user-prompt.ts` still import `ensureSession` etc. from `../ingest` (the barrel). Runtime-safe (DAG via re-exports), but changing them to import directly from `./db` is a mechanical 6-line cleanup for future taste.

## Key Decisions
- Branch: `feat/sidebar-and-polish` — scan operates against this working tree.
- Full repo scope (not per-module) because size is modest.
