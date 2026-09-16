# RFC 02 — Decompose `bin/agent.mts` into a shallow entry + deep run module

**Files**: `bin/agent.mts` (527 LOC), `lib/agent-parse.ts`, `lib/agent-verify.ts`, `lib/types.ts` (add `TaskRunTrigger`), and new `lib/agent-run.ts` + `lib/agent-git.ts`.

**Recommendation strength**: 🔴 **Strong** — attend bugs are the highest-friction bugs to reproduce; smaller modules make them tractable.

## Problem — one file, six concerns, no seam between them

`bin/agent.mts` currently holds:
1. Env resolution (CLAUDE_BIN, POLL_MS, PROJECT_FILTER, PERMISSION_MODE)
2. Single-flight polling (`busy` flag + `setInterval`)
3. Row claim (atomic CAS via `.eq("status","queued")`)
4. Child process spawn primitive (`spawnOnce`)
5. Git wrappers (`gitHead`, `gitShortstat`, `gitDiffText`)
6. Verifier orchestration (`runVerifier`)
7. Retry-lineage arithmetic (`countAncestorRetries`, `enqueueRetry`, `resumeSessionFor`)
8. The `execute` orchestration (160 lines: parent-commit snapshot, DLL retry loop, cancel poller, three stdio callbacks, post-run patch, verifier dispatch, task auto-completion)

Applying the **deletion test** to each: env resolution collapses (it's a thin adapter over `process.env`; if we delete this, we get inline env reads — not worse). But `execute` doesn't collapse — its logic is essential and it's not testable through any interface. That's the deep module hiding inside the shallow file.

`lib/agent-parse.ts` and `lib/agent-verify.ts` already exist as extractions of the "pure" bits. The remaining split is the impure orchestration.

## Solution — three modules, one interface each

```
bin/agent.mts          entry: env + poll loop + claim + one-flight guard
lib/agent-run.ts       runOne(db, run, opts) → Promise<RunOutcome>
                       owns: spawnOnce, execute, DLL retry, cancel channel
lib/agent-git.ts       gitHead, gitShortstat, gitDiffText  (spawnSync wrappers)
lib/agent-verify.ts    already exists; add "no diff → needs_review" branch
lib/agent-parse.ts     already exists; no change
```

`bin/agent.mts` becomes ~150 LOC:

```typescript
// simplified sketch
async function pollLoop() {
  while (true) {
    const row = await claimOne(db);
    if (row) await runOne(db, row, { permissionMode: PERMISSION_MODE });
    await sleep(POLL_MS);
  }
}
```

Everything else lives behind `runOne`'s interface. `runOne` is the deep module: its interface is one function, its implementation is ~200 lines, its complexity ratio is now healthy.

## Design options (pick one)

### Option A — Function-based decomposition (recommended)

Extract functions, not classes. `runOne(db, run, opts): Promise<RunOutcome>` is the public interface. Internally, `runOne` calls `driveClaudeChild()`, `finishRun()`, `retryIfNeeded()` — all local to `lib/agent-run.ts`, not exported.

```
lib/agent-run.ts exports:  runOne
                internal:  driveClaudeChild, finishRun, retryIfNeeded, spawnOnce
```

**Pros**: Matches the codebase's function-first idiom. No new types beyond `RunOutcome`. Testable by importing `runOne` with a fake `db`. Small diff.
**Cons**: The `busy` flag concern lives in the entry file; a tick still guards against overlap. Not a big deal.

### Option B — State-machine object

Model a run as a state machine (`queued → claimed → running → done|error|cancelled`) with a `TaskRunState` class. Each transition is a method: `claim()`, `run()`, `verify()`, `complete()`, `retry()`. External code drives the transitions.

**Pros**: The status column becomes an explicit type, not a string. Illegal transitions are compile-time errors. Cancel is a natural state, not a side-channel.
**Cons**: Classes are rare in this codebase. Adds a concept that isn't paying for itself yet (the SM has one meaningful place — `execute` — that isn't hard to reason about linearly). Higher-cost migration than A.

### Option C — Event-driven pipeline (speculative)

Model the run as an event stream (`RunEvent`s emitted per stdout chunk, per cancel probe, per verdict). Consumers subscribe. Uses Node's `EventEmitter` or an async iterator.

**Pros**: Live-feed / stdout tailing / DB flushing all fall out as separate consumers.
**Cons**: New abstraction (emitter) for a problem that isn't structurally streaming — it's one child at a time. Adds concepts without deleting any. Fails the deletion test.

