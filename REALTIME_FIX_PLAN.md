# Plan: Fix Next 16 Supabase Realtime regression

Decision (user, 2026-08-31): KEEP Next 16 on front. Fix the realtime break rather than revert.

## Context
After upgrading front to Next 16.3.3 (commit f6784d5), browser Supabase Realtime subscriptions receive ZERO broadcasts in a PRODUCTION build (`next start`) - app-wide, not just /live:
- /live events + task-runs lanes do not append new inserts.
- Attend-button live status and live-timeline rely on the same browser Realtime path, so they are affected too.
Verified: the DB still emits broadcasts (RLS + publication healthy); an INDEPENDENT test channel opened from the same prod page also gets nothing, though the identical test WORKED pre-Next-16. Initial server-side fetches are fine. tsc + lint + build pass; all non-realtime pages work.

## Suspects (from the diagnosing session, most likely first)
1. React 19.1 -> 19.2 useEffect/lifecycle semantics (effect never installs the listener, or tears down before the WS opens).
2. Turbopack (Next 16 default) bundling of `@supabase/supabase-js` (its ws client) in the browser bundle - ESM/CJS interop or worker resolution.
3. RSC / client-component hydration timing change in Next 16.

## Tasks
1. [ ] Reproduce + isolate root cause with a MINIMAL repro in a prod build (bare channel subscribe -> receive). Do not guess-fix; identify the actual cause.
2. [ ] Apply the smallest fix that restores prod realtime: could be a dep pin/bump (react, @supabase/supabase-js), a next.config option (serverExternalPackages / transpilePackages / Turbopack resolve), or a code change in the subscription. Must not break the other working pages or the Next 16 upgrade.
3. [ ] Verify in a PROD build (`next build && next start`): /live events lane appends a new insert without reload; attend live status + live-timeline update. Re-run tsc + lint + build.
4. [ ] Report to PM to commit (explicit paths). Keep the rules: no em/en dashes, relative units, ponytail-minimal.

## Constraints
- Keep Next 16 (do not revert). If the only viable fix is a major/ risky dependency change, or root cause cannot be found, PAUSE and report to the PM for an Agus decision.
- Manage your own dev/prod server: keep it OFF when not testing so it does not lock node_modules; stop it when done.

## Likely files
lib/supabase-browser.ts, app/live/live-feed.tsx, components/live-timeline.tsx, app/tasks/attend-button.tsx, next.config.ts; package.json only if a dep change is the fix (coordinate through PM first).

## Resume / low-token handoff
front is on Next 16 at f6784d5. If tokens run out mid-fix: commit/stash WIP with a clear message, tick the boxes above, and a fresh agent resumes from the first unchecked task.
