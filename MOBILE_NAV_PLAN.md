# Plan: Hamburger mobile navigation

Goal: replace the mobile top bar's horizontal icon-scroll nav (`DeckRailMobile` in `components/deck-rail.tsx`) with a hamburger-style menu: a toggle button that opens a slide-in drawer listing the grouped nav items.

HARD RULE (user, emphasized): NO px sizes anywhere in this work. Use rem / em / % / vw / clamp() only. px is allowed ONLY for 1px hairlines and shadow blur (existing DESIGN.md exception). Tailwind's default spacing scale is rem-based, so standard utilities are fine; never use arbitrary px values like `[18px]`.

World invariants still apply: terracotta the only raised-voice accent, warm graphite grounds, no em/en dash, no emoji in chrome (geometric SVG only), motion via the existing `--duration-*` tokens, respect `prefers-reduced-motion`.

## Files (locked to the implementing agent until committed)
- `app/layout.tsx` (mobile `<header>` block, swap `DeckRailMobile` for the hamburger toggle + drawer mount)
- `components/deck-rail.tsx` (reuse the existing `NAV` groups + `isActive`; may export a new mobile drawer nav or a new component file)
- new: `components/mobile-nav.tsx` (optional, if cleaner than extending deck-rail.tsx)

## Tasks
1. [ ] Hamburger toggle button in the mobile top bar (md:hidden), three geometric bars (SVG or spans), `aria-label="Menu"`, `aria-expanded`, `aria-controls` pointing at the drawer.
2. [ ] Slide-in drawer: reuse the `NAV` groups (same grouped layout as `DeckRail`), full nav with labels (not icon-only). Overlay/scrim behind it. Slide + fade using `--duration-*` tokens; no motion when `prefers-reduced-motion`.
3. [ ] Close behaviors: tap a nav link, tap the scrim, press Esc, and route change all close the drawer. Keep the logo + connection status dot in the top bar.
4. [ ] Accessibility: move focus to the first item (or the drawer) on open, return focus to the toggle on close; trap focus while open is a nice-to-have, not required; prevent body scroll while open.
5. [ ] Desktop unchanged: sidebar `DeckRail` still shows at `md:`; all new UI is `md:hidden`.

## Done when
- On a narrow viewport the top bar shows a hamburger; tapping it opens a drawer with all nav items; every close path works; keyboard + screen-reader usable.
- No px sizes introduced (grep the touched files for `px` in sizing contexts). `npx tsc --noEmit -p .` exit 0. No em/en dashes. Ponytail-minimal.

## Process (per the general workflow rule)
Implement via one agent that owns the locked files, then a second agent audits it with current tools (`/impeccable audit` + a no-px sweep) and fixes findings. One commit per task/step.
