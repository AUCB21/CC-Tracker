# Implementation Plan — Sidebar redesign + two polish fixes

**Status:** DRAFT for review. No code changed yet.
**Repo:** `AUCB21/CC-Tracker`, branch `main`.
**Source of truth:** design file `Claude Control Light.dc.html` (Claude Design project `70447bef-…`), read live. Dev state verified in-browser at `localhost:3000` on 2026-09-14.

## How this plan is meant to be run

- Each **Task** below is a self-contained contract for one **sonnet subagent** (per the repo rule: main session plans/reviews, subagents do all file writes). Hand a subagent exactly one Task block.
- **House rules every subagent must obey:**
  - **Relative units only** — `rem`/`%`/`vw`/`clamp()`. Never `px` in UI. The design file quotes px; convert at `16px = 1rem`. Touch targets ≥ `2.75rem`.
  - **No em dash** in any UI string (`format.ts` documents the No-Em-Dash Rule). Use a hyphen.
  - **No co-author trailer** on commits in this repo.
  - Do **not** touch the `next dev`-generated block in `AGENTS.md` / `CLAUDE.md`.
  - Verify with `npx tsc --noEmit` (must be clean) and `npm run lint` (must add **no new** issues; the repo has ~1130 pre-existing lint errors — ignore those, they are unrelated).
- Tasks 3 and 4 are independent and tiny; they can run in parallel with each other and before/after Task 1–2.

## Scope note

None of this was part of the chart-polish handoff (that covered charts/stats/donuts only, and is already implemented). This is **net-new** work triggered by the "sidebar looks different" review. The chart handoff's one open item — recoloring the two analytics donuts — was completed separately and is not repeated here.

---

## Current vs design — the gap

Dev sidebar (`app/layout.tsx:68-117`) is a **fixed** `<aside>` (`clamp(12rem,14vw,15rem)`, `hidden md:flex`) with hard-coded nav groups, per-item live badges, and a `v0.1.0` footer. The design (`Claude Control Light.dc.html`, two `<aside>` states) is a **collapsible** rail with features the dev build lacks:

| Feature | Design | Dev today |
|---|---|---|
| Collapse expanded⇄rail | Yes — `268px` ⇄ `60px`, toggle button | **No** |
| Workspace / project switcher | Yes — dropdown, per-row tick + count, "Add workspace" | **No** |
| Search + ⌘K | Yes | **No** |
| Nav badges (Live/Tasks/HITL) | No | Yes (keep) |
| Version footer / "PROGRESS TRACKER" subtitle | No | Yes (keep) |

Decision baked into this plan: **merge, don't replace.** Add the design's collapse behavior; keep the dev build's badges, subtitle, and version footer.

---

## Task 1 — Collapsible sidebar (expanded ⇄ icon-rail)

**Goal:** the desktop `<aside>` toggles between the current expanded width and a narrow icon-only rail; state persists per viewer.

**Files:**
- `app/layout.tsx` — the `<aside>` (lines ~68-117) and its right-hand content wrapper (`md:ml-[clamp(...)]`, line ~171).
- New client component `components/sidebar-toggle.tsx` (the button + state; the aside is server-rendered so the toggle must be a small client island driving a class/attribute on a shared ancestor).
- `app/globals.css` — collapsed-state rules.

**Contract:**
1. Two widths as CSS custom properties on a wrapper, e.g. `--rail-w: clamp(12rem,14vw,15rem)` expanded, `3.75rem` collapsed (60px = 3.75rem). The `<aside>` and the `md:ml-…` main wrapper both read `var(--rail-w)` so they stay in lockstep — no duplicated width literal.
2. Collapse toggle button: a `2.75rem` hit target, top of the sidebar, `aria-label` "Collapse sidebar" / "Expand sidebar", `aria-expanded` reflecting state. Use the design's icon (rounded rect + vertical divider line).
3. Collapsed state: hide the wordmark, subtitle, nav text labels, group headings, and version footer; keep the CC logo tile and nav icons centered. Nav badges collapse to a small dot or count on the icon. Use CSS (`[data-rail="collapsed"] .label { display:none }` pattern via `hidden` attribute or a class) — no per-item JS.
4. **Persist** the choice in `localStorage` key `cc-track-rail` (`"expanded"|"collapsed"`), mirroring the existing theme/density pattern. Apply it pre-hydration in the existing `beforeInteractive` script in `layout.tsx:56` so there is **no flash** and **no hydration mismatch** (extend that IIFE; set `data-rail` on `<html>` or the wrapper).
5. Keep the mobile top-bar path (`md:hidden`, `MobileNav`) exactly as-is. Collapse is desktop-only.
6. Respect `prefers-reduced-motion`: width transition uses the existing `--duration-*` tokens and is disabled under reduced-motion.

