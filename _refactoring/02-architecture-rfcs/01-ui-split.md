# RFC 01 — Split `components/ui.tsx` into a deep `components/ui` module

**Files**: `components/ui.tsx` (883 LOC, 25 commits/6mo) and every file that imports from it (`grep -l "from \"@/components/ui\""` — ~40 files).

**Recommendation strength**: 🔴 **Strong** (highest ROI in the audit).

## Problem — shallow interface hiding a bag of primitives

`components/ui.tsx` is a single module exporting 23+ unrelated primitives (Card, Fold, Stat, Chip, IconButton, ErrorAlert, Badge, Progress, RailIcons, ActionIcons, LiveDot, Sparkline, TrendDelta, SetupBanner, Empty, PageHeader, Breadcrumbs, TaskLine, NavBadge, Input, Textarea, Label, InlineError, plus three style constants). It reads as one file but has the **interface complexity of seven files**: any consumer reads a giant Card / Chip / Stat / Icon / Field grab-bag when they just want, say, a chip.

By the **deletion test**: deleting `ui.tsx` doesn't concentrate complexity — its concerns don't hang together. Card knows nothing about Chip; Chip knows nothing about RailIcons. The apparent unity is filesystem-level, not conceptual.

25 commits in 6 months on one file makes it a merge-conflict magnet. `git blame` on a Chip change surfaces 22 other primitives' history. **Locality** is destroyed: to reason about the Chip variant map you scroll past Card, Fold, Stat, IconButton, ErrorAlert, Badge, Progress, SetupBanner, Empty, PageHeader, TaskLine, RailIcons.

## Solution — one module per primitive family

Split by primitive family. Each new file exports what belongs together and nothing else. A barrel `components/ui/index.ts` re-exports everything, so no import paths change:

```
components/ui/
  card.tsx      Card, Fold, PageHeader, Breadcrumbs, SetupBanner, Empty
  chip.tsx      Chip, Badge, NavBadge, IconButton, ErrorAlert, InlineError
  stat.tsx      Stat, TrendDelta, Sparkline, Progress
  field.tsx     Input, Textarea, Label
  icons.tsx     RailIcons, ActionIcons, LiveDot
  list.tsx      TaskLine
  tokens.ts     PANEL_STYLE, STAT_STYLE, CELL_STYLE  (or delete — see Option C)
  index.ts      re-exports everything
```

Then `components/ui.tsx` is deleted.

## Design options (pick one)

### Option A — Straight file split + barrel (recommended)

Split into the seven files above; `components/ui/index.ts` re-exports; every existing `import { Chip } from "@/components/ui"` keeps working. No API changes, no consumer edits.

**Pros**: Zero risk of import breakage. Diff is mechanical: move + barrel. Reviewable in one PR. Callable in Phase 4 with a single ponytail-scoped commit.
**Cons**: Barrel imports can defeat some tree-shaking (Next.js's compiler handles this well, but strict-mode audits will flag it).

### Option B — File split + kill the barrel; consumers update

Same file split, but no `index.ts`. Every consumer updates `import { Chip } from "@/components/ui"` → `import { Chip } from "@/components/ui/chip"`. **Interface is the test surface** at its most literal: what a file imports names exactly what it depends on.

**Pros**: Every file's imports become a true dependency graph. Grep for consumers of a primitive family is a one-liner. Better tree-shaking. Encourages callers to notice when they've grown import lists.
**Cons**: 40-ish files touched in the migration. Every future primitive add/rename now has to think about which sub-module owns it. More friction per PR.

### Option C — Delete inline `PANEL_STYLE` / `STAT_STYLE` / `CELL_STYLE` first (bonus, orthogonal)

These three style objects duplicate what `globals.css`'s `.deck-card` / `.deck-stat` classes already provide. In the split, don't move them — delete them. Callers switch to `<section className="deck-card">` etc.

**Pros**: Removes an entire drift risk (JS token vs CSS token) that Phase 2 flagged. Reduces line count without any new file. A pure "shortest working diff wins."
**Cons**: Any code-outside-JSX that composes with `PANEL_STYLE` (e.g. `<section style={{ ...PANEL_STYLE, ...override }}>`) needs a rethink — a `className` doesn't compose the same way. Grep for `PANEL_STYLE` first (there are ~6 call sites).

Options A and C compose naturally; A and B are alternatives.

## Vocabulary check

- **Module**: each new `components/ui/*.tsx` file. Depth increased (fewer exports per module = simpler interface).
- **Interface**: `import { Chip } from "@/components/ui/chip"` — narrow, obvious.
- **Seam**: `components/ui/index.ts` (Option A only) — one adapter is a hypothetical seam. If in a year we grow a second entry point (e.g. a Storybook barrel), the seam becomes real; if not, the barrel earns its keep by keeping consumers stable.
- **Locality**: preserved within each new file (all Chip-related exports touch the same file). Cross-module locality (`Stat` depending on `Sparkline`) is preserved by keeping them in the same `stat.tsx`.
- **Deletion test**: applies to the barrel in Option A. If we delete `index.ts`, callers must know exact paths — this concentrates the "what belongs where" decision on the caller side. Fine either way.

## Before / after (ASCII)

```
BEFORE                                      AFTER (Option A)
──────                                      ────────────────
components/ui.tsx        883 LOC            components/ui/
├── Card ─────────────┐                     ├── card.tsx          140 LOC
├── Fold ─────────────┤                     ├── chip.tsx           95 LOC
├── PageHeader ───────┤                     ├── stat.tsx          170 LOC
├── Breadcrumbs ──────┤                     ├── field.tsx          40 LOC
├── SetupBanner ──────┤                     ├── icons.tsx         100 LOC
├── Empty ────────────┤                     ├── list.tsx           30 LOC
├── Chip ─────────────┤   ← every consumer  ├── tokens.ts          20 LOC  (or deleted)
├── Badge ────────────┤     of ANY of these └── index.ts           25 LOC  (re-exports)
├── NavBadge ─────────┤     re-parses the
├── IconButton ───────┤     whole file
├── ErrorAlert ───────┤
├── InlineError ──────┤
├── Stat ─────────────┤
├── TrendDelta ───────┤
├── Sparkline ────────┤
├── Progress ─────────┤
├── Input ────────────┤
├── Textarea ─────────┤
├── Label ────────────┤
├── TaskLine ─────────┤
├── LiveDot ──────────┤
├── RailIcons ────────┤
├── ActionIcons ──────┤
└── PANEL/STAT/CELL_STYLE
```

## Test surface

No behavior changes. Existing rendering + a11y tests keep passing. The only mechanical risk is import resolution — Next.js will fail-fast on any mis-typed path at build time.

## Estimated diff

- **Option A**: +~500 LOC across 8 new files, −883 LOC from `ui.tsx`. Net small negative. ~40 consumer files touched only if editor formatters resort imports (import paths themselves don't change).
- **Option B**: same file split + ~40 consumer files updated (one import path change each).
- **Option C**: additional ~-40 LOC (remove three style constants + inline uses).

## Recommendation

**Option A + Option C** together. Rationale: A is zero-risk and unblocks the parallel-work problem immediately; C removes a real drift risk with a small orthogonal cleanup. B is the "correct" long-term shape but the migration cost isn't worth it *right now* — leave B as a follow-up if audit later shows barrel imports are causing real bloat.
