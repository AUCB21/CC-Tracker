import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabase } from "./supabase";
import type { Project, Session, Plan, Task, EventRow, TaskRun } from "./types";

export type Stats = {
  sessions: number;
  activeSessions: number;
  projects: number;
  plans: number;
  plansCompleted: number;
  tasks: number;
  tasksCompleted: number;
  tasksInProgress: number;
  prompts: number;
  toolUses: number;
  totalTokens: number;
  totalCost: number;
};

async function computeStats(): Promise<Stats | null> {
  const db = getSupabase();
  if (!db) return null;
  const [sessions, projects, plans, tasks] = await Promise.all([
    db.from("sessions").select("id,status,last_activity_at,prompt_count,tool_use_count,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,estimated_cost_usd"),
    db.from("projects").select("id", { count: "exact", head: true }),
    db.from("plans").select("status"),
    db.from("tasks").select("status"),
  ]);
  const s = (sessions.data ?? []) as Pick<
    Session,
    | "id" | "status" | "last_activity_at" | "prompt_count" | "tool_use_count"
    | "input_tokens" | "output_tokens" | "cache_read_tokens"
    | "cache_creation_tokens" | "estimated_cost_usd"
  >[];
  const planRows = (plans.data ?? []) as { status: string }[];
  const taskRows = (tasks.data ?? []) as { status: string }[];
  return {
    sessions: s.length,
    activeSessions: s.filter(
      (x) => x.status === "active" && Date.now() - new Date(x.last_activity_at).getTime() < 30 * 60_000
    ).length,
    projects: projects.count ?? 0,
    plans: planRows.length,
    plansCompleted: planRows.filter((p) => p.status === "completed").length,
    tasks: taskRows.length,
    tasksCompleted: taskRows.filter((t) => t.status === "completed").length,
    tasksInProgress: taskRows.filter((t) => t.status === "in_progress").length,
    prompts: s.reduce((a, x) => a + x.prompt_count, 0),
    toolUses: s.reduce((a, x) => a + x.tool_use_count, 0),
    totalTokens: s.reduce(
      (a, x) => a + x.input_tokens + x.output_tokens + x.cache_read_tokens + x.cache_creation_tokens,
      0
    ),
    totalCost: s.reduce((a, x) => a + Number(x.estimated_cost_usd), 0),
  };
}

/* Cached wrapper: dedupes stats across navigations within a 15s window even
   with dynamic="force-dynamic" pages. Freshness gap is fine for a
   retrospective dashboard; new hook events surface within 15s of arrival. */
export const getStats: () => Promise<Stats | null> = unstable_cache(
  computeStats,
  ["cc-track:stats:v1"],
  { revalidate: 15, tags: ["stats"] },
);

export async function getProjects(): Promise<Project[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("projects").select("*").order("created_at", { ascending: false });
  return (data as Project[]) ?? [];
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("projects").select("*").eq("id", id).maybeSingle();
  return (data as Project) ?? null;
}

export async function getSessions(
  opts: {
    projectId?: string;
    projectIds?: string[];
    models?: string[];
    sinceIso?: string;
    limit?: number;
  } = {},
): Promise<Session[] | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("sessions").select("*").order("last_activity_at", { ascending: false });
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.projectIds && opts.projectIds.length > 0) q = q.in("project_id", opts.projectIds);
  if (opts.models && opts.models.length > 0) q = q.in("model", opts.models);
  if (opts.sinceIso) q = q.gte("started_at", opts.sinceIso);
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return (data as Session[]) ?? [];
}

export async function getSession(id: string): Promise<Session | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.from("sessions").select("*").eq("id", id).maybeSingle();
  return (data as Session) ?? null;
}

export async function getPlans(opts: { projectId?: string; sessionId?: string; columns?: string } = {}): Promise<Plan[] | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("plans").select(opts.columns ?? "*").order("created_at", { ascending: false });
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.sessionId) q = q.eq("session_id", opts.sessionId);
  const { data } = await q;
  return (data as unknown as Plan[]) ?? [];
}

export async function getTasks(
  opts: { projectId?: string; projectIds?: string[]; sessionId?: string; planId?: string; columns?: string } = {},
): Promise<Task[] | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("tasks").select(opts.columns ?? "*").order("created_at", { ascending: true });
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  if (opts.projectIds && opts.projectIds.length > 0) q = q.in("project_id", opts.projectIds);
  if (opts.sessionId) q = q.eq("session_id", opts.sessionId);
  if (opts.planId) q = q.eq("plan_id", opts.planId);
  const { data } = await q;
  return (data as unknown as Task[]) ?? [];
}

export async function getEvents(
  sessionId: string,
  opts: { limit?: number; types?: string[]; toolNames?: string[] } = {},
): Promise<EventRow[] | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db
    .from("events")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.types && opts.types.length > 0) q = q.in("type", opts.types);
  if (opts.toolNames && opts.toolNames.length > 0) q = q.in("tool_name", opts.toolNames);
  const { data } = await q;
  return (data as EventRow[]) ?? [];
}

