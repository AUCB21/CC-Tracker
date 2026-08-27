---
name: CC-Track
description: The Command Deck. A control-room for Claude Code retrospectives.
colors:
  deep-slate: "#0c0b0a"
  ink-slate: "#161412"
  lifted-slate: "#1d1a17"
  hairline-char: "#2a2621"
  dust: "#9b938a"
  bone-cream: "#ece8e1"
  terracotta-signal: "#d97757"
  terracotta-soft: "#d9775733"
  sage-signal: "#7fb069"
  ember-signal: "#d9a441"
  indigo-signal: "#6a9fd9"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 3.2vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "0"
  caption:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
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
    fontSize: "clamp(1.75rem, 2.5vw, 2.75rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.02em"
rounded:
  hair: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
  xl: "1rem"
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
    backgroundColor: "{colors.ink-slate}"
    textColor: "{colors.bone-cream}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  card-inset:
    backgroundColor: "{colors.lifted-slate}"
    textColor: "{colors.bone-cream}"
    rounded: "{rounded.lg}"
    padding: "1rem"
  stat-tile:
    backgroundColor: "{colors.ink-slate}"
    textColor: "{colors.bone-cream}"
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  button-primary:
    backgroundColor: "{colors.terracotta-signal}"
    textColor: "{colors.deep-slate}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.terracotta-signal}"
    textColor: "{colors.deep-slate}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.bone-cream}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.lifted-slate}"
    textColor: "{colors.bone-cream}"
  badge-neutral:
    backgroundColor: "{colors.hairline-char}"
    textColor: "{colors.dust}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-live:
    backgroundColor: "{colors.sage-signal}"
    textColor: "{colors.deep-slate}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  badge-signal:
    backgroundColor: "{colors.terracotta-soft}"
    textColor: "{colors.terracotta-signal}"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.5rem"
    typography: "{typography.label}"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.dust}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
    typography: "{typography.body}"
  nav-item-active:
    backgroundColor: "{colors.lifted-slate}"
    textColor: "{colors.bone-cream}"
  progress-track:
    backgroundColor: "{colors.hairline-char}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
  progress-fill:
    backgroundColor: "{colors.sage-signal}"
    rounded: "{rounded.pill}"
    height: "0.25rem"
---

# Design System: CC-Track

## Overview

**Creative North Star: "The Command Deck"**

CC-Track is a control room for a single operator. When the deck lights up, you see three things at once: what is running now, what has been done, and what is still queued. The interface is a status board first, an editor second. Content dominates chrome. On a wide monitor, lanes widen and columns multiply so the deck fills the glass instead of centering a small stage in a sea of margin.

The atmosphere is warm graphite: a near-black warm ground (Deep Slate) with the ambient signal of a workshop lit by a single low lamp. Terracotta is the only voice raised on that surface, and it is reserved for what the operator should notice next. Numbers speak in monospace so they align down a column; prose speaks in a modern geometric sans so it stays crisp at large sizes. Nothing is playful, nothing is corporate, nothing is empty. This is a working instrument that a person built for themselves and reaches for daily.

**Key Characteristics:**
- Wide-monitor first: fill the deck, do not center a postage stamp.
- Big, decisive type; hierarchy carried by size and weight, not by boxes.
- One signal color (terracotta) plus three role colors (sage, ember, indigo). No decorative color.
- Flat surfaces at rest; tonal steps for depth; motion only on state.
- Data reads in Geist Mono so digits line up without effort.

## Colors

The palette is a warm graphite ground with one signal accent and three semantic role colors. Every color has a job; nothing is decoration.

