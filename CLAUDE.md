@AGENTS.md

# Track your work

This repo IS the tracker. Any Claude Code session (or subagent) working here MUST use `TaskCreate` / `TaskUpdate` / `TodoWrite` for multi-step work (2+ steps), and enter plan mode + `ExitPlanMode` when starting a feature or audit. The `PostToolUse` hook forwards those to `/api/ingest/task` and `/api/ingest/plan`; skipping the tools means nothing shows in `/tasks` or `/plans` and the operator loses visibility.

Trivial one-off edits (single file, single reasoning step) do not need a task. Everything else does.