/** Exact total event count for a session (independent of any type/tool filter). */
export async function getEventCount(sessionId: string): Promise<number> {
  const db = getSupabase();
  if (!db) return 0;
  const { count } = await db
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);
  return count ?? 0;
}

export async function getEventsSince(
  sinceIso: string,
  types?: string[],
  limit = 20000
): Promise<EventRow[] | null> {
  const db = getSupabase();
  if (!db) return null;
  // Supabase caps responses at 1000 rows and silently ignores larger .limit()
  // values, so paginate via keyset (id > lastId) until we've drained the range
  // or reached the caller's cap. events.id is a bigserial → monotonic increasing.
  const PAGE = 1000;
  const all: EventRow[] = [];
  let lastId = 0;
  while (all.length < limit) {
    let q = db
      .from("events")
      .select("id,type,tool_name,created_at")
      .gte("created_at", sinceIso)
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(Math.min(PAGE, limit - all.length));
    if (types?.length) q = q.in("type", types);
    const { data } = await q;
    if (!data || data.length === 0) break;
    all.push(...(data as EventRow[]));
    if (data.length < PAGE) break;
    lastId = Number((data[data.length - 1] as EventRow).id);
  }
  return all;
}

/**
 * Cached activity-window helper. `days` and `types` form the cache key;
 * the internal sinceIso is derived from `days` on cache miss so we don't
 * bust the cache every wallclock tick. 15s revalidate matches getStats.
 */
async function fetchRecentActivityEvents(
  days: number,
  types: string[],
): Promise<EventRow[] | null> {
  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();
  return getEventsSince(sinceIso, types.length > 0 ? types : undefined);
}
export const getRecentActivityEventsCached: (
  days: number,
  types: string[],
) => Promise<EventRow[] | null> = unstable_cache(
  (days: number, types: string[]) => fetchRecentActivityEvents(days, types),
  ["cc-track:recent-activity-events:v1"],
  { revalidate: 15, tags: ["events"] },
);

// ponytail: only Analytics still needs the full session set; narrow the
// projection to what the aggregators actually touch so we don't ship the
// title / cwd / git_branch / snapshots columns nothing on the chart uses.
const ANALYTICS_SESSION_COLS =
  "id,model,started_at,ended_at,input_tokens,output_tokens,cache_read_tokens,cache_creation_tokens,estimated_cost_usd,tool_breakdown";

export async function getAllSessions(): Promise<Session[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db
    .from("sessions")
    .select(ANALYTICS_SESSION_COLS)
    .order("started_at", { ascending: true });
  return (data as unknown as Session[]) ?? [];
}

/**
 * Recent sessions for dashboards - full row, most-recent activity first,
 * capped so we never pull the whole table to render a "recent 8" list.
 * 15s cache matches getStats so a rapid Overview reload doesn't re-hit
 * Supabase for the same row set.
 */
async function fetchRecentSessions(limit: number): Promise<Session[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db
    .from("sessions")
    .select("*")
    .order("last_activity_at", { ascending: false })
    .limit(limit);
  return (data as Session[]) ?? [];
}
export const getRecentSessions: (limit?: number) => Promise<Session[] | null> = unstable_cache(
  (limit = 8) => fetchRecentSessions(limit),
  ["cc-track:recent-sessions:v1"],
  { revalidate: 15, tags: ["sessions"] },
);

/**
 * Ultra-lightweight sessions projection for the activity chart. Returns only
 * started_at so buildActivitySeries can bucket per day without pulling jsonb
 * columns (tool_breakdown, todos_snapshot) or token counters.
 */
async function fetchSessionStartsSince(
  sinceIso: string,
): Promise<{ started_at: string }[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db
    .from("sessions")
    .select("started_at")
    .gte("started_at", sinceIso);
  return (data as { started_at: string }[]) ?? [];
}
export const getSessionStartsSince: (sinceIso: string) => Promise<{ started_at: string }[] | null> =
  unstable_cache(
    (sinceIso: string) => fetchSessionStartsSince(sinceIso),
    ["cc-track:session-starts-since:v1"],
    { revalidate: 15, tags: ["sessions"] },
  );

export type Page<T> = { rows: T[]; total: number };

