# RFC 04 — Extract `components/event-row.tsx` and `lib/lineage.ts`

**Files**: `app/live/live-feed.tsx` (508 LOC), `components/live-timeline.tsx` (224 LOC), `bin/agent.mts` (countAncestorRetries), `lib/attend.ts` (getLineageStatsByTask), new `components/event-row.tsx`, new `lib/lineage.ts`.

**Recommendation strength**: 🔴 **Strong** — largest single copy-paste debt in the repo; kills 80+ LOC of drift-prone duplication.

## Problem — three copies of "event row", three copies of "walk parents"

### Duplication 1: event-row rendering

`app/live/live-feed.tsx:29-42, 178-244` and `components/live-timeline.tsx:8-29, 35-108` each contain:

- An `EVENT_MARK: Record<string, string>` map
- An `eventTone(type): string` function
- A memoized row component that renders prompt / tool_use / subagent_dispatch / subagent_kill / subagent_poll with IIFE-per-event-type branches

Structure is identical, only the truncation lengths differ (140 vs 90 for prompt content, 60 vs 70 for tool input). When one file learns a new event type, the other one drifts.

Applying the **deletion test**: delete either implementation and copy the other, verbatim, into its place. The code works. That's the definition of shallow duplication — two adapters, no seam.

### Duplication 2: lineage arithmetic

Three separate implementations of "walk `parent_run_id` upward and count depth":
- `app/live/live-feed.tsx:47-77` — `computeLineageMap(runs: TaskRun[]): Map<id, {n,m}>` (client-side, in-memory)
- `bin/agent.mts:273-294` — `countAncestorRetries(run): number` (server-side, filtered to `retry_on_fail`)
- `lib/attend.ts:126-169` — `getLineageStatsByTask(db, taskIds): Map<id, RunLineage>` (server-side, all triggers)

They disagree on out-of-window behavior: the client returns `depth = 2` when parent is out of window; the server returns nothing. Different answers to "what's my attempt number" depending on where the code runs.

## Solution — one row, one lineage

### For rendering: `components/event-row.tsx`

```typescript
type EventRowProps = {
  event: EventRow;
  truncate?: { prompt?: number; toolInput?: number; agent?: number };
  className?: string;
  timeFormat?: "hm" | "hms";  // live-feed uses HMS, timeline uses HM
};
export const EventRow = memo(function EventRow({ event, truncate, timeFormat = "hms" }: EventRowProps) {
  // eventTone + EVENT_MARK + parseEventContent + render
});
```

Callers pass their own truncation preferences. `EVENT_MARK` and `eventTone` become file-private constants inside `event-row.tsx`.

Optionally: introduce a discriminated `FeedEventContent` type in `lib/types.ts` so the IIFE branches disappear:

```typescript
type FeedEventContent =
  | { kind: "prompt"; text: string }
  | { kind: "tool_use"; toolName: string; input?: string }
  | { kind: "subagent_dispatch"; subagentType: string | null; description: string | null; agentId: string | null }
  | { kind: "subagent_kill"; taskId: string | null; command: string | null }
  | { kind: "subagent_poll"; to: string | null; summary: string | null; message: string | null; taskId: string | null }
  | { kind: "other"; type: string };

function parseEventContent(e: EventRow): FeedEventContent;
```

`EventRow` becomes a switch on `content.kind`. Adding a new event type = one new branch, one new variant, done.

### For lineage: `lib/lineage.ts`

```typescript
type Row = { id: string; task_id: string | null; parent_run_id: string | null };
type Lineage = { n: number; m: number };

// Pure function over rows. Callers gather rows however they gather them
// (in-memory from a Realtime feed, or via a `.in("task_id", ids)` DB query).
export function computeLineage(rows: Row[]): Map<string, Lineage>;

// Convenience for callers that want ancestor count filtered by trigger.
export function ancestorTriggers(rows: Row[], rootId: string, trigger: string): number;
```

Then:
- `app/live/live-feed.tsx` imports `computeLineage`, drops its own copy.
- `lib/attend.ts:getLineageStatsByTask` uses `computeLineage` after fetching the rows (unchanged from caller perspective).
- `bin/agent.mts:countAncestorRetries` uses `ancestorTriggers(rows, run.id, "retry_on_fail")` after its existing `.eq("task_id", ...)` fetch.

## Design options

### Option A — Extract row + pure lineage (recommended)

Both extractions, minimal API surface. `EventRow` takes truncation as a prop; `computeLineage` is pure over rows the caller fetches.

**Pros**: Single owner for each concern. Pure `computeLineage` is unit-testable with a hand-authored row list; no DB needed. Truncation preferences preserved at call sites, no policy hidden in the row component.
**Cons**: Callers still fetch their own rows for lineage (server does DB, client uses in-memory Realtime cache) — the extraction preserves that asymmetry rather than abstracting it away.

### Option B — Extract row only; leave lineage duplicated

Only do the `components/event-row.tsx` extraction. Live in with three lineage impls.

