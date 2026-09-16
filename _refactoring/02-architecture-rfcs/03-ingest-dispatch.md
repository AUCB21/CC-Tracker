# RFC 03 — Refactor `lib/ingest.ts` switch into a dispatch map, fix the TodoWrite N+1

**Files**: `lib/ingest.ts` (469 LOC), `app/api/ingest/task/route.ts` (uses same `dedupe_key` format), new `lib/ingest/*.ts` handler modules, new `lib/dedupe.ts` (or extend `lib/ingest.ts`).

**Recommendation strength**: 🔴 **Strong** — central write path; the switch is the classic maintainability tax and the N+1 has real per-request cost.

## Problem — nested-switch and content-hash duplication

`processHook` is one 260-line function with:
- An **outer** switch on `hook_event_name` (8 cases + `default:` catch-all)
- An **inner** switch on `tool_name` inside the `PostToolUse` case (6 tool-specific event shapes + `default:`)
- Local helpers `withPid` and `truncStr` defined inside the function scope
- Direct DB writes interleaved with control flow

Adding a new event or a new instrumented tool = editing a giant function. Reviewing any change here forces scrolling the entire switch.

Separately, `syncTodoWrite` does one DB round trip *per todo item*: `select("id,status")…eq("dedupe_key", ...)…maybeSingle()` inside a for-loop. On a 20-item TodoWrite, that's 20 sequential selects. And the dedupe-key format (`"tw:<scope>:sha1(content)"`) is authored inline both in `lib/ingest.ts:152` and `app/api/ingest/task/route.ts:85` — two owners for one contract.

Applying the **deletion test**: could I delete `processHook`? No — but I *could* delete its switch statement and replace it with a table lookup, and the code gets better, not worse. The switch is a shallow abstraction (one big function pretending to be small handlers).

## Solution — dispatch map + per-event modules + shared `dedupeKeyFor`

```
lib/ingest.ts                 processHook, resolveProject, ensureSession, addEvent  (unchanged)
lib/ingest/handlers.ts        dispatch table + shared helpers (withPid, truncStr, truncField)
lib/ingest/session-start.ts   handleSessionStart(ctx)
lib/ingest/user-prompt.ts     handleUserPromptSubmit(ctx)
lib/ingest/post-tool-use.ts   handlePostToolUse(ctx) — inner dispatch on tool_name
lib/ingest/stop.ts            handleStop(ctx)
lib/ingest/session-end.ts     handleSessionEnd(ctx)
lib/ingest/subagent.ts        handleSubagentStart, handleSubagentStop
lib/ingest/misc.ts            handleStopFailure, handleNotification, handleUnknown

lib/dedupe.ts                 dedupeKeyFor(kind, scopeId, content): string
```

Where each `handleX(ctx)` takes a `HandlerContext` with the db, payload, session/project ids, and `withPid`. The dispatch table:

```typescript
const HOOK_HANDLERS: Record<string, HookHandler> = {
  SessionStart:     handleSessionStart,
  UserPromptSubmit: handleUserPromptSubmit,
  PostToolUse:      handlePostToolUse,
  Stop:             handleStop,
  SessionEnd:       handleSessionEnd,
  SubagentStart:    handleSubagentStart,
  SubagentStop:     handleSubagentStop,
  StopFailure:      handleStopFailure,
  Notification:     handleNotification,
};
async function processHook(db, payload) {
  const ctx = await buildContext(db, payload);
  const handler = HOOK_HANDLERS[payload.hook_event_name ?? ""] ?? handleUnknown;
  await handler(ctx);
  return { ok: true, event: payload.hook_event_name ?? "unknown" };
}
```

And `syncTodoWrite`'s N+1 collapses to one bulk read + one bulk upsert:

```typescript
async function syncTodoWrite(db, sessionId, projectId, todos) {
  const keys = todos.map(t => dedupeKeyFor("tw", projectId ?? sessionId, t.content));
  const { data: existing } = await db.from("tasks")
    .select("id, dedupe_key, status")
    .in("dedupe_key", keys);
  const byKey = new Map(existing.map(r => [r.dedupe_key, r]));
  // Now one upsert per row using the in-memory map; still sequential (Supabase
  // client has no native bulk-upsert with conflict target), but reads drop
  // from N to 1.
}
```

## Design options (pick one)

### Option A — Dispatch map + per-event files (recommended)

Split as above. Each handler is its own file. Adding an event = adding a file + one entry in the map.

**Pros**: Grep-friendly (`ripgrep "handleStop" lib/ingest/`). Each handler is a small unit with an obvious test surface. `processHook` becomes ~15 LOC of pure orchestration.
**Cons**: 7-8 new files for what fits in one today. Some readers prefer "one flow, one file" — this trades that for grep-friendliness.

### Option B — Dispatch map, single file

Keep everything in `lib/ingest.ts` but replace the switch with a `HOOK_HANDLERS` object literal at module scope. Each handler becomes a named `async function handleX(ctx) { … }` in the same file.

**Pros**: One-file locality preserved. Named functions mean stack traces name the actual handler. Half the migration cost of A.
**Cons**: File is still 469 LOC (just structured differently). The `PostToolUse` inner switch still lives inline unless you also split it into a second dispatch map — which brings you back toward A.

### Option C — Extract only `PostToolUse`'s tool dispatch