// ponytail: a `page` past the real last page makes PostgREST 416, which
// supabase-js surfaces as count:null (-> 0 here) instead of the true total.
// Harmless: rows correctly come back empty, and the UI's own Pager never
// links past the last real page, so this only shows for a hand-edited URL.
function rangeFor(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export async function getSessionsPage(opts: {
  page: number;
  pageSize: number;
  projectIds?: string[];
  models?: string[];
  sinceIso?: string;
}): Promise<Page<Session> | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db
    .from("sessions")
    .select("*", { count: "exact" })
    .order("last_activity_at", { ascending: false });
  if (opts.projectIds && opts.projectIds.length > 0) q = q.in("project_id", opts.projectIds);
  if (opts.models && opts.models.length > 0) q = q.in("model", opts.models);
  if (opts.sinceIso) q = q.gte("started_at", opts.sinceIso);
  const { data, count } = await q.range(...rangeFor(opts.page, opts.pageSize));
  return { rows: (data as Session[]) ?? [], total: count ?? 0 };
}

async function fetchSessionFacetRows(): Promise<Pick<Session, "project_id" | "model">[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db.from("sessions").select("project_id,model");
  return (data as Pick<Session, "project_id" | "model">[]) ?? [];
}
export const getSessionFacetRows: () => Promise<Pick<Session, "project_id" | "model">[]> = unstable_cache(
  fetchSessionFacetRows,
  ["cc-track:session-facet-rows:v1"],
  { revalidate: 15, tags: ["sessions"] },
);

export async function getTasksPage(opts: {
  page: number;
  pageSize: number;
  projectIds?: string[];
  statuses?: string[];
}): Promise<Page<Task> | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("tasks").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.projectIds && opts.projectIds.length > 0) q = q.in("project_id", opts.projectIds);
  if (opts.statuses && opts.statuses.length > 0) q = q.in("status", opts.statuses);
  const { data, count } = await q.range(...rangeFor(opts.page, opts.pageSize));
  return { rows: (data as Task[]) ?? [], total: count ?? 0 };
}

async function fetchTaskFacetRows(): Promise<Pick<Task, "project_id" | "status">[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db.from("tasks").select("project_id,status");
  return (data as Pick<Task, "project_id" | "status">[]) ?? [];
}
export const getTaskFacetRows: () => Promise<Pick<Task, "project_id" | "status">[]> = unstable_cache(
  fetchTaskFacetRows,
  ["cc-track:task-facet-rows:v1"],
  { revalidate: 15, tags: ["tasks"] },
);

export async function getPlansPage(opts: {
  page: number;
  pageSize: number;
  projectIds?: string[];
  statuses?: string[];
}): Promise<Page<Plan> | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("plans").select("*", { count: "exact" }).order("created_at", { ascending: false });
  if (opts.projectIds && opts.projectIds.length > 0) q = q.in("project_id", opts.projectIds);
  if (opts.statuses && opts.statuses.length > 0) q = q.in("status", opts.statuses);
  const { data, count } = await q.range(...rangeFor(opts.page, opts.pageSize));
  return { rows: (data as Plan[]) ?? [], total: count ?? 0 };
}

async function fetchPlanFacetRows(): Promise<Pick<Plan, "project_id" | "status">[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db.from("plans").select("project_id,status");
  return (data as Pick<Plan, "project_id" | "status">[]) ?? [];
}
export const getPlanFacetRows: () => Promise<Pick<Plan, "project_id" | "status">[]> = unstable_cache(
  fetchPlanFacetRows,
  ["cc-track:plan-facet-rows:v1"],
  { revalidate: 15, tags: ["plans"] },
);

export async function getProjectsPage(opts: {
  page: number;
  pageSize: number;
}): Promise<Page<Project> | null> {
  const db = getSupabase();
  if (!db) return null;
  const { data, count } = await db
    .from("projects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(...rangeFor(opts.page, opts.pageSize));
  return { rows: (data as Project[]) ?? [], total: count ?? 0 };
}

export async function getRecentTaskRuns(opts: {
  projectId?: string;
  limit?: number;
} = {}): Promise<TaskRun[] | null> {
  const db = getSupabase();
  if (!db) return null;
  let q = db.from("task_runs").select("*").order("requested_at", { ascending: false }).limit(opts.limit ?? 50);
  if (opts.projectId) q = q.eq("project_id", opts.projectId);
  const { data } = await q;
  return (data as TaskRun[]) ?? [];
}

export async function getRecentActiveEvents(opts: {
  sessionId?: string;
  limit?: number;
} = {}): Promise<EventRow[] | null> {
  const db = getSupabase();
  if (!db) return null;
  const since = new Date(Date.now() - 30 * 60_000).toISOString();
  let q = db
    .from("events")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.sessionId) q = q.eq("session_id", opts.sessionId);
  const { data } = await q;
  return (data as EventRow[]) ?? [];
}

export async function getProjectDailySpend(projectIds: string[]): Promise<Map<string, number>> {
  const db = getSupabase();
  if (!db || projectIds.length === 0) return new Map();
  const { data } = await db
    .from("project_daily_spend")
    .select("project_id,spend_usd")
    .in("project_id", projectIds);
  return new Map(
    ((data ?? []) as { project_id: string; spend_usd: number }[]).map((r) => [r.project_id, Number(r.spend_usd)])
  );
}
