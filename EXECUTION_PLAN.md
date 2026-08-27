# Execution Plan: Command Deck follow-up

Post `init` / `document` / `audit` / `harden`. Continues after user preview on 2026-08-26. Each phase is self-contained: an agent can pick up any phase without holding prior conversation, as long as they load the invariants below first.

## Progress log

| Phase | Status | Notes |
|-------|--------|-------|
| 0. Padding hotfix | DONE 2026-08-26 | `<main>` uncapped; prose caps locally at `max-w-[75ch]`. DESIGN.md invariant updated. |
| 1. Credentials sheet | DONE 2026-08-26 | `/api/config` (dev+localhost guarded, rate-limited). `<CredentialsProvider>` + `<CredentialsMaster>` + `<CredentialsField>` + `<CredentialsSheetSurface>` in `components/credentials-sheet.tsx`. Env rows in Setup are individually clickable and open the sheet focused on that key. Reload after save. Needs user verification that Next 15 auto-hot-reloads `.env.local` without manual restart. |
| 2. Sidebar groups + sticky shelf | DONE 2026-08-26 | Sidebar grouped `Observe / Work / System` with active state + accent dot indicator (client component `<DeckRail>`). Shelf sticks at top with pathname breadcrumb + Supabase connection status linking to `/setup` (`<DeckShelf>`). Mobile top bar uses `<DeckRailMobile>` (icon-only). |
| 3. Filter rail on Sessions | DONE 2026-08-26 | Generic `<FilterRail>` in `components/filter-rail.tsx` (sidebar + drawer variants). Sessions list gets Project / Model / Time window facets. Session detail gets Event type / Tool facets. URL is source of truth. `lib/queries.ts` `getSessions` / `getEvents` accept the new filter args. |
| 4. Live polling toggle | DONE 2026-08-26 | `<LiveTimeline>` client component replaces the static timeline card. Toggle "Follow live" polls `GET /api/sessions/[id]/events?since=<id>&type=&tool=` every 3s and prepends new rows (500 max). New rows flash briefly in accent, respecting `prefers-reduced-motion`. Auto-hidden when session is ended. |
| Wrap-up: re-audit | DONE 2026-08-26 | Score 18/20 (Excellent). Detector 0 findings. Typecheck clean. All P1 items from prior audit resolved. Remaining: 2 P2 (chart palette literals due to Recharts constraint; force-dynamic + full-table reads intentional for single-user localhost) and 1 P3 (nav glyph at 70% accent, decorative). Plan formally closed. |

**Next actionable step for a resuming agent (2026-08-26 session cut off at 90% tokens):**

1. Answer the user's open question on `SUPABASE_SERVICE_ROLE_KEY` migration (see "Open questions" below) BEFORE touching any DB code. The user asked for a validation, not a change; do not migrate to the new publishable/secret key pair without their explicit go-ahead.
2. Run `/impeccable audit` on the whole app. Baseline before phases was 14/20; target now is 17-18. If a dimension regressed, the phase that owns it owns the fix.
3. Consider the Vercel dashboard patterns the user pointed to (see "Open questions"); they are ideas to evaluate, not a committed backlog.
4. Verify Phase 1 behavior end-to-end in the browser: (a) click each env row -> sheet opens focused on that key; (b) master Connect button; (c) save writes to `.env.local` and dev server picks up new values without manual restart.

Detector and typecheck must both be clean before marking a phase DONE in this table. Detector script: `node .claude/skills/impeccable/scripts/detect.mjs --json <files>`. Typecheck: `npx tsc --noEmit -p .`.

## Open questions (user-raised, pending in next session)

**Q1. DONE 2026-08-26.** User migrated to `sb_secret_*` and renamed the env var to `SUPABASE_SECRET`. Code accepts `SUPABASE_SECRET` as canonical, keeps `SUPABASE_SERVICE_ROLE_KEY` as fallback for backward compat. `CredentialsSheet` label and validator updated. `.env.example` updated.

**Q1 (original text).** Do we still need the service-role key? User pointed out Supabase docs mark `service_role` as a legacy API key that bypasses RLS. They want a validation before touching the DB. The current architecture uses `SUPABASE_SERVICE_ROLE_KEY` server-side in `lib/supabase.ts` and refuses to serve when it is missing. Supabase now offers a `sb_publishable_*` + `sb_secret_*` split. Migration path to evaluate:

