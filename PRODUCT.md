# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Single primary user: the project owner (a solo developer who uses Claude Code daily). The tool runs on `localhost` only. No teammates, no shared instances, no public distribution planned. There is no secondary audience and none is expected.

## Product Purpose

CC-Track ingests everything a Claude Code developer does (sessions, prompts, tool calls, plans, tasks, tokens, estimated cost) and surfaces **retrospective analytics** over the resulting data. Success is a dashboard that answers "how am I actually using Claude Code, across which projects, at what cost, on which tools, at which hours, with what completion rate" without the developer ever thinking about instrumentation.

The retrospective view is the reason the product exists. Live-session monitoring exists but is a secondary affordance.

## Positioning

Zero-friction telemetry tied to Claude Code's native hook events (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd). The developer pastes one hook block into `~/.claude/settings.json` once and every future session is captured automatically. No tags, no manual logging, no third-party observability agent. The `cctrack` CLI plus a paste-in `CLAUDE.md.snippet` lets Claude itself keep the plan/task bookkeeping updated, and the project-level `cc-track/CLAUDE.md` makes the rule binding: any agent working inside the repo must use `TaskCreate` / `TodoWrite` / `ExitPlanMode` for multi-step work so `/tasks` and `/plans` stay in sync with what agents actually do.

## Operating Context

- Runs at `http://localhost:3000` on the developer's own machine.
- Tracker lifecycle is bound to Claude Code activity: the hook script probes `/api/health` on `SessionStart` and every `UserPromptSubmit` and boots the server via `start-hidden.vbs` (fire-and-forget, no console window) when it is down. Every hook fire also touches `.heartbeat` client-side, so `start.sh`'s idle timer (`IDLE_TIMEOUT`, default 60s) resets while any session is active and the server shuts down on its own once Claude goes quiet. The developer never starts or stops it manually and no microservice lingers between sessions.
- Data lives in a personal Supabase project. All DB access is server-side using the service-role key; RLS is enabled with no policies so the anon key returns nothing.
- API surface is protected by a shared `CC_TRACKER_API_KEY` header, not by end-user auth.
- Ingestion happens through a Node hook script (`hooks/claude-tracker.mjs`) wired into Claude Code, plus a CLI (`bin/cctrack.mjs`) that targets the current session automatically via `~/.cc-track/current-session.json`.
- Used asynchronously, after or between coding sessions, more than during them.

## Capabilities and Constraints

Confirmed capabilities:
- Auto-created `projects` (per cwd), `sessions` (PK = Claude session UUID), `plans`, `tasks`, and a raw `events` log.
- Per-session capture: model, git branch, prompt count, tool-use count, tokens (input / output / cache_read / cache_creation), per-tool breakdown, estimated USD cost.
- TodoWrite lists sync into `tasks` via a stable dedupe key.
- Rough per-1M-token USD pricing by model family (opus / sonnet / haiku).
- Dashboard surfaces: Overview, Projects (list + detail), Plans, Sessions (list + detail with a full event timeline), Analytics (activity, tokens & cost, tool ranking, task completion, model share, session-duration buckets, hour-of-day prompting), Setup.
- Server auto-boot + client-side heartbeat: opening a Claude Code session brings the tracker up if it is down; agent activity keeps it alive; silence past `IDLE_TIMEOUT` shuts it down. No manual `npm run start` and no always-on process.
- Recharts is code-split via `next/dynamic` (SSR off) so first paint on non-chart routes stays out of the chart-library payload.

Constraints:
- Single-user by design. No auth screens will ever be added.
- Not intended to leave `localhost`. If exposed, it must sit behind VPN or reverse-proxy auth. The app has no login of its own.
- Pricing is an estimate, not a bill. Numbers drift when Anthropic changes rates.
- The hook script never blocks Claude Code; every failure path exits `0` silently.

Undecided:
- Whether per-project budgets or cost alerts belong in the product.
- Whether the WhatsApp / NL-command ingestion path described in `plan-de-diseno-gestor.md` is ever built. Currently theoretical, no endpoint exists.

## Brand Commitments

None binding. The current wordmark (CC-Track), the Claude-orange accent, and the dark-only theme are the incumbent implementation but not committed identity. Future design work may replace any of them.

## Evidence on Hand

- `README.md`, architecture diagram, install steps, feature matrix.
- `supabase/schema.sql`, the definitive data model (projects, sessions, plans, tasks, events).
- `plan-de-diseno-gestor.md`, an older, narrower plan for a projects/plans/tasks manager that predates the current tracker. Kept for reference. Its WhatsApp section is theoretical: **no endpoint exists, do not represent it as shipping.**
- `CLAUDE.md.snippet`, the paste-in that makes Claude keep plan/task state updated automatically.

No customer testimonials, no benchmarks, no press coverage exist. Do not invent any.

## Product Principles

1. **Capture is invisible.** If the developer has to remember to log a session, capture has failed.
2. **Retrospective over real-time.** Pattern-finding across sessions beats live vitals.
3. **Never block Claude Code.** Any ingestion failure exits silently.
4. **Server-side only.** The browser never holds a key that could leak data; the anon key is inert.
5. **Single-user honesty.** No login UI, no user picker, no permissions grid — the app is honest about who it serves.

## Accessibility & Inclusion

No product-specific standard was established beyond baseline: readable contrast on the dark surface, keyboard reachability of every link/button, and no color-only status conveyance (badges pair a color with a symbol or word).

Concrete implementations layered on that baseline:
- **Touch targets:** interactive icon controls route through a shared `IconButton` primitive sized 2.75rem (WCAG 2.5.5 AAA). Same target size on modal close, pager Prev/Next, filter-drawer rows, and the mobile DB-status link. Inline filter-chip remove `×` keeps its 14px glyph but expands its hitbox to 44x44 via a transparent `::before` pseudo-element, so touch works without disturbing the chip's rhythm.
- **Icon-only controls:** `aria-label` is explicit (not just a `title` tooltip) on `CopyButton`, the attend-button `+`/`×` toggle, and the active-filters remove chip, so assistive tech announces the action instead of the glyph.
- **Charts:** every chart export is wrapped in `role="img"` with a descriptive `aria-label`, and font sizes are declared in `rem` (not unit-less px), so screen readers announce a summary and users who scale text see the chart labels scale with them.
- **Status color discipline:** error states route through a shared `ErrorAlert` primitive and always render in Red; Ember (yellow) is reserved for in-flight and warning states per the design system. A failed run, a stdout error line, and an inline validation hint all read as the same category to a viewer scanning for problems.