Leave the outer switch alone (it's ~50 LOC, arguably fine); extract the inner tool dispatch into `lib/ingest/post-tool-use.ts` with a `TOOL_HANDLERS` map. The outer switch's `PostToolUse` case becomes one function call.

**Pros**: Smallest diff. Targets the actually-painful inner nesting (6 tool cases, each with its own event shape). Preserves the outer flow-per-file principle.
**Cons**: Doesn't fully solve the "one giant function" problem — the outer switch is smaller than the inner one but still has to be edited every time a new hook event is added.

### Sub-option — Postgres upsert on `dedupe_key` (bonus, orthogonal)

The `tasks` table has `dedupe_key text unique`. Supabase's client supports `.upsert(rows, { onConflict: "dedupe_key" })`. If we build the rows in-memory (including derived fields like `completed_at`) and call one `.upsert()`, the whole "read then update-or-insert" branch disappears.

**Pros**: One DB round trip regardless of todo count. Deletes ~30 LOC. Removes a race (today: between the select and the update, a concurrent write could change status; irrelevant in single-user mode but nicer defensively).
**Cons**: Loses the "only update if status/description changed" optimization currently in the code — every sync writes every row. In practice, tasks table is small (<1000 rows for even heavy users), Supabase writes are ~10ms — not measurable.

## Vocabulary check

- **Module**: `lib/ingest/*` — each handler is a shallow but *focused* module. `processHook` becomes the deep module: interface is `(db, payload) → Promise<{ok, event}>`, implementation is orchestration only.
- **Seam**: The `HookHandler` type is the seam. Two implementations exist today (the outer + inner switches); after refactor, `HookHandler` is one interface. Tests can dispatch to a fake handler map and assert dispatch behavior separately from handler logic.
- **Locality**: A trades file-locality for concept-locality (each handler's inputs + writes live together). B keeps file-locality but re-orders visually.
- **Deletion test**: apply to the switch statement itself. Does deleting it concentrate complexity? No — the concerns hang together per handler, not per switch. The switch was hiding this.
- **Adapter**: `dedupeKeyFor` is the adapter over "how do we identify a logically-same task across time." Today two adapters (in `ingest.ts` and `api/ingest/task/route.ts`) exist; extracting to `lib/dedupe.ts` makes the seam real (one owner).

## Before / after (ASCII)

```
BEFORE                                          AFTER (Option A)
──────                                          ────────────────
lib/ingest.ts  469 LOC                          lib/ingest.ts               ~180 LOC
  processHook (260 LOC)                           processHook  (dispatch only, ~15 LOC)
    switch(event) {                               resolveProject, ensureSession, addEvent
      case SessionStart: {...}
      case UserPromptSubmit: {...}                lib/ingest/handlers.ts     ~60 LOC
      case PostToolUse: {                           HOOK_HANDLERS = { ... }
        switch(toolName) {                          buildContext, withPid, truncStr
          case TodoWrite: {...}                     type HookHandler, HandlerContext
          case Agent: {...}
          case TaskStop: {...}                    lib/ingest/session-start.ts    ~40 LOC
          case SendMessage: {...}                 lib/ingest/user-prompt.ts      ~30 LOC
          case TaskGet: {...}                     lib/ingest/post-tool-use.ts    ~140 LOC
          case TaskOutput: {...}                   ├── TOOL_HANDLERS = {...}
          default: {...}                           ├── handleTodoWrite  (with N+1 fix)
        }                                          ├── handleAgent
      }                                            ├── handleTaskStop / SendMessage / etc.
      case Stop: {...}                             └── handleUnknownTool
      case SessionEnd: {...}                     lib/ingest/stop.ts             ~30 LOC
      case SubagentStart: {...}                  lib/ingest/session-end.ts      ~15 LOC
      case SubagentStop: {...}                   lib/ingest/subagent.ts         ~30 LOC
      case StopFailure: {...}                    lib/ingest/misc.ts             ~40 LOC
      case Notification: {...}                   
      default: {...}                             lib/dedupe.ts                  ~15 LOC
    }                                              dedupeKeyFor(kind, scopeId, content)
```

## Test surface

Today: `processHook` has no direct tests — writes go straight to Supabase. `resolveProject`, `ensureSession`, `syncTodoWrite`, `addEvent` are all private (not exported) — reachable only through the giant switch.

After: Each `handleX` is importable with a fake `HandlerContext`. `dedupeKeyFor` is a pure function (single-line test). `syncTodoWrite`'s bulk-read/upsert path can be tested by asserting the query shape a fake `db` sees.

## Estimated diff

- **Option A**: +~350 LOC across 8 new files, −290 LOC from `lib/ingest.ts`. Net small positive. Test additions: +~150 LOC.
- **Option B**: 0 LOC delta (structural rewrite in place). Minimal file churn.
- **Option C**: +~150 LOC (one new file), −140 LOC from `lib/ingest.ts`.
- **Sub-option (upsert)**: −30 LOC in `syncTodoWrite`.

## Recommendation

**Option A + the upsert sub-option**. Rationale: A gives per-handler test surface and grep-friendly modules — this file is the write path, so surface-area matters. The upsert sub-option deletes code and removes a race for free. B is a reasonable compromise if you want a smaller-blast-radius commit; C is a fallback if we get to Phase 4 with capacity for only one small change.

The `dedupeKeyFor` extraction (from Module 3 audit) applies regardless of which of A/B/C is picked — do it anyway.