- Replace `SUPABASE_SERVICE_ROLE_KEY` with a new `SUPABASE_SECRET_KEY` (server-side only) that also bypasses RLS but is the modern equivalent.
- Add `SUPABASE_PUBLISHABLE_KEY` for any future client-side reads, but the current app has NONE (everything is server components + hooks); it may be unnecessary.
- Keep the same "server-side only, service-role-equivalent, RLS on with no policies" security posture. The switch is a rename plus regenerating the key in the Supabase dashboard.
- DB schema does NOT need changes for this migration. The `CredentialsSheet` label + validator should be updated to accept the new key format if we migrate.

The correct answer for a single-user localhost tool: probably migrate to the new secret key because Supabase will retire the legacy `service_role` eventually, but this is not urgent. Do the migration in one focused pass, do not mix it with UI work.

**Q2. Vercel dashboard patterns to consider adopting.** User shared a Vercel Projects overview screenshot. Patterns worth evaluating (adapt, do not copy, keep Command Deck world):

- **Deep left rail with sub-sections and item counts** (Environment Variables 9, etc). Ours has grouped nav; consider showing counts next to entries where meaningful (e.g. "Sessions 47", "Plans 12"). One number per entry, not a badge cluster.
- **Persistent breadcrumb at top** ("aucb21's project / All Projects / Overview"). Ours has a single-level section label in the shelf. If we add project-scoped detail routes deeper, extend the shelf to render a real breadcrumb (segment per path chunk).
- **Two-column overview: usage rail on the left, primary content grid on the right**. The Setup page already uses this pattern (env + verify on left, steps on right). Consider extending to Overview: usage/quota-style rail on the left (Sessions today, Cost this month, Prompts today), main project grid on the right.
- **Compact project cards with title, subtitle, small status glyph, latest activity line**. Our current Recent Sessions rows are close; the analogue would be a project GRID on the Projects page. Already implemented; look for details we can tighten (glyph slot, one-line commit-style summary).
- **Right-side "action zone"** in the shelf ("Add New" dropdown). We do not have create actions surfaced there; not needed while `cctrack` CLI is the primary write channel.

Do NOT copy: Vercel's green (violates The One Signal Rule, terracotta is our accent); the ambient glow behind the project logo (decorative gradient); the plan-upgrade CTA aesthetics.

Verdict: 2 of these are cheap wins (count-per-nav-entry, real breadcrumb). Rest is speculative until the product needs them.

## World invariants (never violate)

Load in this order before writing any UI:

1. [`PRODUCT.md`](PRODUCT.md), single-user retrospective analytics on localhost, no auth, service-role server-side only.
2. [`DESIGN.md`](DESIGN.md), "The Command Deck" world, 13 Named Rules pinned.
3. [`.claude/skills/impeccable/reference/craft-floor.md`](../../.claude/skills/impeccable/reference/craft-floor.md), quality floor.
4. Memory: `feedback-no-em-dash` (global ban on `-` / `–`) and `feedback-fill-the-deck` (wide-monitor packing).

Hard rules (all trace to DESIGN.md):

- Terracotta signal `#d97757` is the ONLY raised voice. Sage / Ember / Indigo have fixed semantic roles (done / in-flight / reference). No decorative color.
- Units: `rem` / `em` / `ch` / `vw` / `%` / `clamp()`. `px` allowed only for 1px hairlines and shadow blur.
- Type: Display and Data-Display use `clamp()`. Numbers that share a column use Geist Mono with `tabular-nums`.
- Motion: ceiling 150ms, ease-out. No bounce, no scale beyond 1.02, no ripple. `prefers-reduced-motion` respected globally.
- Grounds: warm graphite scale (Deep Slate to Lifted Slate). Never `#000`.
- Copy: no em dash, no en dash, no emoji in chrome. Geometric SVG icons only.
- Fill-the-deck: wide monitors add columns or right rails, never centered narrow decks with empty margins.

Detector gate: `node .claude/skills/impeccable/scripts/detect.mjs --json <changed files>` must return `[]` on every file touched before shipping the phase.

Ordering: phases are additive. A later phase may depend on an earlier one (Phase 3 filters use groupings from Phase 2). Do not reorder without recalculating dependencies.

---

## Phase 0: Padding hotfix (5 min, THIS SESSION)

**Goal.** Fix the ~750px empty gutter on the right side of every page on wide monitors. Reported by user.

**Root cause.** [`app/layout.tsx`](app/layout.tsx) `<main>` has `maxWidth: min(96vw, 1600px)` with `flex-1` and no `mx-auto`; on a 2560px monitor the main lane fills to 1600px then leaves ~750px dead space to the right.

**Change.** Remove the max-width cap on `<main>` entirely (it becomes `w-full flex-1`). Local `max-w-[75ch]` on prose paragraphs inside cards so line length stays readable. Applied 2026-08-26 after user challenged the intermediate `min(98vw, 2000px)` compromise.