**Do NOT** add the workspace switcher or search here — those are Task 5 (deferred). Keep this diff to collapse only.

**Check:** tsc clean; lint no-new; manually confirm (or ask main session to browser-verify) expand/collapse persists across reload with no flash.

---

## Task 2 — (folded into Task 1) shared-width wiring

Covered by Task 1 step 1. Called out separately only so the reviewer confirms the `--rail-w` single-source approach before Task 1 starts. **No separate agent.**

---

## Task 3 — Fix theme-toggle hydration mismatch

**Bug (verified live, console error on every page when saved theme ≠ server default):** server renders `ThemeToggle` with the light-mode label/icon ("Switch to dark mode", moon); client hydrates from `localStorage` with the opposite ("Switch to light mode", sun) → React logs a hydration mismatch and regenerates the subtree.

**File:** `components/deck-preferences.tsx` (the `ThemeToggle` component).

**Contract (pick the minimal fix, in this order):**
1. Have the toggle read its initial state so SSR and first client render agree — i.e. render a **theme-neutral** button on first paint (no theme-specific label/icon until mounted), then swap in an effect; **or**
2. add `suppressHydrationWarning` to the toggle button and set its label/icon from a `useEffect`/mounted flag.

Prefer option 1 (correct, not just silenced). The pre-hydration script in `layout.tsx:56` already sets `data-theme` before paint, so the toggle can derive initial icon from `document.documentElement.dataset.theme` inside a mounted guard.

**Check:** tsc clean; lint no-new; reload `/analytics` in dark mode — the "Hydration failed" console error must be gone.

---

## Task 4 — Light-mode "Est. cost" card contrast

**Issue (verified live):** the emphasized Est. cost stat value is faint in **light** theme — `--color-accent-200` text on an accent-tinted gradient is the lowest-contrast text on the page. Dark mode is fine.

**File:** `components/ui.tsx` — `Stat`, the value `<span>` (`emphasis ? "var(--color-accent-200)" : …`, line ~219). Possibly a token in `app/globals.css`.

**Contract:** darken the emphasized value color in **light theme only** so it meets WCAG AA (≥ 4.5:1) against the emphasized card background. Do not change the dark-theme value. Prefer fixing via the CSS variable so both the value and its `textShadow` stay consistent; do not touch non-emphasis stats.

**Check:** tsc clean; lint no-new; eyeball light mode — value clearly legible.

---

## Task 5 — DEFERRED: workspace switcher + ⌘K search

The design's sidebar also has a **project/workspace dropdown** (per-row tick + count, "Add workspace") and a **search input with ⌘K**. These are larger features (new data wiring for the project list, a command-palette interaction, keyboard handling) and are **out of scope for this pass**. Flagged here so the design gap is on record.

`// ponytail: workspace switcher + ⌘K deferred; build when someone actually needs multi-workspace nav`

Decide separately whether to build these. If yes, each is its own plan.

---

## Suggested order & commits

1. Task 3 + Task 4 (tiny, independent, low-risk) — one commit each or one combined `fix(ui): theme-toggle hydration + light est-cost contrast`.
2. Task 1 (collapsible sidebar) — `feat(nav): collapsible sidebar with persisted rail state`.
3. Task 5 — deferred, no commit now.

Branch off `main` before any commit (do not commit directly to `main` without a green tsc + no-new-lint).

---

## Open questions for the reviewer

1. Collapsed rail width: design says 60px → `3.75rem`. Keep, or match your existing `clamp` min?
2. On collapse, keep nav **badges** visible (as a dot/count on the icon) or hide them? Plan assumes keep-as-dot.
3. Confirm **defer** Task 5 (workspace switcher + ⌘K), or do you want it scoped now?
4. Should collapse state be **per-device** (`localStorage`, as planned) or shared? localStorage matches the theme/density precedent.