### Primary
- **Terracotta Signal** (#d97757): the one raised voice on the deck. Reserved for the current focus target (an active row, the CTA, an in-flight session badge, the primary series in a chart). Never more than ~10% of any given viewport, never used for pure decoration.

### Secondary (role signals; not decorative)
- **Sage Signal** (#7fb069): a completed state. Task done, session ended cleanly, progress bar fill.
- **Ember Signal** (#d9a441): an in-flight or attention state. Task in progress, idle-but-open session, chart series for cost.
- **Indigo Signal** (#6a9fd9): a meta or reference state. Project label, informational chart series, git branch chip.

### Neutral (warm graphite scale)
- **Deep Slate** (#0c0b0a): the page ground. Warm near-black; never true black.
- **Ink Slate** (#161412): the resting surface for cards and stat tiles.
- **Lifted Slate** (#1d1a17): interactive-surface state (hover row, insetted panel, popover ground).
- **Hairline Char** (#2a2621): dividers, borders, chart grid, disabled badge ground.
- **Dust** (#9b938a): secondary text, muted labels, axis ticks. Contrast target on Deep Slate: at least 4.5:1 for body-size text.
- **Bone Cream** (#ece8e1): primary text on any slate. Contrast target: at least 12:1 on Deep Slate.

### Named Rules
**The One Signal Rule.** Terracotta is the only color that raises its voice. It marks what the operator should look at next: the live session, the CTA, the top of a ranking, the primary chart series. If you catch yourself using it decoratively, replace it with Dust or Bone Cream.

**The Role-Color Discipline Rule.** Sage means done, Ember means in-flight, Indigo means reference. Never rotate them for palette variety. Rotate through hairline shades of the same role instead.

**The No-True-Black Rule.** Deep Slate is warm. Never use `#000` on this deck; it flattens the graphite ground and reads as void, not workshop.

## Typography

**Display Font:** Geist (with `ui-sans-serif, system-ui, sans-serif` fallback).
**Data Font:** Geist Mono (with `ui-monospace, SFMono-Regular, Menlo, monospace` fallback).

**Character:** Geist reads as a technical modern sans: neutral enough to disappear into UI chrome, structured enough to carry decisive display sizes. Geist Mono handles every number in the deck so digits line up without tabular tricks. The pair is quietly technical; nothing decorative.

### Hierarchy
- **Display** (600, `clamp(2rem, 3.2vw, 3.5rem)`, line-height 1.05, tracking -0.02em): headline numbers on the analytics page and the primary KPI when a page has one.
- **Headline** (600, `clamp(1.5rem, 2vw, 2.5rem)`, line-height 1.1, tracking -0.015em): section titles and page titles. Scales up on wide monitors so the deck reads big.
- **Title** (600, 1.125rem, line-height 1.25, tracking -0.01em): card titles, list-row primaries.
- **Body** (400, 0.9375rem, line-height 1.55): descriptions, paragraph copy, table cells. Max line length 65 to 75 characters when the block is prose.
- **Caption** (400, 0.75rem, line-height 1.4): meta lines under rows and secondary chart labels. One step below body, always muted color.
- **Label** (500, 0.6875rem, letter-spacing 0.06em, uppercase optional): column heads, badge text, muted metadata. Uppercase only for grouping labels, never for content.
- **Data** (Mono, 500, 0.9375rem): every number that shares a column with other numbers.
- **Data Display** (Mono, 500, `clamp(1.75rem, 2.5vw, 2.75rem)`, line-height 1): the big KPI numbers on stat tiles.

### Named Rules
**The Numbers-Are-Mono Rule.** Any digit that appears next to other digits (stat tile, table cell, chart tooltip, badge count) uses Geist Mono. Prose numbers inside a sentence stay in Geist Sans.

**The Big Type Rule.** Display and Data Display use `clamp()` so the deck grows with the viewport instead of stopping at a laptop-era ceiling. Do not cap the deck at 1200px.

**The No-Em-Dash Rule.** Copy uses hyphens, colons, commas, or two sentences. Em dash (`—`) and en dash (`–`) are banned in every string the app shows.

## Layout

The deck is a wide-viewport-first grid. The current 1200px main-content cap is a laptop-era compromise and should be lifted so the deck fills the glass.

- **Container:** the main lane is uncapped, it takes the full viewport minus the sidebar. This is a data deck (tables, charts, tiles), not a docs site, so long-line prose is rare. Where prose does appear inside a card, it caps at `max-w-[75ch]` locally so line length stays readable while the deck fills. On `>=1440px` grids gain a second column; on `>=2000px` stat rows expand from 4 to 6 tiles.
- **Sidebar:** fixed left, `13rem` wide (208px), warm graphite, always visible above 900px. Below that, it collapses to a top bar; the deck is still primary-user-desktop but must not break in a narrow window.
- **Grid rhythm:** 12-column implicit grid; use `gap: 1rem` (md) between cards, `gap: 1.5rem` (lg) between sections, `gap: 0.625rem` (sm) inside a card.
- **Density:** dense-by-content, not dense-by-shrinking. When a page has more to show on a wide monitor, add columns and rows; do not cram type smaller than 0.875rem body / 0.6875rem label.
- **Padding scale (rem, never px):** `0.375rem` (xs), `0.625rem` (sm), `1rem` (md), `1.5rem` (lg), `2rem` (xl), `3rem` (xxl).
- **Section margins:** vertical rhythm is `1.5rem` between components, `2rem` between sections. Never rely on a single big margin to carry hierarchy; use a label + rule.

### Named Rules
**The Relative Unit Rule.** Every dimension is expressed in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Pixels are permitted only for hairlines under 2px (`1px` borders, `0.0625rem` alternative allowed) and for `box-shadow` blur radii. If you are typing a `px` value greater than 1, stop and convert to `rem`.

**The Fill-The-Deck Rule.** On monitors wider than 1440px, expand content lanes and add columns. Do not center a narrow deck in a sea of margin. Whitespace has to earn its place by carrying rhythm, not by hiding the operator's data.

**The Content-First Chrome Rule.** Chrome (sidebar, headers, dividers) uses `Hairline Char` at `0.0625rem` (1px). It is present, quiet, and never competes with content.

## Elevation & Depth

Flat by default. Depth is tonal: the deck steps from Deep Slate (ground) to Ink Slate (surface) to Lifted Slate (elevated interaction) using color only, not shadow. Shadows appear only in response to state.

### Shadow Vocabulary
- **Focus Ring** (`box-shadow: 0 0 0 0.125rem var(--color-terracotta-soft)`): keyboard-focus signal on interactive elements. Never on hover; only on focus-visible.
- **Overlay Lift** (`box-shadow: 0 1rem 3rem rgba(0,0,0,0.5)`): dialogs, popovers, and the tooltip on a chart. Never on a static card.

### Named Rules
**The Flat-By-Default Rule.** Cards, tiles, and rows do not carry shadows at rest. If a card looks flat and unimportant, fix the type hierarchy or the border, not the shadow.

**The Tonal-Depth Rule.** Where a surface needs to feel "on top of" another, step one tonal level (Deep -> Ink, Ink -> Lifted). Never combine tonal step + shadow at rest.

## Shapes

Warm, geometric, quietly rounded. Nothing sharp, nothing hyper-rounded, nothing organic.

- **Corner radii (rem):** `0.375rem` (sm, chips inside dense tables), `0.5rem` (md, buttons and nav items), `0.75rem` (lg, inset cards and dialog surfaces), `1rem` (xl, top-level cards and stat tiles), `9999px` (pill, badges only).
- **Borders:** every card and tile carries a `0.0625rem` border in `Hairline Char`. Borders describe the edge; they do not scream.
- **Icons and glyphs:** geometric line icons at `1rem` or `1.25rem`. No emoji glyphs in UI chrome, ever. The current `▦ ◫ ≡ ▶ ◔ ⚙` sidebar glyphs stay; they are the world's voice.
- **Charts:** rounded top-corners on bar charts (`radius=[3, 3, 0, 0]` in Recharts terms). Areas: no fill gradient. Lines: `strokeWidth: 2`, `dot={false}`.

### Named Rules
**The Warm-Corner Rule.** Every container uses at least `0.375rem` radius. Sharp corners belong to another world.

**The One-Border Rule.** A tile has exactly one border: `0.0625rem` Hairline Char. Nested containers drop the border and rely on tonal step + padding.

## Components

For every component: character line, shape, color assignment, state behavior. States use ease-out at `0.12s` (`120ms`), never over `0.15s`.

### Buttons
- **Character:** precise and contained. No scale on press; no elevation on hover; no ripple. A button is a chip you can act on.
- **Shape:** medium radius (`0.5rem`); comfortable padding (`0.5rem 1rem`); label typography (500 weight, 0.6875rem, +0.06em tracking).
- **Primary:** Terracotta Signal ground, Deep Slate label. Reserved for the one action a screen wants the operator to take.
- **Ghost:** transparent ground, Bone Cream label. Hover raises to Lifted Slate. Default for secondary actions.
- **Hover / Focus:** ghost hovers to Lifted Slate; primary keeps its color and shifts label opacity to 0.9. Focus-visible adds the Terracotta focus ring (see Elevation). Transition: `background 120ms ease-out`.

### Badges (pills)
- **Style:** rounded-pill, `0.125rem 0.5rem` padding, label typography.
- **Live:** Sage Signal ground, Deep Slate label. Never inverted; the operator recognizes "live" instantly.
- **Signal:** Terracotta-soft ground, Terracotta Signal label. Used for "focus this" chips.
- **Neutral:** Hairline Char ground, Dust label. Everything else that is just a tag.
- **Rule:** every badge pairs color with a word or glyph. Color alone never conveys state.

### Cards / Containers
- **Corner:** `1rem` (xl) top-level; `0.75rem` (lg) nested.
- **Ground:** Ink Slate top-level; Lifted Slate when nested inside another card.
- **Border:** `0.0625rem` Hairline Char, always.
- **Padding:** `1.25rem` top-level; `1rem` nested.
- **Shadow:** none at rest; overlay-lift only if the card is actually floating.

### Stat Tiles
- **Structure:** label (Label, uppercase-tracked, Dust) on top; value (Data Display, Bone Cream) center; sub (Body, Dust) at the bottom.
- **Value:** always Geist Mono, `clamp(1.75rem, 2.5vw, 2.75rem)`. Digits are the reason the tile exists; make them big.
- **Grid:** 4 across on desktop; 6 across on ultra-wide; 2 across below `900px`.

### Sidebar (Deck Rail)
- **Ground:** Ink Slate; right border `0.0625rem` Hairline Char; width `13rem`.
- **Item:** ghost button style; active item uses Lifted Slate ground + Bone Cream text; the leading glyph (`▦ ◫ ≡ ▶ ◔ ⚙`) is Terracotta at 0.8 opacity on inactive rows, full Terracotta on active.
- **Header:** the CC wordmark cube in Terracotta on Deep Slate, `1.75rem` square, `0.375rem` radius. This is the deck's badge; do not restyle.

### Tables
- **Row height:** `2.75rem` minimum for scannable density.
- **Header:** Label typography, uppercase-tracked, Dust color, `Hairline Char` bottom border.
- **Row hover:** Lifted Slate ground; transition `120ms ease-out`.
- **Numeric cells:** right-aligned, Geist Mono, `tabular-nums`.
- **Dividers:** `0.0625rem` Hairline Char between rows; no zebra striping.

### Progress Bar
- **Track:** `0.25rem` tall, pill-rounded, Hairline Char ground.
- **Fill:** Sage Signal, pill-rounded.
- **Label:** trailing count in `Data` typography, Dust color.

### Charts (Recharts)
- **Axes:** stroke Hairline Char, tick label Dust at 0.6875rem.
- **Grid:** horizontal only, Hairline Char at 0.5 opacity.
- **Series palette (in order):** Terracotta Signal, Indigo Signal, Sage Signal, Ember Signal, then tonal variants of the same four. Never introduce a hue outside the deck.
- **Tooltip:** Lifted Slate ground, Hairline Char border, `0.5rem` radius, `0.75rem` padding.
- **Bar corners:** rounded top only (`radius=[3, 3, 0, 0]`).
- **Line series:** stroke width 2, no dots, no area gradient.

## Do's and Don'ts

Concrete guardrails. Every one is grounded in this deck.

### Do:
- **Do** express every dimension in `rem`, `em`, `ch`, `vw`, `%`, or `clamp()`. Reserve `px` for `1px` hairlines and shadow blur.
- **Do** let the main lane run uncapped from sidebar to viewport edge. Add columns on wide monitors, do not enlarge margins. Cap prose locally at `max-w-[75ch]` inside its card, never the whole lane.
- **Do** put every number that shares a column with other numbers in Geist Mono with `tabular-nums`.
- **Do** use Terracotta Signal for exactly one thing per screen: the current focus target.
- **Do** pair every colored badge with a word or glyph so color-blind operators still parse state.
- **Do** hover to Lifted Slate at 120ms ease-out. Focus-visible gets the Terracotta focus ring.
- **Do** step tonally for depth (Deep -> Ink -> Lifted) before reaching for a shadow.

### Don't:
- **Don't** use em dashes (`—`) or en dashes (`–`) in any string the app shows or any file this project writes. Use a hyphen, colon, or two sentences.
- **Don't** use emoji in UI chrome, empty states, or headers. The `▦ ◫ ≡ ▶ ◔ ⚙` glyphs in the sidebar are geometric marks, not emoji, and they stay.
- **Don't** introduce gradients on backgrounds, buttons, or text. Flat, tonal, or hairline only.
- **Don't** use `#000` for any ground. The graphite is warm; true black flattens it.
- **Don't** animate anything above `150ms`. No bounce, no scale beyond `1.02`, no ripple. Preciso y contenido. The one named exception is a content-appearance highlight (a new live-timeline row fading in from an accent tint): those run up to `900ms` because they mark something that just arrived, not a state the operator triggered. State transitions (hover, focus, toggles) stay under the `150ms` ceiling; content-arrival cues do not.
- **Don't** center a narrow deck in a wide viewport. Fill the deck.
- **Don't** stack shadows on cards at rest to create depth. Step tonally.
- **Don't** rotate role colors for variety. Sage means done, Ember means in-flight, Indigo means reference, and that is permanent.
- **Don't** cap type at laptop sizes on wide monitors. Display and Data-Display use `clamp()` for a reason.
- **Don't** use zebra striping in tables. Rows are separated by a hairline and by hover state, not by alternating grounds.
