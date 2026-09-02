---
name: CC-Track
description: The Command Deck. A control-room for Claude Code retrospectives.
colors:
  background: "#0b0a09"
  surface-1a: "#1b1815"
  surface-1b: "#141211"
  surface-2: "#1c1916"
  surface-cell-a: "#1f1b18"
  surface-cell-b: "#171513"
  line: "#241f1b"
  line-soft: "#1f1b18"
  line-strong: "#3a342c"
  line-elevated: "#322c25"
  foreground: "#f6f2ec"
  text: "#ece7df"
  muted: "#a29a8f"
  muted-2: "#8e867c"
  muted-3: "#8a8177"
  muted-4: "#827970"
  accent-50: "oklch(0.96 0.020 46)"
  accent-100: "oklch(0.92 0.036 46)"
  accent-200: "oklch(0.86 0.058 46)"
  accent-300: "oklch(0.81 0.078 46)"
  accent-400: "oklch(0.76 0.092 46)"
  accent-500: "#e08a5c"
  accent-600: "oklch(0.66 0.108 44)"
  accent-700: "oklch(0.56 0.100 42)"
  accent-800: "oklch(0.44 0.082 40)"
  accent-900: "oklch(0.32 0.062 38)"
  accent-soft: "oklch(0.44 0.082 40 / 0.14)"
  accent-ring: "oklch(0.56 0.100 42 / 0.6)"
  green: "oklch(0.74 0.10 142)"
  green-bright: "oklch(0.82 0.09 142)"
  green-dim: "oklch(0.58 0.09 142)"
  yellow: "oklch(0.79 0.11 85)"
  yellow-dim: "oklch(0.63 0.09 85)"
  blue: "oklch(0.72 0.10 248)"
  blue-deep: "oklch(0.55 0.09 250)"
  red: "oklch(0.66 0.16 25)"
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
    nav: "0.875rem"
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
components:
  card:
    backgroundColor: "{colors.surface-1a}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "1.25rem"
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
  button-primary:
    backgroundColor: "{colors.accent-500}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.accent-500}"
    textColor: "{colors.background}"
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
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-signal:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-500}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-fail:
    backgroundColor: "{colors.red}"
    textColor: "{colors.background}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    typography: "{typography.scale.nav}"
  nav-item-active:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  progress-track:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
  progress-fill:
    backgroundColor: "{colors.green}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
---

# Design System: CC-Track

## Overview

**Creative North Star: "The Command Deck"**

CC-Track is a control room for a single operator. When the deck lights up, you see three things at once: what is running now, what has been done, and what is still queued. The interface is a status board first, an editor second. Content dominates chrome. On a wide monitor, lanes widen and columns multiply so the deck fills the glass instead of centering a small stage in a sea of margin.

The atmosphere is warm graphite: a near-black warm ground with the ambient signal of a workshop lit by a single low lamp. Terracotta is the primary voice raised on that surface, reserved for what the operator should notice next; red is reserved for what went wrong. Numbers speak in monospace so they align down a column; display headings speak in a geometric display sans; everything else speaks in a humanist text sans built for long reading at small sizes. Nothing is playful, nothing is corporate, nothing is empty. This is a working instrument that a person built for themselves and reaches for daily.

**Key Characteristics:**
- Wide-monitor first: fill the deck, do not center a postage stamp.
- Big, decisive type; hierarchy carried by size and weight, not by boxes.
- One signal color (terracotta) plus four role colors (sage, ember, indigo, red). No decorative color.
- Flat surfaces at rest; tonal steps for depth; motion only on state, capped tight.
- Data reads in Geist Mono so digits line up without effort.

## Colors

The palette is a warm graphite ground with one signal accent and four semantic role colors. Every color has a job; nothing is decoration.

### Primary
- **Terracotta** (`--color-accent`, anchor `#e08a5c`, ramp `accent-50` through `accent-900`): the one raised voice on the deck. Reserved for the current focus target (an active row, the CTA, an in-flight session badge, the primary series in a chart). Never more than ~10% of any given viewport, never used for pure decoration. The ramp runs from a near-white tint (`accent-50`) down through the anchor (`accent-500`) to a deep tinted-background stop (`accent-900`) used for emphasis-card grounds and glow washes.