**Skills.** None. Direct edit.

**Done when.** On a >=2400px viewport the deck lane fills to at least 2000px. On 1440px unchanged. Detector clean.

**Handoff.** Trivial. Complete in one edit.

---

## Phase 1: Credentials sheet + `/api/config`

**Goal.** User pastes Supabase URL + service-role key + tracker API key into a right-side sheet on Setup; the app persists them to `.env.local`; Next 15 hot-reloads env vars; Status badges re-check without a manual server restart.

**Scope.**

- New API route `POST /api/config` writing `.env.local` atomically.
- **Localhost + development guard**, refuse in any other context. `NODE_ENV === "development"` AND request origin resolves to `127.0.0.1` / `::1` / `localhost`. Refuse otherwise with 403.
- New client component `<CredentialsSheet />`: right-slide overlay, three-field form OR a "paste full .env" textarea (auto-parse KEY=VALUE lines), inline validation, submit, success toast, re-check.
- Sheet triggered from Setup page CTA (replaces the "1/3 ready" chip with a Connect button).
- Docs update in Setup Card 1 pointing at the sheet as the primary flow, keeping the SQL editor step manual.

**Skills.** [`/impeccable harden`](/.claude/skills/impeccable/reference/harden.md) for form states (empty, invalid, network error, success). Craft-floor before writing UI.

**Files touched.**

- New: `app/api/config/route.ts`, `components/credentials-sheet.tsx`.
- Edit: `app/setup/page.tsx` (add the CTA, wire the sheet), possibly `lib/supabase.ts` for a manual re-init helper if the auto hot-reload proves flaky.

**Security notes (non-negotiable).**

- Endpoint refuses on non-dev, non-localhost. No auth on the endpoint, but a hard host+env check.
- Rate limit: 5 writes per minute in memory.
- Atomic write: write to `.env.local.tmp` then `rename`. Never partial writes.
- Never log the key values. Errors describe missing/invalid without echoing.

**Done when.** From a fresh install the user opens Setup, clicks Connect, pastes the three values, clicks Save; the three badges flip to "configured" without touching the terminal. Detector clean.

**Handoff / bail-out.**

- If Next 15's hot reload of `.env.local` proves unreliable in your test, add a "restart dev server" toast note and stop; do not rewrite the config reader. Document the limitation in the sheet.
- If security guard becomes a blocker (user runs behind a reverse proxy), stop and ask before loosening.

---

## Phase 2: Sidebar groups + sticky header shelf

**Goal.** Denser sidebar with semantic grouping. Sticky header shelf on every page with quick actions (branch/project selector when applicable, connect button, live count).

**Scope.**

- Sidebar reorg: group the 6 nav items under `OBSERVE` (Overview, Analytics), `WORK` (Projects, Plans, Sessions), `SYSTEM` (Setup). Group labels in Caption typography, uppercase-tracked, Dust color, `mt-4` spacing.
- Sticky top shelf: `sticky top-0 bg-panel/80 backdrop-blur border-b border-line`, holds the page title breadcrumb on the left and page-specific quick actions on the right. Replaces the current in-body `<PageHeader>` right slot for high-frequency pages (Overview, Sessions, Analytics).
- Live count moves from Overview into the shelf, visible everywhere.

**Skills.** [`/impeccable layout`](/.claude/skills/impeccable/reference/layout.md) for the grouping and spacing decisions, [`/impeccable typeset`](/.claude/skills/impeccable/reference/typeset.md) for the group-label treatment. Craft-floor.

**Anti-patterns to avoid.** Do not turn the sidebar into an enterprise tree with collapsibles and 12 sub-items; the anti-reference "Densidad enterprise" is in force. Two levels: group label + item, that is all. No emoji, no gradient, no icon size change on hover.

**Files touched.**

