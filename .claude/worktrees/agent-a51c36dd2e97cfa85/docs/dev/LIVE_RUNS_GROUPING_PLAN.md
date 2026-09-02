# Plan: /live Task Runs "duplicate" cards

Status: QUEUED. Do this AFTER all other in-flight code changes have landed and committed (perf audit [done], /live realtime fix [done], events-feed order flip, impeccable pass). Assign to an agent when the tree is otherwise settled.

## Problem (diagnosed 2026-08-30, read-only investigation)

On `/live` the Task Runs lane renders one card per `task_runs` row, keyed by `run.id`, and never groups by `task_id`. A task legitimately has multiple rows (schema `supabase/schema.sql:122`: "one row per Attend click"). So re-attending a task shows several loose cards, which reads as "the same task appears twice, once Done once Error."

Ruled out:
- NOT DB duplication: 22 rows / 22 distinct ids / 0 dupes on the live DB. The paired cards are genuinely different runs (e.g. task `40bc63bf`: an `error` that died in ~0.1s, then a `done` that ran ~2min). The instant errors are the `0xC0000142` DLL-init spawn failures noted in HARNESS_PLAN.
- NOT retry lineage: Gap 3 (`parent_run_id` / `trigger`) is unshipped; these are manual re-attends.

## Decision to make (this is why it is queued, not auto-fixed)

The product north star is letting the user track task/project status, and those spawn failures are real signal. So "just hide older attempts" is not obviously right. Two candidate tasks:

- **Task A (minimal, recommended first step).** Collapse the Task Runs lane to the latest run per `task_id` (mirror `getLatestRunsByTask`, already used on `/tasks`). Rows with null `task_id` pass through. Read-only, zero SQL. Proposed diff: a `useMemo` deriving `displayRuns` from `runs` (keep newest per `task_id`), render `displayRuns` instead of `runs`. Trade-off: hides older failed attempts.
- **Task B (only if A's trade-off is unacceptable).** Keep every run visible but group under one task with an "attempt N/M" indicator so repeats read as attempts, not dupes. This is materially more work and overlaps HARNESS_PLAN Gap 3 (parent_run_id + lineage view); prefer to fold it into Gap 3 rather than build a throwaway grouping now.

Recommendation: ship Task A, defer lineage to Gap 3. Confirm with the user before choosing B.

## Due task(s)

1. [ ] Implement Task A (latest-run-per-task collapse in `app/live/live-feed.tsx`). Gates: `tsc` clean, no em/en dashes, ponytail-minimal, one commit.
2. [ ] Decide (user) whether Task A's hiding of failed attempts is acceptable; if not, schedule Task B under Gap 3.

## Side note (unrelated, do not fix here)

The deployed DB is slightly behind `supabase/schema.sql`: `task_runs.exit_code` is missing on the live table (verdict / total_cost_usd exist). Harness Gaps 0-2 columns are only partially applied. Flag for a separate schema-sync pass.
