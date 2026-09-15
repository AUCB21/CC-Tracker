---
name: CC-Track
description: The Command Deck. A control-room for Claude Code retrospectives.
# Default theme is LIGHT ("Claude Control Light"). These are the live `:root`
# tokens shipped in app/globals.css. Dark is retained as an alternate under
# `colors-dark` (data-theme="dark"). The sidebar rail carries its own scoped
# token set (`colors-rail`), transcribed 1:1 from the approved design source
# and not derived from the global deck tokens.
colors:
  background: "#f7f6f2"
  surface-1a: "#fffefb"
  surface-1b: "#fffefb"
  surface-2: "#f2f0ea"
  surface-cell-a: "#fbfaf6"
  surface-cell-b: "#fbfaf6"
  line: "#e3dfd5"
  line-soft: "#edeae2"
  line-strong: "#cfc9bb"
  foreground: "#171513"
  text: "#34302c"
  muted: "#6f675f"
  muted-2: "#7e756c"
  muted-3: "#8d847a"
  muted-4: "#91877c"
  accent-50: "#fff4ee"
  accent-100: "#f9e2d7"
  accent-200: "#efc2af"
  accent-300: "#e6a084"
  accent-400: "#d98462"
  accent-500: "#c96f4c"
  accent-600: "#ae583a"
  accent-700: "#91452f"
  accent-800: "#713525"
  accent-900: "#552a20"
  accent-status: "#ae583a"
  accent-soft: "color-mix(in oklab, #c96f4c 14%, transparent)"
  accent-ring: "color-mix(in oklab, #c96f4c 55%, transparent)"
  on-accent: "#fffaf4"
  green: "#5e8e77"
  green-bright: "#4f8068"
  green-dim: "#47715e"
  yellow: "#ac7718"
  yellow-dim: "#866016"
  blue: "#456675"
  blue-deep: "#607f8a"
  blue-dim: "#607f8a"
  red: "#b95543"
colors-dark:
  background: "#0b0a09"
  surface-1a: "#1b1815"
  surface-1b: "#141211"
  surface-2: "#1c1916"
  surface-cell-a: "#1f1b18"
  surface-cell-b: "#171513"
  line: "#241f1b"
  line-soft: "#1f1b18"
  line-strong: "#3a342c"
  foreground: "#f6f2ec"
  text: "#ece7df"
  muted: "#a29a8f"
  muted-2: "#8e867c"
  muted-3: "#8a8177"
  muted-4: "#948a7f"
  accent-500: "#e08a5c"
  accent-50: "oklch(0.96 0.020 46)"
  accent-900: "oklch(0.32 0.062 38)"
  on-accent: "#14100d"
  green: "oklch(0.74 0.10 142)"
  yellow: "oklch(0.79 0.11 85)"
  blue: "oklch(0.72 0.10 248)"
  red: "oklch(0.66 0.16 25)"
colors-rail:
  # Sidebar-scoped tokens (.rail). Light values are the default; the dark
  # column applies under [data-theme="dark"] .rail. These do not track the
  # global deck tokens; edit them together only via the design source.
  panel: "#fffefb"
  panel2: "#f2f0ea"
  cell: "#fbfaf6"
  line: "#e3dfd5"
  line-soft: "#edeae2"
  line-strong: "#cfc9bb"
  ink: "#171512"
  text: "#2b2823"
  muted: "#7d776c"
  muted2: "#9a9488"
  accent: "#c2643f"
  accent-soft: "#f7ebe4"
  accent-ring: "#e8cbbc"
  sage: "#5d8a72"
  sage-soft: "#e6efe9"
  amber: "#a8781f"
  amber-soft: "#f4eddc"
  red: "#a8452f"
  red-soft: "#f6e6e1"
typography:
  display:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3vw, 3.25rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Familjen Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  caption:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.06em"
  data:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0"
  data-display:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "clamp(1.875rem, 2.3vw, 2.875rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
  scale:
    micro: "0.5625rem"
    eyebrow: "0.625rem"
    meta: "0.8125rem"
    nav: "0.75rem"
    chart-figure: "1.625rem"
rounded:
  hair: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  chip: "0.625rem"
  lg: "0.75rem"
  stat: "0.875rem"
  xl: "1rem"
  panel: "1.125rem"
  dialog: "1.25rem"
  pill: "9999px"
