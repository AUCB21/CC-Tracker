# Plan: Upgrade Next.js 15.5.24 -> 16.3.3 (latest)

Status: PLANNED, not started. Resumable: each phase is a checkpoint. A fresh agent can read this file + `git log` + `git status` and continue from the first unchecked box.

This is a MAJOR version jump (15 -> 16). Expect breaking changes; do not treat it as a patch bump.

## Current state (verified 2026-08-31)
- `next` 15.5.24, `react` 19.1.0, `react-dom` 19.1.0
- `eslint-config-next` 15.5.24, `@types/react` ^19, `@types/react-dom` ^19
- Package manager: npm (`package-lock.json`). Confirm Node version meets Next 16's minimum before starting.
- Stack to keep working: App Router + RSC, Supabase (server via service key + browser client for realtime), Recharts, Tailwind v4 (`@theme` in `app/globals.css`), the custom impeccable detector.

## Isolation / coordination (READ FIRST - shared working tree)
The whole `cc-track` dir is ONE git working tree shared by multiple sessions on branch `front`. An upgrade touches `package.json`, `package-lock.json`, `next.config.*`, `tsconfig.json`, and possibly many files via codemod, so it needs EXCLUSIVE access.
- Recommended: a dedicated branch `chore/next-16` OR a separate git worktree. Note: switching branches in a shared tree moves EVERY session, so all sessions must pause and agree first. Coordinate through the PM (agus-e3) before switching or starting.
- All other code tasks (e.g. the queued /live grouping) are PAUSED until this lands.
- Commit policy unchanged: route commits through the PM, explicit paths, no `git add -A`.

## Phases
1. [ ] Prep: clean tree; confirm Node >= Next 16 minimum; decide branch/worktree; read the OFFICIAL Next 16 upgrade guide (https://nextjs.org/docs/app/guides/upgrading/version-16) and the user-provided guidelines. Record starting versions.
2. [ ] Run the official codemod: `npx @next/codemod@latest upgrade latest` (bumps next / react / react-dom / eslint-config-next and applies automated codemods). Review every change it makes before trusting it.
3. [ ] Align peer deps: react / react-dom and `@types/react(-dom)` to what Next 16 requires; `eslint-config-next` to 16.x. `npm install`, regenerate the lockfile.
4. [ ] Fix breaking changes the codemod missed. Check at least: async request APIs (cookies/headers/params/searchParams - already async here, confirm), fetch/caching defaults, `next.config` renamed/removed options, image/font APIs, middleware and runtime changes, Turbopack-by-default for dev/build, any removed APIs. Confirm Tailwind v4, Recharts, and Supabase SSR/realtime still work.
5. [ ] Gates: `npx tsc --noEmit -p .` clean; `npm run lint` clean; `npm run build` succeeds; impeccable detector still returns `[]`; no em/en dashes introduced; keep sizing relative (no new px). Smoke-test key routes: `/`, `/live` (realtime append), `/analytics` (charts), `/tasks` (attend), and the mobile hamburger drawer.
6. [ ] Report to PM to commit: one commit for the dep+lockfile+config bump, separate commits for any logically distinct code fixes. Do NOT git add/commit/push directly.

## Done when
App builds and runs on Next 16.3.3, every gate green, key routes verified, committed.

## Resume / low-token handoff
Guidelines for this task are provided to the implementing session (5a/e9) directly by the user (copy-paste). If tokens run out mid-upgrade: commit or stash WIP with a clear message, tick the boxes above to reflect progress, and a fresh agent resumes from the first unchecked phase.