**Pros**: Half the work; the row-rendering is the bigger drift risk. Lineage is a smaller function that's been stable.
**Cons**: The in-window vs out-of-window disagreement between client and server is real — a user sees "attempt 2/3" on /live and "attempt 1/1" on /tasks for the same run when the parent is out of the client's Realtime cache. The pure-function extraction is the fix.

### Option C — Full `FeedEventContent` discriminated union

Do A + the discriminated union in `lib/types.ts`. Callers that want to render events differently (e.g. a future export-to-CSV that emits per-event columns) get typed access, not stringly-typed drilling.

**Pros**: Kills the IIFE-per-event pattern everywhere. Any new consumer of events gets safe field access with no casts.
**Cons**: Every event type change now touches `lib/types.ts` AND `parseEventContent` AND the row switch AND any other consumer. Currently 5 event kinds; if it grows past ~8 this pays for itself, below that it's ceremony.

### Option D — Server-computed lineage only (speculative)

Delete `computeLineageMap` client-side. Live-feed subscribes to Realtime for `task_runs` events and requests lineage from a server endpoint when it needs to display an "attempt N/M" chip. The server always has the full row set.

**Pros**: One source of truth. Client shows the same lineage the server would (no in-window discrepancy).
**Cons**: Extra network hop per lineage query. Real-time updates would need the server to push lineage recompute events. Trades off deep-module purity for latency + implementation complexity. Not worth it unless the discrepancy is user-visible pain.

## Vocabulary check

- **Module**: `components/event-row.tsx` is deep (1 export, ~150 LOC of rendering + parsing); `lib/lineage.ts` is deep (2 exports, ~50 LOC of tree-walking). Depth ratios go from 0.5 (many exports over few LOC in the containing files) to healthy.
- **Interface**: `<EventRow event={} truncate={} />` and `computeLineage(rows) → Map` — narrow, testable, obvious.
- **Seam**: `EventRow` is the seam between "event data" and "how a row looks." Callers can render one row + assert on the DOM; today they'd have to render the full LiveFeed + mock Supabase + provide `initialEvents`.
- **Adapter**: today, `live-feed.tsx` and `live-timeline.tsx` are two adapters over the same rendering concept — "two adapters = real seam." Extract it.
- **Locality**: within `EventRow`, tone + mark + content-parsing + rendering live together. Today they're scattered across 60-90 lines with rendering inline in each host file.
- **Deletion test**: apply to `computeLineageMap` in live-feed. Delete it; import `computeLineage` from `lib/lineage.ts`. Nothing else changes. That's the signal — the client-side copy was already shallow.

## Before / after (ASCII)

```
BEFORE                                       AFTER (Option A + C)
──────                                       ─────────────────────
app/live/live-feed.tsx      508 LOC          app/live/live-feed.tsx      ~350 LOC
├── EVENT_MARK                                 (imports EventRow, computeLineage)
├── eventTone
├── computeLineageMap                        components/event-row.tsx    ~150 LOC
├── FeedEventRow (60 LOC IIFEs)              ├── EVENT_MARK
└── LiveFeed                                  ├── eventTone
                                              ├── parseEventContent
components/live-timeline.tsx  224 LOC         └── EventRow (memoized switch on kind)
├── EVENT_MARK   (copy)
├── eventTone    (copy)                      components/live-timeline.tsx ~150 LOC
├── TimelineRow (60 LOC IIFEs, copy)          (imports EventRow)
└── LiveTimeline
                                              lib/lineage.ts               ~50 LOC
lib/attend.ts                                 ├── computeLineage
├── getLineageStatsByTask (35 LOC)            └── ancestorTriggers
                                             
bin/agent.mts                                 lib/attend.ts       (getLineageStatsByTask calls computeLineage)
├── countAncestorRetries (18 LOC)             bin/agent.mts       (countAncestorRetries → ancestorTriggers)
```

## Test surface

Today: neither `FeedEventRow` nor `TimelineRow` is testable in isolation — rendering requires the full host component + Supabase browser client. `computeLineageMap` is testable in principle but has never been tested (defined inline, not exported).

After: `EventRow` tests exist per event kind (5 kinds, ~5 test cases). `computeLineage` has ~10 test cases (empty, single, chain, branching, cycle, out-of-window). `parseEventContent` is a pure function — trivial to fuzz.

## Estimated diff

- **Option A**: +~200 LOC across 2 new files, −180 LOC from live-feed/live-timeline/agent.mts/attend.ts. Net small positive. Tests: +~120 LOC.
- **Option B**: +~150 LOC one new file, −80 LOC. Tests: +~60 LOC.
- **Option C** (A + discriminated union): +~50 LOC to `lib/types.ts` + `parseEventContent`, unlocks type-safe drilling everywhere.
- **Option D**: rejected as premature.

## Recommendation

**Option A + Option C**. Rationale: A eliminates the copy-paste debt and unifies lineage into one pure function (the audit's biggest single win). C is a cheap add-on that pays for itself the moment a sixth event kind lands — and given the current sub-agent-heavy work, that's likely near-term. B is a fallback if capacity is thin; D is rejected as premature.
