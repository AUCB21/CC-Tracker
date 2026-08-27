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