### Sub-option — Kill `busy` + `setInterval` (bonus)

Independently of A/B/C, replace `let busy = false` + `setInterval(tick, POLL_MS)` with:

```typescript
while (true) {
  const claimed = await claimOne(db);
  if (claimed) await runOne(db, claimed, opts);
  await sleep(POLL_MS);
}
```

Same "one concurrent run per agent" guarantee, no mutable shared state, no callback across `await`s.

**Pros**: One-line concurrency contract, obvious from the loop body.
**Cons**: The current interval fires "tick" while a run is in progress and drops out (`if (busy) return`) — the loop skips that entirely. A cancel-during-idle-tick is impossible today anyway; loop is simpler and covers the same cases.

## Vocabulary check

- **Module**: `lib/agent-run.ts` is the deep one — its interface is `runOne(db, run, opts) → Promise<RunOutcome>` (one function), its implementation is ~200 LOC. Depth ratio flips from ~0.05 (agent.mts today: 8 exports over 527 LOC) to healthy.
- **Seam**: `runOne`'s signature is the seam between "which row to run" (entry policy) and "how to run one" (the deep module). Tests can drive `runOne` with a fake DB row and assert on `RunOutcome` — the interface *is* the test surface.
- **Adapter**: the DLL-init retry policy is a Windows-only adapter today, inline in `execute`. Move it inside `driveClaudeChild` — it stops leaking. One adapter (Windows) = hypothetical seam; if a POSIX-specific retry policy shows up, the seam becomes real.
- **Locality**: today, the cancel poller (line 362) and the child spawn (line 383) are 20 lines apart with a shared closure. In `lib/agent-run.ts` they're neighbors in `driveClaudeChild`, with no other concerns in between.
- **Deletion test**: delete `bin/agent.mts` — you lose the entry point (real loss). Delete `lib/agent-run.ts` — you lose the ability to run anything (real loss). Both survive the deletion test; today's `agent.mts` mixes stuff that fails the test with stuff that passes it.

## Before / after (ASCII)

```
BEFORE                                            AFTER (Option A)
──────                                            ────────────────
bin/agent.mts  527 LOC                           bin/agent.mts        ~150 LOC
├── env / claim / poll                            ├── env
├── spawnOnce                                     ├── pollLoop  → claimOne, then runOne
├── gitHead, gitShortstat, gitDiffText            └── main
├── runVerifier
├── planTitleForTask, taskContext                 lib/agent-run.ts     ~250 LOC
├── resumeSessionFor                              ├── runOne  (interface)
├── countAncestorRetries, enqueueRetry            ├── driveClaudeChild
├── execute  (160 LOC)                            ├── finishRun
└── setInterval(tick, POLL_MS)                    ├── retryIfNeeded
                                                  └── spawnOnce (internal)

                                                  lib/agent-git.ts     ~40 LOC
                                                  ├── gitHead
                                                  ├── gitShortstat
                                                  └── gitDiffText

                                                  lib/agent-verify.ts  (existing +40)
                                                  ├── runVerifier   ← moved from agent.mts
                                                  └── no-diff branch
```

## Test surface

Today: **zero** tests on `execute` or `spawnOnce` — they're only reachable by shelling out to a real `claude` binary with a real DB row. `lib/agent-parse.ts` and `lib/agent-verify.ts` have tests because they're pure and separately importable — proof of concept.

After: `runOne` is importable with a fake DB (`SupabaseClient`-shaped stub) and a fake `spawn` (Node's `mock:node:child_process` or a hand-rolled fake). Every DB write becomes assertable. Every DLL-retry can be exercised without a Windows machine.

## Estimated diff

- Option A: +~350 LOC across 2 new files, −380 LOC from `bin/agent.mts`. Net near-neutral. Test file (`tests/agent-run.test.mts`) adds ~100 LOC.
- Option B: +~500 LOC (class + state-transition table + tests).
- Option C: +~300 LOC + a new emitter dependency in the boot path.

## Recommendation

**Option A + the busy-flag sub-option**. Rationale: A matches this repo's function-first idiom, gives us a testable `runOne` (biggest single win), and the sub-option kills a mutable-shared-state footgun for free. B and C are speculative until a second concurrency policy or a second consumer of run events shows up — one adapter = hypothetical seam.