### Secondary (role signals; not decorative)
- **Sage** (`--color-green` / `--color-green-bright`): a completed or healthy state. Task done, session ended cleanly, progress-bar fill, the "live" badge ground.
- **Ember** (`--color-yellow`): an in-flight or attention state. Task in progress, idle-but-open session, a warning that is not yet a failure.
- **Indigo** (`--color-blue` / `--color-blue-deep`): a meta or reference state. Project label, informational chart series, git branch chip.
- **Red** (`--color-red`): a failure or error state, and only that. Marks a run/verdict that ended in FAIL, a stdout error line, or a badge that must read as unambiguously bad news. Red is deliberately the newest and narrowest role: it never marks a warning (that is Ember's job) and it never marks the operator's current focus (that is Terracotta's job). If a state resolved successfully, it is never red, even briefly.

### Neutral (warm graphite scale)
- **Background** (`#0b0a09`): the page ground. Warm near-black; never true black.
- **Surface 1** (`surface-1a` `#1b1815` to `surface-1b` `#141211`): the resting surface for cards, panels, and stat tiles, applied as a subtle top-to-bottom gradient rather than a flat fill.
- **Surface 2** (`#1c1916`): interactive-surface state (hover row, popover ground).
- **Surface Cell** (`surface-cell-a` `#1f1b18` to `surface-cell-b` `#171513`): the gradient ground for list-cell rows (Overview cell-column lists).
- **Line** (`#241f1b`): the default hairline; dividers, borders, chart grid, disabled badge ground.
- **Line Soft** (`#1f1b18`): a quieter hairline where Line would compete with adjacent content.
- **Line Strong** (`#3a342c`): a heavier hairline for emphasis dividers.
- **Line Elevated** (`#322c25`): the border for surfaces that float above the deck rather than sit flush in it (chart tooltips, modal dialogs). Sits between Line and Line Strong; it reads as "this edge is lifted," not just "this is a divider."
- **Muted** (`#a29a8f` through `muted-4` `#827970`): a four-step secondary-text ramp, darkest to lightest reserved for the least important label. Contrast target on Background: at least 4.5:1 for body-size text at the `muted` step.
- **Text** (`#ece7df`) / **Foreground** (`#f6f2ec`): primary text on any slate; Foreground is the brighter of the two, reserved for headline-weight type. Contrast target: at least 12:1 on Background.

### Named Rules
**The One Signal Rule.** Terracotta is the only color that raises its voice for attention. It marks what the operator should look at next: the live session, the CTA, the top of a ranking, the primary chart series. If you catch yourself using it decoratively, replace it with Muted or Text.

**The Role-Color Discipline Rule.** Sage means done, Ember means in-flight or warning, Indigo means reference, Red means failed. Never rotate them for palette variety. Rotate through tonal steps of the same role instead.

**The Alarm-Is-Terminal Rule.** Red is reserved for a state that has already failed: a FAIL verdict, an error line in stdout. It is not a softer warning color and not interchangeable with Ember. A state in progress is Ember even if it might fail later; only the failure itself is Red.

**The No-True-Black Rule.** The Background is warm. Never use `#000` on this deck; it flattens the graphite ground and reads as void, not workshop.

## Typography

**Display Font:** Familjen Grotesk (with `ui-sans-serif, system-ui, sans-serif` fallback).
**Text Font:** Public Sans (with `ui-sans-serif, system-ui, sans-serif` fallback).
**Data Font:** Geist Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace` fallback).

**Character:** Familjen Grotesk carries the display sizes: a geometric grotesque with enough personality to feel authored at hero size, never used below title size. Public Sans is the workhorse text face for body copy, captions, and labels: a humanist sans built to stay legible at the small sizes a dense deck actually uses. Geist Mono handles every number in the deck so digits line up without tabular tricks. The three-way split is deliberate: display type gets a voice, everything else disappears into the interface, and numbers are always monospaced.

### Hierarchy
- **Display** (Familjen Grotesk, 600, `clamp(2rem, 3vw, 3.25rem)`, line-height 1.02, tracking -0.035em): the page hero heading (Control Panel, etc.) and the primary KPI when a page has one.
- **Headline** (Familjen Grotesk, 600, `clamp(1.5rem, 2vw, 2.5rem)`, line-height 1.1, tracking -0.015em): section titles and page titles. Scales up on wide monitors so the deck reads big.
- **Title** (Familjen Grotesk, 600, 1.125rem, line-height 1.25, tracking -0.01em): card titles, list-row primaries.
- **Body** (Public Sans, 400, 0.9375rem, line-height 1.55): descriptions, paragraph copy, table cells. Max line length 65 to 75 characters when the block is prose.
- **Caption** (Public Sans, 400, 0.75rem, line-height 1.4): meta lines under rows and secondary chart labels. One step below body, always muted color.
- **Label** (Public Sans, 500, 0.6875rem, letter-spacing 0.06em, uppercase optional): column heads, badge text, muted metadata. Uppercase only for grouping labels, never for content.
- **Data** (Geist Mono, 500, 0.9375rem): every number that shares a column with other numbers.
- **Data Display** (Geist Mono, 500, `clamp(1.875rem, 2.3vw, 2.875rem)`, line-height 1): the big KPI numbers on stat tiles.

### Extended ramp
A handful of sizes below Label or between named roles recur often enough to be ramp steps, not drift:
- **Micro** (0.5625rem): the smallest chart sub-labels, used only inside a donut/gauge chart's own caption.
- **Eyebrow** (0.625rem): kicker labels and tiny uppercase tags that sit below Label size (a page eyebrow, a sidebar group heading, a dialog eyebrow).
- **Meta** (0.8125rem): secondary chip text and inline data figures that sit between Label and Body (a live-session-count chip, a cost figure in a list row).
- **Nav** (0.875rem): sidebar / Deck Rail item text, a half-step below Body.
- **Chart Figure** (Geist Mono, 1.625rem): the center total on a donut or gauge chart, its own display moment inside a small component.

### Named Rules
**The Numbers-Are-Mono Rule.** Any digit that appears next to other digits (stat tile, table cell, chart tooltip, badge count) uses Geist Mono. Prose numbers inside a sentence stay in Public Sans.

**The Big Type Rule.** Display and Data Display use `clamp()` so the deck grows with the viewport instead of stopping at a laptop-era ceiling. Do not cap the deck at 1200px.

**The No-Em-Dash Rule.** Copy uses hyphens, colons, commas, or two sentences. Em dash and en dash are banned in every string the app shows.

## Layout

The deck is a wide-viewport-first grid. The current 1200px main-content cap is a laptop-era compromise and should be lifted so the deck fills the glass.

- **Container:** the main lane is uncapped, it takes the full viewport minus the sidebar. This is a data deck (tables, charts, tiles), not a docs site, so long-line prose is rare. Where prose does appear inside a card, it caps at `max-w-[75ch]` locally so line length stays readable while the deck fills. On `>=1440px` grids gain a second column; on `>=2000px` stat rows expand from 4 to 6 tiles.
- **Sidebar:** fixed left, `14rem` wide (224px), warm graphite, always visible above 900px (`md`). Below that, it collapses to a top bar; the deck is still primary-user-desktop but must not break in a narrow window.
- **Grid rhythm:** 12-column implicit grid; use `gap: 1rem` (md) between cards, `gap: 1.5rem` (lg) between sections, `gap: 0.625rem` (sm) inside a card.
- **Density:** dense-by-content, not dense-by-shrinking. When a page has more to show on a wide monitor, add columns and rows; do not cram type smaller than the Eyebrow step (0.625rem).
- **Padding scale (rem, never px):** `0.375rem` (xs), `0.625rem` (sm), `1rem` (md), `1.5rem` (lg), `2rem` (xl), `3rem` (xxl).
- **Section margins:** vertical rhythm is `1.5rem` between components, `2rem` between sections. Never rely on a single big margin to carry hierarchy; use a label + rule.

### Named Rules
**The Relative Unit Rule.** Every dimension is expressed in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Pixels are permitted only for hairlines under 2px (`1px` borders, `0.0625rem` alternative allowed) and for `box-shadow` blur radii. If you are typing a `px` value greater than 1, stop and convert to `rem`.

**The Fill-The-Deck Rule.** On monitors wider than 1440px, expand content lanes and add columns. Do not center a narrow deck in a sea of margin. Whitespace has to earn its place by carrying rhythm, not by hiding the operator's data.

**The Content-First Chrome Rule.** Chrome (sidebar, headers, dividers) uses Line at `0.0625rem` (1px). It is present, quiet, and never competes with content.

## Elevation & Depth

Flat by default. Depth is tonal: the deck steps from Background (ground) to Surface 1 (resting surface) to Surface 2 (elevated interaction) using color only, not shadow. Shadows appear only in response to state, or on genuinely floating surfaces.

### Shadow Vocabulary
- **Focus Ring** (`box-shadow: 0 0 0 0.125rem var(--color-accent-700)`): keyboard-focus signal on interactive elements. Never on hover; only on focus-visible.
- **Overlay Lift** (`box-shadow: 0 2.5rem 5rem -1rem rgb(0 0 0 / 0.9)`): dialogs, popovers, and the tooltip on a chart. Never on a static card.

### Named Rules
**The Flat-By-Default Rule.** Cards, tiles, and rows do not carry shadows at rest. If a card looks flat and unimportant, fix the type hierarchy or the border, not the shadow.

**The Tonal-Depth Rule.** Where a surface needs to feel "on top of" another, step one tonal level (Background -> Surface 1 -> Surface 2). Never combine tonal step + shadow at rest.

## Shapes

Warm, geometric, quietly rounded. Nothing sharp, nothing hyper-rounded, nothing organic.

- **Corner radii (rem):** `0.375rem` (sm, small chips), `0.5rem` (md, buttons and nav items), `0.625rem` (chip, dense chips, chart tooltips, compact list cells), `0.75rem` (lg, inset cards), `0.875rem` (stat, stat tiles: a tighter radius than a top-level panel so the tile reads denser), `1rem` (xl), `1.125rem` (panel, the primary radius for top-level panels, cards, and lane containers), `1.25rem` (dialog, modal surfaces get the deck's largest radius so they read as a distinct, floating layer), `9999px` (pill, badges only).
- **Borders:** every card and tile carries a `0.0625rem` border in Line. A floating surface (tooltip, modal) uses Line Elevated instead. Borders describe the edge; they do not scream.
- **Icons and glyphs:** geometric line icons at `1rem` or `1.25rem`. No emoji glyphs in UI chrome, ever.
- **Charts:** rounded top-corners on bar charts (`radius=[3, 3, 0, 0]` in Recharts terms). Areas: no fill gradient. Lines: `strokeWidth: 2`, `dot={false}`.

### Named Rules
**The Warm-Corner Rule.** Every container uses at least `0.375rem` radius. Sharp corners belong to another world.

**The Radius-Signals-Weight Rule.** Radius increases with how much a surface floats above the deck: a stat tile (`0.875rem`) sits flatter than a top-level panel (`1.125rem`), which sits flatter than a modal (`1.25rem`). A bigger radius means "this is a distinct layer," not decoration.

**The One-Border Rule.** A tile has exactly one border: `0.0625rem` in Line (or Line Elevated when floating). Nested containers drop the border and rely on tonal step + padding.

## Components

For every component: character line, shape, color assignment, state behavior. State transitions (hover, focus, toggle) use ease-out and stay under the `150ms` ceiling: `120ms` (fast) is the standard for hover/focus/background changes, `150ms` (base) is the outer edge for anything a state change triggers directly. Content-arrival cues, covered below, are the one named exception to that ceiling.

### Buttons
- **Character:** precise and contained. No scale on press; no elevation on hover; no ripple. A button is a chip you can act on.
- **Shape:** medium radius (`0.5rem`); comfortable padding (`0.5rem 1rem`); label typography (500 weight, 0.6875rem, +0.06em tracking).
- **Primary:** Terracotta ground, Background label. Reserved for the one action a screen wants the operator to take.
- **Ghost:** transparent ground, Text label. Hover raises to Surface 2. Default for secondary actions.
- **Hover / Focus:** ghost hovers to Surface 2; primary keeps its color and shifts label opacity to 0.9. Focus-visible adds the Terracotta focus ring (see Elevation). Transition: `background 120ms ease-out`.

### Badges (pills)
- **Style:** rounded-pill, `0.125rem 0.5rem` padding, label typography, always paired with a word or glyph.
- **Live / done:** Sage ground, Background label. Never inverted; the operator recognizes "live" or "done" instantly.
- **Signal:** Terracotta-soft ground, Terracotta label. Used for "focus this" chips.
- **Warning:** Ember ground or Ember-tinted border, for an in-flight or attention state.
- **Fail:** Red ground or Red-tinted border and text, for a run or verdict that ended in failure, or a stdout error. Never used for anything short of an actual failure.
- **Neutral:** Line ground, Muted label. Everything else that is just a tag.
- **Rule:** every badge pairs color with a word or glyph. Color alone never conveys state.

### Cards / Containers
- **Corner:** `1.125rem` (panel) top-level; `0.75rem` (lg) nested.
- **Ground:** Surface 1 top-level (as a subtle top-to-bottom gradient); Surface 2 when nested inside another card.
- **Border:** `0.0625rem` Line, always; Line Elevated when the surface floats (tooltip, modal).
- **Padding:** `1.25rem` top-level; `1rem` nested.
- **Shadow:** none at rest; Overlay Lift only if the card is actually floating (modal, popover, chart tooltip).

### Stat Tiles
- **Structure:** label (Label, uppercase-tracked, Muted) on top; value (Data Display, Text) center; sub (Body, Muted) at the bottom.
- **Corner:** `0.875rem` (stat), tighter than a top-level panel so the tile reads dense.
- **Value:** always Geist Mono, `clamp(1.875rem, 2.3vw, 2.875rem)`. Digits are the reason the tile exists; make them big.
- **Grid:** 4 across on desktop; 6 across on ultra-wide; 2 across below `900px`.

### Sidebar (Deck Rail)
- **Ground:** Surface 1; right border `0.0625rem` Line; width `14rem`.
- **Item:** ghost button style at Nav size (0.875rem); active item uses Surface 2 ground + Text color; the leading glyph is Terracotta at partial opacity on inactive rows, full Terracotta on active.
- **Header:** the CC wordmark badge in a Terracotta gradient on a dark label color, `2.125rem` square, `0.625rem` (chip) radius. This is the deck's badge; do not restyle.

### Tables
- **Row height:** `2.75rem` minimum for scannable density.
- **Header:** Label typography, uppercase-tracked, Muted color, Line bottom border.
- **Row hover:** Surface 2 ground; transition `120ms ease-out`.
- **Numeric cells:** right-aligned, Geist Mono, `tabular-nums`.
- **Dividers:** `0.0625rem` Line between rows; no zebra striping.

### Progress Bar
- **Track:** `0.25rem` tall, pill-rounded, Line ground.
- **Fill:** Sage, pill-rounded, animates in with the `fillbar` content-arrival cue (see Motion) rather than snapping to width.
- **Label:** trailing count in `Data` typography, Muted color.

### Charts (Recharts)
- **Axes:** stroke Line, tick label Muted.
- **Grid:** horizontal only, Line at partial opacity.
- **Series palette (in order):** Terracotta, Indigo, Sage, Ember, then tonal variants of the same four. Red is reserved for status, not chart series; never introduce a hue outside the deck.
- **Tooltip:** Surface 2 ground, Line Elevated border, `0.625rem` (chip) radius, `0.75rem` padding.
- **Bar corners:** rounded top only (`radius=[3, 3, 0, 0]`).
- **Line series:** stroke width 2, no dots, no area gradient.
- **Center figure (donut/gauge):** Chart Figure size (1.625rem, Geist Mono) for the total, Micro size (0.5625rem) for its caption.

## Motion

State transitions are fast and get out of the way. Content that arrives on its own gets a moment to be noticed; content the operator triggers does not.

- **Fast (`120ms`):** the standard duration for hover, focus, and background-color transitions. This is the default; reach for it first.
- **Base (`150ms`):** the ceiling for any transition a state change triggers directly (toggle, tab switch, filter apply). Nothing state-triggered may exceed this.
- **Content-arrival exception:** a handful of named keyframes mark something that just showed up on its own, not a state the operator toggled, and are allowed to run past the 150ms ceiling:
  - **`rise`** (500ms, used at up to `--duration-enter` 520ms): a card or row entrance, fading up from a slight vertical offset.
  - **`fillbar`** (900ms): a progress-bar fill animating in, rather than snapping to its resting width.
  - **`lift`** (260ms to 320ms): a modal or a copy-button success state settling into place with a slight scale-and-fade.
  - **`beacon`** (2.4s, looping): the live-status pulse ring; exempted from `prefers-reduced-motion` via `.motion-safe-pulse` because a live indicator that stops pulsing under reduced motion stops communicating "this is happening now."
  - **`veil`** (240ms): a modal backdrop fading in alongside its `lift`.
- **Halo removed:** an earlier revision of the live/focus glow used a soft blurred halo behind the status dot. It has been removed; the beacon ring (a literal expanding-and-fading circle, not a blur) is the only glow-style effect left in the deck, and it is deliberately literal rather than decorative.

### Named Rules
**The 150ms Ceiling Rule.** No transition triggered by the operator (hover, focus, toggle, filter, tab) may exceed `150ms`. No bounce, no scale beyond `1.02`, no ripple.

**The Content-Arrival Exception.** A cue marking something that arrived unprompted (a new live-timeline row, a progress bar filling in, a card mounting) may run past the ceiling, up to roughly 900ms. The distinction is intent: did the operator just do something, or did the deck just show them something new.

## Do's and Don'ts

Concrete guardrails. Every one is grounded in this deck.

### Do:
- **Do** express every dimension in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Reserve `px` for `1px` hairlines and shadow blur.
- **Do** let the main lane run uncapped from sidebar to viewport edge. Add columns on wide monitors, do not enlarge margins. Cap prose locally at `max-w-[75ch]` inside its card, never the whole lane.
- **Do** put every number that shares a column with other numbers in Geist Mono with `tabular-nums`.
- **Do** use Terracotta for exactly one thing per screen: the current focus target. Use Red for exactly one thing: an actual failure.
- **Do** pair every colored badge with a word or glyph so color-blind operators still parse state.
- **Do** hover to Surface 2 at 120ms ease-out. Focus-visible gets the Terracotta focus ring.
- **Do** step tonally for depth (Background -> Surface 1 -> Surface 2) before reaching for a shadow.

### Don't:
- **Don't** use em dashes (`—`) or en dashes (`–`) in any string the app shows or any file this project writes. Use a hyphen, colon, or two sentences.
- **Don't** use emoji in UI chrome, empty states, or headers.
- **Don't** introduce gradients on text. Flat, tonal, or hairline text only; subtle surface gradients (Surface 1's top-to-bottom fill, the accent badge gradient) are the deck's one sanctioned exception and stay restrained.
- **Don't** use `#000` for any ground. The graphite is warm; true black flattens it.
- **Don't** animate anything above `150ms` unless it is a named content-arrival cue (`rise`, `fillbar`, `lift`, `veil`, `beacon`). No bounce, no scale beyond `1.02`, no ripple.
- **Don't** center a narrow deck in a wide viewport. Fill the deck.
- **Don't** stack shadows on cards at rest to create depth. Step tonally.
- **Don't** rotate role colors for variety. Sage means done, Ember means in-flight, Indigo means reference, Red means failed, and that is permanent.
- **Don't** cap type at laptop sizes on wide monitors. Display and Data-Display use `clamp()` for a reason.
- **Don't** use zebra striping in tables. Rows are separated by a hairline and by hover state, not by alternating grounds.
- **Don't** use Red for a warning or an in-progress state. That is Ember. Red means it already failed.
