-- ============================================================
-- CC-Track schema — run this in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
-- ============================================================

-- ---------- projects ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  path        text not null unique,          -- cwd where Claude Code runs
  repo        text,                          -- git remote origin url, if any
  created_at  timestamptz not null default now()
);

-- ---------- sessions ----------
-- PK is the Claude Code session_id (a UUID), so resume/continue
-- events upsert into the same row.
create table if not exists public.sessions (
  id                    uuid primary key,
  project_id            uuid references public.projects(id) on delete set null,
  cwd                   text,
  git_branch            text,
  model                 text,
  source                text,                -- startup | resume | clear
  title                 text,                -- first user prompt (trimmed)
  status                text not null default 'active'
                        check (status in ('active','ended')),
  started_at            timestamptz not null default now(),
  last_activity_at      timestamptz not null default now(),
  ended_at              timestamptz,         -- last Stop-hook timestamp
  prompt_count          int not null default 0,
  tool_use_count        int not null default 0,
  input_tokens          bigint not null default 0,
  output_tokens         bigint not null default 0,
  cache_read_tokens     bigint not null default 0,
  cache_creation_tokens bigint not null default 0,
  estimated_cost_usd    numeric(14,6) not null default 0,
  tool_breakdown        jsonb not null default '{}'::jsonb  -- {"Bash": 42, "Edit": 17}
);

create index if not exists sessions_project_idx  on public.sessions (project_id);
create index if not exists sessions_started_idx  on public.sessions (started_at desc);
create index if not exists sessions_activity_idx on public.sessions (last_activity_at desc);

