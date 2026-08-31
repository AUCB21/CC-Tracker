# HANDOFF - cc-track coordination (2026-08-31)

For the next coordinator/PM agent resuming this work. Written by the PM session (agus-e3) under low tokens. Read this, then `git log`, then the referenced plan files.

## Your role
Act as PM/coordinator for multiple Claude sessions working on cc-track (this repo). You do NOT do most implementation yourself: you plan, delegate to file-locked agents, review diffs, and commit. cc-track's north star: let the user track pending/active/completed tasks and project progress.

## Current state
- Branch `front`, HEAD `198b0fc`, tree clean. `front` is on **Next.js 16.3.3 / React 19.2.8** (upgrade merged; unpushed - `front` is ahead of origin).
- Peer sessions (via ListAgents / SendMessage): `claude-code-tracker-96` (idle, holding) and `claude-code-tracker-e9` (the one that did the /live diagnosis, the Next 16 upgrade, and is NOW fixing the realtime regression). They SHARE this one working tree.

## IN PROGRESS (top priority)
**e9 is fixing a Next 16 Supabase Realtime regression.** After the Next 16 merge, browser Realtime subscriptions get ZERO broadcasts in a prod build (`next start`) - app-wide: /live feed, attend-button live status, live-timeline. DB emits fine; even an independent test channel gets nothing (worked pre-upgrade). See `REALTIME_FIX_PLAN.md`. Suspects: React 19.2 lifecycle, Turbopack bundling of @supabase/supabase-js ws, RSC hydration. File lock (e9 owns): lib/supabase-browser.ts, app/live/live-feed.tsx, components/live-timeline.tsx, app/tasks/attend-button.tsx, next.config.ts; package.json only with PM coordination. When e9 reports fixed+verified (prod build, /live appends live), review and commit (explicit paths).

## Queued / not started (have plan files)
- `/live` "duplicate cards" grouping (Task A collapse) - `LIVE_RUNS_GROUPING_PLAN.md`. Not a bug (ungrouped task_runs rows, not DB dupes). Do after realtime fix.
- Public release prep - `PUBLIC_RELEASE_PLAN.md`. HARD GATE is Phase 1: scan working tree AND full git history for secrets (Supabase keys, ingestion API key); if any were ever committed, purge history + rotate. Then bloat purge (/ponytail-audit; also delete/relocate all these *_PLAN.md + HANDOFF.md working docs), then a newcomer README + LICENSE (ask user which). Do NOT flip repo public or push to a public remote without explicit user go-ahead.

## Done this session (see git log for hashes; HEAD 198b0fc)
Perf audit (-63 lines, 898477b); /live realtime bug fix - DB-side RLS policy + publication + visual (1c5855e); events + task-runs lanes newest-at-top (1ddafdc, 42a1b9a); impeccable a11y fixes globals + /live (44ec5ca, 3e22a0f); motion capped 150ms + halo removed (16b4f67); hamburger mobile nav complete - reduced-motion, full-viewport via portal past the header backdrop-filter, slides from the right (6f7b02f, 7c4a2bd, 3cb6002); DESIGN.md + detector reconciled to shipped tokens incl. new sanctioned Red color, detector now [] app-wide (d1d35d3); Next 16 upgrade merged (f6784d5).

## Working rules (established with the user - honor these)
- SHARED tree: PM serializes ALL commits with EXPLICIT paths, never `git add -A` (would sweep another session's WIP). Agents make edits + pass gates, report; PM reviews + commits. One commit per task.
- Workflow rule: every task = task/plan doc -> file-locked implement agent -> a SEPARATE audit agent that fixes. Lock files (tell peers which) so no two edit the same file.
- Use Sonnet-5 subagents (`model: "sonnet"`); the Opus session limit was hit (resets ~3:40am America/Argentina/Buenos_Aires - may be clear now).
- Gates before any commit: `npx tsc --noEmit -p .` clean; impeccable detector returns []; NO em/en dashes; relative units only (no px except 1px hairlines / shadow blur); ponytail-minimal (no scope creep, no unrequested code/comments).
- VERIFY agents' state claims yourself before acting on safety-critical ones (a "worktree/safe" claim was once wrong and caused a scare - always `git status`/`git worktree list`).
- Peers correctly refuse relayed "policy from Agus" for consequential acts - never launder authority; route real authorization from the actual user.
- Managing dev servers matters: a running `next dev`/`next start` locks node_modules (lightningcss EPERM on Windows). Ensure servers are OFF before npm ci/install.

## Immediate next action
Wait for e9's realtime root-cause + fix; verify in a prod build; commit via PM. Then signal 96 clear. Then, when the user wants: /live grouping, then public-release prep (secret scan first).
