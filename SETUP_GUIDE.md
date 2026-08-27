# CC-Track: Fresh Install Guide

Follow this top to bottom on a new machine and you'll have a working
CC-Track: database, app, Claude Code hooks and the `cctrack` CLI, all
wired together. It goes deeper than the README's quick-start: it explains
*why* each table exists, exactly which keys you need and where they come
from, and what each page in the app is for.

Architecture, in one line: Claude Code fires hooks on your machine, those
hooks POST to this app's `/api/ingest/*` routes, the app writes to your own
Supabase (Postgres) project using a server-side secret key. Nothing leaves
your machine except that one HTTPS call to your own database.

## 1. Prerequisites

- Node.js 18 or newer, with npm.
- A free Supabase account (supabase.com). The free tier is enough for a
  single-user tracker like this one.
- Claude Code, used from a terminal.

## 2. Get the code

Copy or clone the `cc-track` folder onto the new machine. Nothing else is
required at this step, no global installs yet.

## 3. Create the Supabase project

1. supabase.com -> New project. Pick any name/region, set a database
   password (you won't need it again, Supabase manages the connection).
2. Wait for provisioning to finish (about a minute).
3. Left sidebar -> **SQL Editor** -> New query -> paste the entire contents
   of [`supabase/schema.sql`](supabase/schema.sql) -> **Run**.
   This creates every table CC-Track needs (see below) with Row Level
   Security turned on. It's safe to run more than once, every statement is
   `create table if not exists` / `add column if not exists`.
4. Left sidebar -> **Settings -> API**. You'll copy two values from this
   page in step 5: the **Project URL** and the **service_role** (or
   `sb_secret_...`) key.

## 4. The tables, and why each one exists

Five tables, all created by `schema.sql`:

| Table | Why it exists |
|---|---|
| `projects` | One row per working directory (`cwd`) Claude Code runs in. Auto-created the first time a session starts in a new folder, so everything else can be grouped "by project" without you naming anything. |
| `sessions` | One row per Claude Code session. Its primary key **is** Claude's own session UUID, not a generated one, so if you resume or continue a session, the hook updates the same row instead of creating a duplicate. This is where token counts, tool-use counts, model, git branch and estimated cost accumulate. |
| `plans` | A unit of work, roughly "what am I trying to do right now." Created by you (`cctrack plan add`) or automatically by Claude when you paste `CLAUDE.md.snippet` into a project. Belongs to a session and a project. |
| `tasks` | The checklist items under a plan. These sync automatically from Claude Code's own TodoWrite tool (via a stable `dedupe_key`, so re-syncing the same todo list updates rows instead of duplicating them) or get added manually with `cctrack task add`. |
| `events` | An append-only raw log: every prompt, every tool call, every TodoWrite sync, session start/end. Nothing here is user-facing on its own, it's the source data the Analytics charts and the session timeline are computed from. |

How they relate: a **project** has many **sessions**; a session has many
**plans** and **tasks**; a plan has many **tasks**; a session has many
**events**. Deleting a session cascades to its plans, tasks and events.
Deleting a project just detaches its sessions (they aren't deleted).

## 5. The three keys you need

Three, no more. Put them all in `.env.local` (copy `.env.example` first).

| Key | What it's for | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Tells the app which Supabase project to talk to. | Supabase dashboard -> Settings -> API -> **Project URL**. |
| `SUPABASE_SECRET` | Server-side secret the app uses to read/write your tables. Bypasses Row Level Security, so it must never reach the browser (it doesn't, it's only read in server code). | Supabase dashboard -> Settings -> API -> the **service_role** key, shown as `sb_secret_...` on newer projects. (Older projects: `SUPABASE_SERVICE_ROLE_KEY` still works as a fallback name.) |
| `CC_TRACKER_API_KEY` | A shared secret between your local Claude Code hooks and this app's `/api/ingest/*` endpoints, so nothing else on your network can write fake sessions into your database. You invent this yourself, it's not issued by anything. | Generate any long random string. `openssl rand -hex 32` (Git Bash/macOS/Linux) or, in PowerShell: `$b=[byte[]]::new(32);(New-Object Security.Cryptography.RNGCryptoServiceProvider).GetBytes($b);($b\|ForEach-Object{$_.ToString('x2')}) -join ''` |

`.env*` is already in `.gitignore`, so these never get committed by accident.

## 6. Configure and run the app

```bash
cp .env.example .env.local   # fill in the three keys above
npm install
npm run dev                  # http://localhost:3000
```

Visit `http://localhost:3000/api/health`. Both `db_configured` and
`ingestion_key_configured` should read `true`. If either is `false`, the
`/setup` page in the app (see the route tour below) shows exactly which
value is missing and lets you paste it in.

## 7. Wire up Claude Code (so sessions get captured automatically)

```bash
node hooks/install.mjs --url http://localhost:3000 --key <your CC_TRACKER_API_KEY>
```

This writes `~/.cc-track/config.json` (used by the `cctrack` CLI to find
the app and authenticate) and prints a hooks block to merge into
`~/.claude/settings.json` (on Windows: `%USERPROFILE%\.claude\settings.json`).
It also smoke-tests the connection to the app for you.

The hooks cover `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `Stop`,
`StopFailure`, `SubagentStart`, `SubagentStop`, `Notification` and
`SessionEnd`. They run async and fail silently: a tracker hiccup can never
block or slow down Claude Code itself.

## 8. Enable the `cctrack` CLI (plans and tasks from the terminal)

```bash
npm link        # run inside the cc-track folder, exposes `cctrack` globally
```

Then, optionally, paste [`CLAUDE.md.snippet`](CLAUDE.md.snippet) into a
project's own `CLAUDE.md` so Claude itself creates a plan at the start of a
task and keeps task statuses current as it works, no manual bookkeeping.

## 9. Route by route tour

Once a session or two has been captured, open the app and walk the sidebar:

- **Overview** (`/`) - the daily-driver page. Totals across everything
  (sessions, plans, tasks, prompts, tokens, cost), a 30-day activity chart,
  your most recent sessions, active plans with progress bars, and open
  tasks. Start here to answer "what's going on right now."
- **Analytics** (`/analytics`) - the deeper, backward-looking view: tokens
  and cost per day, which tools you use most, task completion rate, which
  models you're spending on, how long sessions tend to run, and which
  hours of the day you actually prompt. Use this to spot patterns, not to
  check on a single session.
- **Projects** (`/projects`) - one card per working directory that's ever
  run Claude Code, with its session count, tokens and cost. Click into one
  for its own sessions, plans and tasks (`/projects/[id]`).
- **Plans** (`/plans`) - every plan, grouped Active / Completed /
  Abandoned, each with its task checklist and a progress bar. This is
  where `cctrack plan add` output lands.
- **Tasks** (`/tasks`) - every task across every project, filterable by
  project and status, newest first. Useful for "what's still pending
  anywhere."
- **Sessions** (`/sessions`) - a filterable table of every session
  (by project, model, time window). Click one for the detail view
  (`/sessions/[id]`): full tool-usage breakdown, the plans/tasks it
  touched, and a complete event timeline you can filter by event type or
  tool.
- **Setup** (`/setup`) - the in-app version of steps 3, 6, 7 and 8 above:
  live status of the three keys, the exact hooks JSON to paste, and the
  CLI commands, so you never need this file open once the app itself is
  running.

## 10. Troubleshooting

- **`/api/health` shows `false` for `db_configured`** - `.env.local` is
  missing `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SECRET`, or you didn't
  restart `npm run dev` after editing it.
- **`false` for `ingestion_key_configured`** - `CC_TRACKER_API_KEY` isn't
  set in `.env.local`.
- **Pages show "no data" after hooks are installed** - confirm the hooks
  block actually landed in `~/.claude/settings.json` and that a new Claude
  Code session was started *after* installing it (hooks only fire on
  events going forward).
- **Tables missing / "relation does not exist"** - rerun
  `supabase/schema.sql` in the SQL Editor, it's idempotent and safe to
  replay.

## Security notes (this is a single-user, localhost tool by design)

- All database access happens server-side with the secret key; RLS is on
  with zero policies, so even if the anon key ever leaked, it can't read
  anything.
- `/api/ingest/*` always requires the `x-api-key` header to match
  `CC_TRACKER_API_KEY`.
- There is no login screen and none is planned. If you ever expose this
  past `localhost`, put it behind a VPN or reverse-proxy auth yourself.