- Edit: `app/layout.tsx` (grouped nav + shelf slot), `components/ui.tsx` (add `<Shelf>` component if worth extracting).
- Every `app/**/page.tsx` (move the header's right slot into the shelf where appropriate; keep `<PageHeader>` for the title/sub).

**Done when.** Nav reads as three grouped columns. Shelf sticks on scroll. Live count visible from any page. Contrast on the sticky shelf backdrop verified (backdrop-blur + `bg-panel/80` may drop below AA against `bg-background`; test both). Detector clean.

**Handoff.** If shelf hurts mobile top-bar layout, keep the sticky behavior desktop-only. Ship in one commit.

---

## Phase 3: Filter rail on Sessions and Session detail

**Goal.** Right-side filter rail (persistent, not modal) on `/sessions` and inside `/sessions/[id]` for the event timeline. This is the primary "fill the deck" move for these pages.

**Scope.**

- New component `<FilterRail>` in `components/ui.tsx`. Fixed width `18rem`. Section-per-facet with checkbox lists.
- Sessions list facets: Project, Model, Status (live / idle / ended), Duration bucket, Date range. State in the URL (`?project=...&model=...`).
- Session detail timeline facets: Event type (prompt / tool_use / tasks_synced / session_start / session_end), Tool name (top 10 in this session).
- Rail collapses to top drawer under `lg:` (below 1024px).
- Query updates in `lib/queries.ts` accept the new filter args (server-side filtering, no client-side hiding).

**Skills.** [`/impeccable layout`](/.claude/skills/impeccable/reference/layout.md), [`/impeccable adapt`](/.claude/skills/impeccable/reference/adapt.md) for mobile collapse. Craft-floor.

**Anti-patterns to avoid.** No live-search boxes (adds jank; the facets are enough). No "advanced filters" drawer. Filter state persists in the URL, not in localStorage (deck honesty: what you see is what the URL says).

**Files touched.**

- New: `components/filter-rail.tsx`.
- Edit: `app/sessions/page.tsx`, `app/sessions/[id]/page.tsx`, `lib/queries.ts` (filter args on `getSessions`, `getEvents`).

**Done when.** Selecting Project=X in the rail on `/sessions` re-renders the table server-side with X-only rows and the URL updates. Same in the timeline. Rail collapses cleanly under 1024px. Detector clean.

**Handoff.** If URL state gets complex, use `nuqs` (already a common pick), but pause and ask before adding a dep, ponytail applies.

---

## Phase 4: Live polling toggle in Session detail

**Goal.** For the currently active session, a toggle in the shelf that turns on 3s polling and updates the event timeline in place. Replaces manual refresh.

**Scope.**

- Client component `<LiveToggle sessionId />` in the shelf when viewing `/sessions/[id]` AND `isLive(session)`.
- When ON: `setInterval(3000)` fetches `/api/sessions/[id]/events?since=<lastEventId>` and prepends new events to the timeline. Also updates the session's stats block (prompt count, tool count, cost) from a compact `/api/sessions/[id]/stats` endpoint.
- `LiveDot` in the shelf pulses only when polling is active. When paused, dot is solid neutral.
- Auto-off when session ends (server tells us on next poll).
- Respects `prefers-reduced-motion` (no pulse, still updates).

**Skills.** [`/impeccable animate`](/.claude/skills/impeccable/reference/animate.md) for the update transition (a subtle "just arrived" tint on new rows, 120ms terracotta-soft flash, then settle). Craft-floor.

**Anti-patterns to avoid.** No websockets, no SSE, no service worker. HTTP polling is enough for single-user localhost. No "auto-scroll to top on new event"; the operator controls scroll. No sound.

**Files touched.**

- New: `app/api/sessions/[id]/events/route.ts` (GET, since-cursor), `app/api/sessions/[id]/stats/route.ts` (GET).
- Edit: `app/sessions/[id]/page.tsx` (split shell into RSC skeleton + client `<LiveToggle>` slot), `components/ui.tsx` (extend `<LiveDot>` with an idle state).

**Done when.** With the toggle on and an active Claude Code session firing hooks, the event timeline receives new rows within ~3s of the hook without the user pressing anything. Reduced-motion users see no pulse but still get updates. Detector clean.

**Handoff.** If Supabase's read latency is too high for 3s cadence, bump to 5s and note it. Do not switch to SSE without discussion; the deck is single-user.

---

## Wrap-up (after Phase 4)

Re-run `/impeccable audit`. Target: 17 or 18 out of 20. If any dimension drops below the previous baseline, the phase that introduced the regression owns the fix.

Consider `/impeccable delight` in a later session, ONLY once every phase above is shipped and the audit sits at 17+. Delight is discretionary, none of it is on this plan.

---

## Handoff cheat sheet (any agent resumes here)

1. Read this file end to end.
2. Read `PRODUCT.md` and `DESIGN.md`.
3. Load `.claude/skills/impeccable/reference/craft-floor.md`.
4. Read the two memory files (`feedback-no-em-dash`, `feedback-fill-the-deck`).
5. Pick the earliest unfinished phase. Do not start a later phase until the earlier one is done.
6. Every phase ends with the detector returning `[]` on touched files and a typecheck pass (`npx tsc --noEmit -p .`).
7. When in doubt, ponytail: shortest working diff that honors the world.