-- ---------- plans ----------
create table if not exists public.plans (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references public.sessions(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null,
  description   text,
  status        text not null default 'active'
                check (status in ('active','completed','abandoned')),
  source        text not null default 'cli', -- cli | ui
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists plans_session_idx on public.plans (session_id);
create index if not exists plans_project_idx on public.plans (project_id);
create index if not exists plans_created_idx on public.plans (created_at desc);

-- ---------- tasks ----------
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid references public.plans(id) on delete set null,
  session_id   uuid references public.sessions(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,
  content      text not null,
  status       text not null default 'pending'
               check (status in ('pending','in_progress','completed')),
  source       text not null default 'cli',  -- todowrite | cli | ui
  dedupe_key   text unique,                  -- stable upsert key for TodoWrite sync
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_session_idx on public.tasks (session_id);
create index if not exists tasks_plan_idx    on public.tasks (plan_id);
create index if not exists tasks_project_idx on public.tasks (project_id);
create index if not exists tasks_created_idx on public.tasks (created_at desc);

-- Longer free-text detail, separate from the short `content` name.
-- Auto-filled from TodoWrite's activeForm; also settable via `cctrack task --description`.
alter table public.tasks add column if not exists description text;

-- ---------- events (raw workflow log) ----------
create table if not exists public.events (
  id         bigserial primary key,
  session_id uuid references public.sessions(id) on delete cascade,
  type       text not null,   -- session_start | prompt | tool_use | tasks_synced | session_end | note
  tool_name  text,
  data       jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_session_idx on public.events (session_id, created_at);
create index if not exists events_type_idx    on public.events (type, created_at desc);

-- ---------- security ----------
-- Single-user tool: the app talks to Supabase with the service-role key
-- (server-side only), which bypasses RLS. Keep RLS on so the anon key
-- can never read anything.
alter table public.projects enable row level security;
alter table public.sessions enable row level security;
alter table public.plans    enable row level security;
alter table public.tasks    enable row level security;
alter table public.events   enable row level security;

-- Persist Stop's last_assistant_message and StopFailure's error payload on the session row.
alter table public.sessions add column if not exists last_message text;
alter table public.sessions add column if not exists last_error   jsonb;

-- Pointer to the plan the session is currently working on. TodoWrite tasks and
-- CLI-created tasks inherit this when no explicit plan_id is given. `cctrack plan focus <id>`
-- sets it; `cctrack plan unfocus` clears.
alter table public.sessions add column if not exists active_plan_id uuid references public.plans(id) on delete set null;

-- ---------- task_runs (remote task attendance) ----------
-- One row per "Attend" click. The web app queues it; a `cctrack agent` running
-- on a machine that has the project cwd picks it up and runs `claude -p` there.
create table if not exists public.task_runs (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid references public.tasks(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,
  prompt            text not null,
  status            text not null default 'queued'
                    check (status in ('queued','claimed','running','done','error','cancelled')),
  agent_id          text,                                              -- which local agent picked it up
  claude_session_id uuid references public.sessions(id) on delete set null,
  stdout_tail       text,                                              -- last ~8KB, for the UI
  error             text,
  requested_at      timestamptz not null default now(),
  claimed_at        timestamptz,
  finished_at       timestamptz
);

create index if not exists task_runs_status_idx  on public.task_runs (status, requested_at);
create index if not exists task_runs_task_idx    on public.task_runs (task_id, requested_at desc);
create index if not exists task_runs_project_idx on public.task_runs (project_id, requested_at desc);

-- Raw OS exit code from the claude child process (null if spawning itself failed).
-- Surfaces 0xC0000142 (3221225794) and similar Windows NTSTATUS codes directly.
alter table public.task_runs add column if not exists exit_code integer;

-- Populated by the runner when it parses `claude -p --output-format json` output.
-- `total_cost_usd` is claude's own client-side estimate; `usage` holds the raw
-- per-model token breakdown ({input_tokens, output_tokens, cache_*}). Both null
-- when parsing failed (child crashed early, JSON malformed, etc).
alter table public.task_runs add column if not exists total_cost_usd numeric(14,6);
alter table public.task_runs add column if not exists usage jsonb;

-- Populated by the post-run verifier (Gap 2): after a successful primary run
-- the runner spawns a second cheap claude -p that reads the git diff and
-- returns {verdict, reason}. Null when the project is not a git repo, no
-- code changed, or the verifier itself failed. Task auto-completion is now
-- gated: only pass / null verdicts flip the task to completed.
alter table public.task_runs add column if not exists verdict text
  check (verdict in ('pass','fail','needs_review'));
alter table public.task_runs add column if not exists verdict_reason text;
alter table public.task_runs add column if not exists diff_summary jsonb;

-- Note on claude_session_id: originally references sessions(id), but the runner
-- writes the session UUID as soon as it arrives in the JSON output; the hooks
-- may not have inserted the sessions row yet. Drop the FK so writes never race.
alter table public.task_runs drop constraint if exists task_runs_claude_session_id_fkey;

-- Lineage: retry_on_fail / chain / followup create child rows that point back to
-- their parent. `trigger` records how the row got created. No CHECK constraint;
-- values used today are 'manual' | 'retry_on_fail' | 'chain' | 'followup'.
alter table public.task_runs add column if not exists parent_run_id uuid
  references public.task_runs(id) on delete set null;
alter table public.task_runs add column if not exists trigger text;
create index if not exists task_runs_parent_idx on public.task_runs (parent_run_id);

alter table public.task_runs enable row level security;

-- Realtime: let the browser (anon) subscribe to task_run updates so the Attend
-- button flips status the moment the local agent moves a row. Single-user
-- localhost app; anon reads are safe here (no PII, secrets stay in .env).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'task_runs'
  ) then
    alter publication supabase_realtime add table public.task_runs;
  end if;
end $$;

drop policy if exists task_runs_anon_read on public.task_runs;
create policy task_runs_anon_read on public.task_runs for select using (true);

-- ---------- cost/budget guards ----------
alter table public.projects add column if not exists per_run_budget_usd numeric(10,4);
alter table public.projects add column if not exists per_run_max_turns  int;

-- ---------- HITL approvals (Gap 6) ----------
-- One row per PreToolUse gate. The hitl.mjs hook inserts a `pending` row and
-- polls until the /hitl UI (or an API caller) flips it to approved/denied;
-- the hook exits 0 on approved, 2 on denied/timeout so claude blocks the call.
create table if not exists public.hitl_approvals (
  id           uuid primary key default gen_random_uuid(),
  task_run_id  uuid references public.task_runs(id) on delete set null,
  session_id   text,
  tool_name    text,
  tool_input   jsonb,
  status       text not null default 'pending'
               check (status in ('pending','approved','denied','timeout')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   text
);

create index if not exists hitl_approvals_status_idx  on public.hitl_approvals (status, created_at desc);
create index if not exists hitl_approvals_created_idx on public.hitl_approvals (created_at desc);

alter table public.hitl_approvals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'hitl_approvals'
  ) then
    alter publication supabase_realtime add table public.hitl_approvals;
  end if;
end $$;

drop policy if exists hitl_approvals_anon_read on public.hitl_approvals;
create policy hitl_approvals_anon_read on public.hitl_approvals for select using (true);

-- ---------- prompts (Gap 5) ----------
-- Immutable versioned prompt/template rows. A "new version" is a new row
-- with version = max(existing) + 1; rows are never updated in place. Left
-- unassociated to a project when project_id is null (a global library entry).
create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  kind        text not null default 'template'
              check (kind in ('system','template')),
  name        text not null,
  body        text not null,
  version     int not null default 1,
  created_at  timestamptz not null default now()
);

create index if not exists prompts_project_idx on public.prompts (project_id, name, version desc);
create index if not exists prompts_created_idx on public.prompts (created_at desc);

alter table public.prompts enable row level security;

-- allowed_tools (per-project --allowedTools allow-list) was added but never
-- had a setter (no UI, no action) -- dead end-to-end. Dropped; the
-- --allowedTools wiring in bin/agent.mts was removed alongside this.
alter table public.projects drop column if exists allowed_tools;

-- ---------- realtime: live-refresh for sessions/plans/tasks/projects ----------
-- Same pattern as task_runs above: publish + anon-read so the browser can
-- subscribe to writes and call router.refresh() (see components/live-refresh.tsx).
-- Single-user localhost app; anon reads are safe here (no PII, secrets stay in .env).
-- Daily spend per project (last 24 h, successful runs only). Used by the budget
-- guard in enqueueTaskRun and the PreToolUse hook.
create or replace view public.project_daily_spend as
select
  project_id,
  coalesce(sum(total_cost_usd), 0) as spend_usd
from public.task_runs
where
  status = 'done'
  and finished_at >= now() - interval '24 hours'
  and project_id is not null
group by project_id;

do $$
declare
  t text;
begin
  foreach t in array array['sessions', 'plans', 'tasks', 'projects', 'events'] loop
    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
    execute format('drop policy if exists %I_anon_read on public.%I', t, t);
    execute format('create policy %I_anon_read on public.%I for select using (true)', t, t);
  end loop;
end $$;