spacing:
  hairline: "0.0625rem"
  xs: "0.375rem"
  sm: "0.625rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  xxl: "3rem"
rail:
  width-expanded: "14.8889rem"
  width-collapsed: "3.3333rem"
  breakpoint: "48rem"
components:
  card:
    backgroundColor: "{colors.surface-1a}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "1.25rem"
    shadow: "{shadow.panel}"
  card-inset:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  stat-tile:
    backgroundColor: "{colors.surface-1a}"
    textColor: "{colors.text}"
    rounded: "{rounded.stat}"
    padding: "1.25rem"
    shadow: "{shadow.stat}"
  button-primary:
    backgroundColor: "{colors.accent-500}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  badge-neutral:
    backgroundColor: "{colors.line}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-live:
    backgroundColor: "{colors.green}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-signal:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-status}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-fail:
    backgroundColor: "{colors.red}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  rail-item:
    backgroundColor: "transparent"
    textColor: "{colors-rail.text}"
    rounded: "0.4444rem"
    padding: "0.4444rem 0.6111rem"
    typography: "{typography.scale.nav}"
  rail-item-active:
    backgroundColor: "{colors-rail.panel2}"
    textColor: "{colors-rail.ink}"
    ring: "inset 0 0 0 0.0625rem {colors-rail.line-strong}"
    fontWeight: 600
  progress-track:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
  progress-fill:
    backgroundColor: "{colors.green}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
shadow:
  # Light theme is not fully flat: panels and tiles carry one soft hairline
  # drop. Dark theme collapses these to a single quiet hairline (cell = none).
  panel: "0 0.0625rem 0.125rem rgb(23 21 18 / 0.04), 0 0.5rem 1.5rem -1.125rem rgb(23 21 18 / 0.18)"
  stat: "0 0.0625rem 0.125rem rgb(23 21 18 / 0.04)"
  cell: "0 0.0625rem 0.125rem rgb(23 21 18 / 0.03)"
  focus-ring: "0 0 0 0.125rem {colors.accent-700}"
---

# Design System: CC-Track

## Overview

**Creative North Star: "The Command Deck"**

CC-Track is a control room for a single operator. When the deck lights up, you see three things at once: what is running now, what has been done, and what is still queued. The interface is a status board first, an editor second. Content dominates chrome. On a wide monitor, lanes widen and columns multiply so the deck fills the glass instead of centering a small stage in a sea of margin.

The deck ships in a warm-paper light theme by default ("Claude Control Light"): a soft off-white ground (`#f7f6f2`) lit like a workshop bench in daylight, with cards a shade brighter than the page. Terracotta is the primary voice raised on that surface, reserved for what the operator should notice next; red is reserved for what went wrong. A warm-graphite dark theme is retained as an alternate (`data-theme="dark"`), inverting the same tonal logic onto a near-black ground for low-light work. Numbers speak in monospace so they align down a column; display headings speak in a geometric display sans; everything else speaks in a humanist text sans built for long reading at small sizes. Nothing is playful, nothing is corporate, nothing is empty. This is a working instrument that a person built for themselves and reaches for daily.

**Key Characteristics:**
- Light-by-default, dark-retained: one tonal logic expressed on paper or on graphite; the operator picks.
- Wide-monitor first: fill the deck, do not center a postage stamp.
- Big, decisive type; hierarchy carried by size and weight, not by boxes.
- One signal color (terracotta) plus four role colors (sage, ember, indigo, red). No decorative color.
- Near-flat surfaces: one soft hairline drop in light, tonal steps for the rest; motion only on state (with the shell primitives noted under Motion).
- Data reads in Geist Mono so digits line up without effort.
- Rem-relative throughout, and the root scales: `1rem` grows to `18px` on desktop (see The Ponytail Rule).

## Colors

The palette is a warm ground with one signal accent and four semantic role colors. Every color has a job; nothing is decoration. Light is the default; the dark alternate mirrors every role.

### Primary
- **Terracotta** (`--color-accent`, light anchor `#c96f4c`, dark anchor `#e08a5c`, ramp `accent-50` through `accent-900`): the one raised voice on the deck. Reserved for the current focus target (an active row, the CTA, an in-flight session badge, the primary series in a chart). Never more than ~10% of any given viewport, never used for pure decoration. In light the ramp runs from a near-white tint (`accent-50` `#fff4ee`) through the anchor (`accent-500`) down to a deep stop (`accent-900` `#552a20`). Text sitting on a terracotta ground uses `on-accent` (`#fffaf4`), and terracotta text on a light ground uses `accent-status` (`#ae583a`) for contrast.

### Secondary (role signals; not decorative)
- **Sage** (`--color-green` `#5e8e77` / `--color-green-bright` `#4f8068`): a completed or healthy state. Task done, session ended cleanly, progress-bar fill, the "live" badge ground.
- **Ember** (`--color-yellow` `#ac7718`): an in-flight or attention state. Task in progress, idle-but-open session, a warning that is not yet a failure. (Rail badges call this tone "amber".)
- **Indigo** (`--color-blue` `#456675` / `--color-blue-deep` `#607f8a`): a meta or reference state. Project label, informational chart series, git branch chip.
- **Red** (`--color-red` `#b95543`): a failure or error state, and only that. Marks a run/verdict that ended in FAIL, a stdout error line, or a badge that must read as unambiguously bad news. Red is deliberately the newest and narrowest role: it never marks a warning (that is Ember's job) and it never marks the operator's current focus (that is Terracotta's job). If a state resolved successfully, it is never red, even briefly.

### Neutral (warm scale)
- **Background** (light `#f7f6f2`, dark `#0b0a09`): the page ground. Warm off-white in light; warm near-black, never true black, in dark.
- **Surface 1** (`surface-1a` / `surface-1b`): the resting surface for cards, panels, and stat tiles. In light both stops are `#fffefb` (a flat fill a shade above the page). In dark they run `#1b1815` to `#141211` as a subtle top-to-bottom gradient.
- **Surface 2** (light `#f2f0ea`, dark `#1c1916`): interactive-surface state (hover row, popover ground).
- **Surface Cell** (`surface-cell-a` / `surface-cell-b`): the ground for list-cell rows. Flat `#fbfaf6` in light; a `#1f1b18` to `#171513` gradient in dark.
- **Line** (light `#e3dfd5`, dark `#241f1b`): the default hairline; dividers, borders, chart grid, disabled badge ground.
- **Line Soft** (light `#edeae2`): a quieter hairline where Line would compete with adjacent content.
- **Line Strong** (light `#cfc9bb`): a heavier hairline for emphasis dividers and the active-rail inset ring.
- **Muted** (light `#6f675f` through `muted-4` `#91877c`): a four-step secondary-text ramp, darkest to lightest reserved for the least important label. Contrast target: at least 4.5:1 for body-size text at the `muted` step. In the light (default) theme the ramp compresses toward its lighter end, since `muted-2/3/4` were darkened to clear WCAG AA 4.5:1 on the light ground, so the four steps read as visually distinct mainly in the dark theme. Light trades some step-to-step gradation for guaranteed contrast.
- **Text** (light `#34302c`) / **Foreground** (light `#171513`): primary text on any surface; Foreground is the stronger of the two, reserved for headline-weight type.

### Named Rules
**The One Signal Rule.** Terracotta is the only color that raises its voice for attention. It marks what the operator should look at next: the live session, the CTA, the top of a ranking, the primary chart series. If you catch yourself using it decoratively, replace it with Muted or Text.

**The Role-Color Discipline Rule.** Sage means done, Ember means in-flight or warning, Indigo means reference, Red means failed. Never rotate them for palette variety. Rotate through tonal steps of the same role instead.

**The Alarm-Is-Terminal Rule.** Red is reserved for a state that has already failed: a FAIL verdict, an error line in stdout. It is not a softer warning color and not interchangeable with Ember. A state in progress is Ember even if it might fail later; only the failure itself is Red.

**The No-True-Black Rule.** In the dark theme the Background is warm graphite. Never use `#000` for a ground; it flattens the graphite and reads as void, not workshop. In light, grounds stay warm off-white, never a cold pure white.

## Typography

**Display Font:** Familjen Grotesk (with `ui-sans-serif, system-ui, sans-serif` fallback).
**Text Font:** Public Sans (with `ui-sans-serif, system-ui, sans-serif` fallback).
**Data Font:** Geist Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace` fallback).

All three load via `next/font/google` (an earlier self-hosting attempt was reverted). `--font-familjen`, `--font-public-sans`, and `--font-geist-mono` back `--font-display`, `--font-sans`, and `--font-mono` respectively.

**Character:** Familjen Grotesk carries the display sizes: a geometric grotesque with enough personality to feel authored at hero size, never used below title size. Public Sans is the workhorse text face for body copy, captions, and labels: a humanist sans built to stay legible at the small sizes a dense deck actually uses. Geist Mono handles every number in the deck so digits line up without tabular tricks. The three-way split is deliberate: display type gets a voice, everything else disappears into the interface, and numbers are always monospaced.

### Hierarchy
- **Display** (Familjen Grotesk, 600, `clamp(2rem, 3vw, 3.25rem)`, line-height 1.02, tracking -0.035em): the page hero heading and the primary KPI when a page has one.
- **Headline** (Familjen Grotesk, 600, `clamp(1.5rem, 2vw, 2.5rem)`, line-height 1.1, tracking -0.015em): section titles and page titles. Scales up on wide monitors so the deck reads big.
- **Title** (Familjen Grotesk, 600, 1.125rem, line-height 1.25, tracking -0.01em): card titles, list-row primaries.
- **Body** (Public Sans, 400, 0.9375rem, line-height 1.55): descriptions, paragraph copy, table cells. Max line length 65 to 75 characters when the block is prose.
- **Caption** (Public Sans, 400, 0.75rem, line-height 1.4): meta lines under rows and secondary chart labels. One step below body, always muted color.
- **Label** (Public Sans, 500, 0.6875rem, letter-spacing 0.06em, uppercase optional): column heads, badge text, muted metadata. Uppercase only for grouping labels, never for content.
- **Data** (Geist Mono, 500, 0.9375rem): every number that shares a column with other numbers.
- **Data Display** (Geist Mono, 500, `clamp(1.875rem, 2.3vw, 2.875rem)`, line-height 1): the big KPI numbers on stat tiles.

### Extended ramp
A handful of sizes below Label or between named roles recur often enough to be ramp steps, not drift:
- **Micro** (0.5625rem): the smallest chart sub-labels, used only inside a donut/gauge chart's own caption. Also the exact size of the rail's "CC" glyph.
- **Eyebrow** (0.625rem): tiny uppercase tags below Label size. Used sparingly; the rail's uppercase group headings were removed in favor of hairline dividers (see Sidebar), so this step no longer marks nav groups.
- **Meta** (0.8125rem): secondary chip text and inline data figures that sit between Label and Body (a live-session-count chip, a cost figure in a list row).
- **Nav** (0.75rem): Deck Rail item text. The rail sets `line-height: normal` at its root so rows measure to the design spec rather than the app's `1.5` body leading.
- **Chart Figure** (Geist Mono, 1.625rem): the center total on a donut or gauge chart, its own display moment inside a small component.

### Named Rules
**The Numbers-Are-Mono Rule.** Any digit that appears next to other digits (stat tile, table cell, chart tooltip, badge count) uses Geist Mono with `tabular-nums`. Prose numbers inside a sentence stay in Public Sans.

**The Big Type Rule.** Display and Data Display use `clamp()` so the deck grows with the viewport instead of stopping at a laptop-era ceiling. Do not cap the deck at a fixed narrow width.

**The No-Em-Dash Rule.** Copy uses hyphens, colons, commas, or two sentences. Em dash and en dash are banned in every string the app shows and every file this project writes.

## Layout

The deck is a wide-viewport-first grid.

- **Root scaling:** `html { font-size: clamp(100%, 4.5vw, 112.5%); }`. Every `rem`-based size scales uniformly with the viewport, from `16px` on a narrow window up to `18px` per rem on desktop. Every measurement below is authored in `rem`, so it grows with the deck. (When cross-checking against pixel measurements, remember `1rem = 18px` on desktop.)
- **Container:** the main lane takes the full viewport minus the rail (`md:ml-[var(--rail-w)]`). This is a data deck (tables, charts, tiles), not a docs site, so long-line prose is rare. Where prose does appear inside a card, cap it locally at `~75ch` so line length stays readable while the deck fills. On wide grids gain a second column; on ultra-wide, stat rows expand from 4 to 6 tiles.
- **Sidebar (Deck Rail):** fixed left, collapsible. Expanded width `--rail-w` = `14.8889rem` (~268px); collapsed `3.3333rem` (~60px). Visible from the `md` breakpoint (`48rem`) up; below that it becomes a fixed top bar plus a slide-in drawer. The collapse toggle, workspace switcher, and search are desktop-rail chrome and are gated behind `md` so the mobile drawer path is never affected.
- **Main padding:** mobile `1.5rem` inline with a `5rem` top offset (clearing the fixed top bar); desktop `2.5rem` inline, `2rem` top, `4rem` bottom.
- **Grid rhythm:** implicit grid; `gap: 1rem` (md) between cards, `gap: 1.5rem` (lg) between sections, `gap: 0.625rem` (sm) inside a card.
- **Density:** dense-by-content, not dense-by-shrinking. A `data-density="compact"` mode tightens card headers and section spacing; it never shrinks type below the Eyebrow step.

### Named Rules
**The Ponytail Rule.** The root font-size is fluid (`clamp(100%, 4.5vw, 112.5%)`) so the whole rem scale grows to `18/16` on desktop and eases back to `16px` on narrow screens. Author in `rem` and the deck breathes with the glass; never hard-code a size that should scale.

**The Relative Unit Rule.** Every dimension is expressed in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Pixels are permitted only for hairlines under `2px` (a `0.0625rem` alternative is preferred) and for `box-shadow` blur radii. If you are typing a `px` value greater than 1, stop and convert to `rem`.

**The Fill-The-Deck Rule.** On wide monitors, expand content lanes and add columns. Do not center a narrow deck in a sea of margin. Whitespace has to earn its place by carrying rhythm, not by hiding the operator's data.

**The Content-First Chrome Rule.** Chrome (rail, headers, dividers) uses Line at `0.0625rem`. It is present, quiet, and never competes with content.

## Elevation & Depth

Near-flat. Depth is mostly tonal: the deck steps from Background to Surface 1 to Surface 2 using color. In the light theme, panels and tiles also carry one soft hairline drop shadow so cards lift off the paper ground; the dark theme reduces these to a single quiet hairline (cells: none). Heavier shadows appear only on genuinely floating surfaces.

### Shadow Vocabulary
- **Panel shadow** (`--deck-shadow-panel`, light `0 0.0625rem 0.125rem rgb(23 21 18 / 0.04), 0 0.5rem 1.5rem -1.125rem rgb(23 21 18 / 0.18)`): the resting lift under top-level cards and panels in light. Dark collapses to a single `0 0.0625rem 0.125rem` hairline.
- **Stat shadow** (`--deck-shadow-stat`): a lighter version of the panel drop for stat tiles.
- **Cell shadow** (`--deck-shadow-cell`): the faintest drop for list cells in light; `none` in dark.
- **Focus Ring** (`box-shadow: 0 0 0 0.125rem var(--color-accent-700)`): keyboard-focus signal on interactive elements. Never on hover; only on `:focus-visible`.
- **Overlay Lift:** dialogs, popovers, and chart tooltips read as floating layers via tonal step, Line, and radius. Never applied to a static card.

### Named Rules
**The Soft-Lift Rule.** Cards and tiles rest on one soft hairline drop (light) or a tonal step (dark), never a stack of shadows. If a card looks flat and unimportant, fix the type hierarchy or the border before reaching for more shadow.

**The Tonal-Depth Rule.** Where a surface needs to feel "on top of" another, step one tonal level (Background -> Surface 1 -> Surface 2). Do not add a second shadow to say what a tonal step already says.

## Shapes

Warm, geometric, quietly rounded. Nothing sharp, nothing hyper-rounded, nothing organic.

- **Corner radii (rem):** `0.375rem` (sm, small chips), `0.5rem` (md, buttons and nav items), `0.625rem` (chip, dense chips, chart tooltips, compact list cells), `0.75rem` (lg, inset cards), `0.875rem` (stat, stat tiles), `1rem` (xl), `1.125rem` (panel, the primary radius for top-level panels, cards, and lane containers), `1.25rem` (dialog, modal surfaces), `9999px` (pill, badges only). The rail uses a tighter `0.4444rem` (~8px) on its tile and rows, per the design source.
- **Borders:** every card and tile carries a `0.0625rem` border in Line. A floating surface uses a stronger line. Borders describe the edge; they do not scream.
- **Icons and glyphs:** geometric monoline icons (the shared `RailIcons` set) at roughly `1rem` to `1.25rem`. No emoji glyphs in UI chrome, ever.
- **Charts:** rounded top-corners on bar charts. Areas: no fill gradient. Lines: `strokeWidth: 2`, `dot={false}`.

### Named Rules
**The Warm-Corner Rule.** Every container uses at least `0.375rem` radius. Sharp corners belong to another world.

**The Radius-Signals-Weight Rule.** Radius increases with how much a surface floats above the deck: a stat tile (`0.875rem`) sits flatter than a top-level panel (`1.125rem`), which sits flatter than a modal (`1.25rem`). A bigger radius means "this is a distinct layer," not decoration.

**The One-Border Rule.** A tile has exactly one border: `0.0625rem` in Line. Nested containers drop the border and rely on tonal step + padding.

## Components

For every component: character line, shape, color assignment, state behavior. Simple state transitions (hover, focus, background) stay at `120ms` (fast), `150ms` (base) at the outer edge. The app-shell primitives (rail collapse, theme icon-swap, dropdowns) and content-arrival cues run longer and are covered under Motion.

### Buttons
- **Character:** precise and contained. No scale on press; no elevation on hover; no ripple. A button is a chip you can act on.
- **Shape:** medium radius (`0.5rem`); comfortable padding (`0.5rem 1rem`); label typography (500 weight, 0.6875rem, +0.06em tracking).
- **Primary:** Terracotta ground, `on-accent` label. Reserved for the one action a screen wants the operator to take.
- **Ghost:** transparent ground, Text label. Hover raises to Surface 2. Default for secondary actions.
- **Hover / Focus:** ghost hovers to Surface 2; primary keeps its color and shifts label opacity. Focus-visible adds the Terracotta focus ring. Transition: `background 120ms`.

### Badges (pills)
- **Style:** rounded-pill, `0.125rem 0.5rem` padding, label typography, always paired with a word or glyph.
- **Live / done:** Sage ground, `on-accent` label.
- **Signal:** Terracotta-soft ground, terracotta (`accent-status`) label. Used for "focus this" chips.
- **Warning:** Ember ground or Ember-tinted border, for an in-flight or attention state.
- **Fail:** Red ground or Red-tinted border and text, for a run or verdict that ended in failure, or a stdout error. Never for anything short of an actual failure.
- **Neutral:** Line ground, Muted label. Everything else that is just a tag.
- **Rule:** every badge pairs color with a word or glyph. Color alone never conveys state.

### Cards / Containers
- **Corner:** `1.125rem` (panel) top-level; `0.75rem` (lg) nested.
- **Ground:** Surface 1 top-level (flat fill in light, subtle gradient in dark); Surface 2 when nested inside another card.
- **Border:** `0.0625rem` Line, always.
- **Padding:** `1.25rem` top-level; `1rem` nested.
- **Shadow:** the soft panel drop at rest in light; a hairline in dark.

### Stat Tiles
- **Structure:** label (Label, uppercase-tracked, Muted) on top; value (Data Display, Text) center; sub (Body, Muted) at the bottom. On narrow cards the optional sparkline is hidden so it cannot overlap the label.
- **Corner:** `0.875rem` (stat), tighter than a top-level panel so the tile reads dense.
- **Value:** always Geist Mono, `clamp(1.875rem, 2.3vw, 2.875rem)`. Digits are the reason the tile exists; make them big.
- **Grid:** 4 across on desktop; 6 across on ultra-wide; 2 across on narrow.

### Sidebar (Deck Rail)
The rail is a self-contained subsystem. It carries its own scoped token set (`.rail` / `[data-theme="dark"] .rail`, the `--rail-*` variables), transcribed 1:1 from the approved design source rather than derived from the global `--deck-*` tokens. Treat the two token sets as separate; re-sync the rail from the design source, not from the deck.

- **Ground:** `--rail-panel` (`#fffefb` light); right border `0.0625rem` `--rail-line`. Width `--rail-w` (expanded `14.8889rem`, collapsed `3.3333rem`), tweened on toggle via the `card-resize` primitive.
- **Brand mark:** a terracotta "CC" tile, `1.5rem` square (~27px), radius `0.4444rem` (~8px), ground `--rail-accent` (`#c2643f`), glyph in Geist Mono `0.5625rem`/600 with `0.04em` tracking, colored `--rail-panel`. Beside it, the "Claude Control" wordmark in Familjen Grotesk `0.8333rem`/600, tracking `-0.015em`, plus a monoline expand/collapse chevron. (The old `2.125rem` gradient CC tile marked "do not restyle" no longer exists; the mark is the flat Geist-Mono terracotta tile above.)
- **Row (`rail-nav-row`):** Nav typography (0.75rem), radius `0.4444rem`, padding `0.4444rem 0.6111rem`, `min-height: 2.75rem` below `md` and on coarse pointers for touch. Inactive: monoline icon in `--rail-muted`, label in `--rail-text` at 400. Hover: ground to `--rail-panel2`. Active: ground `--rail-panel2` plus an inset `0.0625rem` ring in `--rail-line-strong` (a box-shadow, not a real border, so nothing shifts), label to `--rail-ink` at 600.
- **Structure:** "Workspace" label with an add-project link, a workspace switcher popover, and a search trigger sit above the nav. A version chip ("V0.1.0", Geist Mono `0.5556rem`) and a decorative hairline sit in the footer.
- **Collapsed state (`data-rail="collapsed"`, md+ only):** labels, wordmark, footer, and search hide; rows center to icon-only; the workspace popover opens to the right; count badges shrink to `0.3333rem` dots ringed in the panel color.
- **Mobile:** a fixed `3.75rem` top bar (its own accent-500 / Familjen "CC" lockup and a `beacon`-pulsing connection dot) plus a right-side slide-in `dialog` drawer at `18rem`/`85vw`, sharing the same `.rail` tokens and `DeckNav`.

### Navigation (DeckNav)
Shared by the desktop rail and the mobile drawer. Overview is split out as a pinned top row; the remaining items group into four sections separated by hairline `rail-divider` rules (the earlier uppercase group headings were removed):
- **Observe:** Overview, Analytics, Live (sage badge, live-session count), Projects, Sessions.
- **Work:** Plans (red badge, pending-plan count), Tasks (amber badge, in-progress count).
- **Control:** HITL (red badge, pending-approval count), Prompts.
- **System:** Hub, Setup (opens the settings modal).

Badges are type-colored by tone: `sage` for Live, `amber` for Tasks, `red` for Plans and HITL. Tone is a fixed semantic mapping, not decoration.

### Tables
- **Row height:** `2.75rem` minimum for scannable density.
- **Header:** Label typography, uppercase-tracked, Muted color, Line bottom border.
- **Row hover:** Surface 2 ground; transition `120ms`.
- **Numeric cells:** right-aligned, Geist Mono, `tabular-nums`.
- **Dividers:** `0.0625rem` Line between rows; no zebra striping.

### Progress Bar
- **Track:** `0.25rem` tall, pill-rounded, Line ground.
- **Fill:** Sage, pill-rounded, animates in with the `fillbar` content-arrival cue rather than snapping to width.
- **Label:** trailing count in Data typography, Muted color.

### Charts (Recharts)
- **Axes:** stroke Line, tick label Muted.
- **Grid:** horizontal only, Line at partial opacity.
- **Series palette (in order):** Terracotta, Indigo, Sage, Ember, then tonal variants of the same four. Red is reserved for status, not chart series; never introduce a hue outside the deck.
- **Tooltip:** Surface 2 ground, Line border, `0.625rem` (chip) radius, `0.75rem` padding.
- **Bar corners:** rounded top only.
- **Line series:** stroke width 2, no dots, no area gradient.
- **Center figure (donut/gauge):** Chart Figure size (1.625rem, Geist Mono) for the total, Micro size (0.5625rem) for its caption.

## Motion

State transitions are fast and get out of the way. Content that arrives on its own gets a moment to be noticed; content the operator triggers does not. The one deliberate expansion since the original spec is the app-shell primitive set, which runs longer than the 150ms interaction ceiling because it animates chrome geometry (the rail resizing, an icon crossfading, a menu opening) rather than a content state.

- **Fast (`120ms`):** the standard for hover, focus, and background-color transitions on content and rows. Reach for it first.
- **Base (`150ms`):** the ceiling for a content state change the operator triggers directly (toggle, tab switch, filter apply). Also the drawer slide and command-palette open.
- **Shell primitives (transitions-dev):** `card-resize` (300ms, used for the rail collapse and content-margin shift), `icon-swap` (250ms, the theme-toggle glyph crossfade), and `menu-dropdown` (open 250ms / close 150ms). These carry their own duration and easing tokens, kept separate from the app's `--duration-*` tokens on purpose, and apply to shell chrome only.
- **Content-arrival cues (may run past the ceiling):**
  - **`rise`** (~500ms, up to `--duration-enter` 520ms): a card or row fading up from a slight vertical offset.
  - **`fillbar`** (~900ms): a progress-bar fill animating in.
  - **`lift`** (base): modals and the copy-success state settling with a slight scale-and-fade.
  - **`beacon`** (2.4s, looping): the live-status pulse ring, exempted from `prefers-reduced-motion` via `.motion-safe-pulse` so a live indicator never goes silent.
  - **`veil`** (base): a modal/drawer backdrop fading in.
  - **`slidein` / `drawerIn`**: the mobile drawer entrance.
  - **`crumbIn`** (260ms): the top-bar breadcrumb entrance, remounted per navigation.
  - **`deck-new-event`** (900ms): a terracotta wash on a freshly-arrived live-timeline row, fading to transparent.

### Named Rules
**The Interaction Ceiling Rule.** A transition triggered by the operator on content (hover, focus, toggle, filter, tab) stays at or under `150ms`. No bounce, no scale beyond `1.02`, no ripple. The shell primitives above (rail resize, icon-swap, dropdown) are the sole sanctioned exception, and only for chrome geometry.

**The Content-Arrival Exception.** A cue marking something that arrived unprompted (a new live-timeline row, a progress bar filling, a card mounting) may run past the ceiling, up to roughly 900ms. The distinction is intent: did the operator just do something, or did the deck just show them something new.

**The Reduced-Motion Rule.** Under `prefers-reduced-motion`, every animation and transition is neutralized except `.motion-safe-pulse` (the live beacon), which keeps a slowed pulse so liveness still reads.

## Do's and Don'ts

Concrete guardrails. Every one is grounded in this deck.

### Do:
- **Do** express every dimension in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Reserve `px` for `1px` hairlines and shadow blur, and author knowing the root scales to `18px`/rem on desktop.
- **Do** let the main lane run from the rail to the viewport edge. Add columns on wide monitors, do not enlarge margins. Cap prose locally at `~75ch` inside its card.
- **Do** put every number that shares a column with other numbers in Geist Mono with `tabular-nums`.
- **Do** use Terracotta for exactly one thing per screen: the current focus target. Use Red for exactly one thing: an actual failure.
- **Do** pair every colored badge with a word or glyph so color-blind operators still parse state.
- **Do** hover to Surface 2 at 120ms. Focus-visible gets the Terracotta focus ring.
- **Do** step tonally for depth (Background -> Surface 1 -> Surface 2), adding at most the one soft panel drop in light.
- **Do** keep the rail on its own `--rail-*` tokens and re-sync it from the design source, not from the deck tokens.

### Don't:
- **Don't** use em dashes or en dashes in any string the app shows or any file this project writes. Use a hyphen, colon, or two sentences.
- **Don't** use emoji in UI chrome, empty states, or headers.
- **Don't** introduce gradients on text. Flat, tonal, or hairline text only; the dark theme's subtle surface gradients are the deck's one sanctioned surface-gradient exception and stay restrained (light surfaces are flat).
- **Don't** use `#000` for any ground; even the dark theme's graphite stays warm.
- **Don't** stack shadows to fake depth. One soft drop (light) or a tonal step, not both piled on.
- **Don't** animate content interactions above `150ms`. Only the named shell primitives and content-arrival cues may run longer.
- **Don't** center a narrow deck in a wide viewport. Fill the deck.
- **Don't** rotate role colors for variety. Sage means done, Ember means in-flight, Indigo means reference, Red means failed, and that is permanent.
- **Don't** cap type at laptop sizes on wide monitors. Display and Data-Display use `clamp()` for a reason.
- **Don't** use zebra striping in tables. Rows are separated by a hairline and by hover state.
- **Don't** use Red for a warning or an in-progress state. That is Ember. Red means it already failed.
