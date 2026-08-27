import Link from "next/link";
import { SetupBanner, Card, Stat, Badge, Progress, PageHeader, Empty, TaskLine, LiveDot } from "@/components/ui";
import { ActivityChart } from "@/components/charts";
import {
  getStats,
  getAllSessions,
  getTasks,
  getPlans,
  getEventsSince,
  getProjects,
} from "@/lib/queries";
import { buildActivitySeries } from "@/lib/series";
import { fmtNum, fmtCost, fmtRelative, truncate } from "@/lib/format";
import { isLive } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const stats = await getStats();
  if (!stats) {
    return (
      <>
        <PageHeader title="Command Deck" sub="Every Claude Code session, plan and task in one place." />
        <SetupBanner />
      </>
    );
  }

  const [allSessionsFull, tasks, plans, projects, events30] = await Promise.all([
    getAllSessions(),
    getTasks(),
    getPlans(),
    getProjects(),
    getEventsSince(
      new Date(Date.now() - 30 * 86_400_000).toISOString(),
      ["prompt", "tool_use", "tasks_synced"]
    ),
  ]);

  const allSessions = allSessionsFull ?? [];
  const recent = [...allSessions]
    .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
    .slice(0, 8);
  const activity = buildActivitySeries(30, events30 ?? [], allSessions);
  const openTasks = (tasks ?? []).filter((t) => t.status !== "completed").slice(-12).reverse();
  const activePlans = (plans ?? []).filter((p) => p.status === "active").slice(0, 8);
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const liveCount = recent.filter(isLive).length;

  return (
    <>
      <PageHeader
        title="Command Deck"
        sub="What is running, what is done, what is next. Across every Claude Code session on this machine."
        right={
          liveCount > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-[0.75rem] text-muted">
              <LiveDot />
              <span className="font-mono tabular-nums text-foreground">{liveCount}</span> live now
            </span>
          ) : null
        }
      />

      {/* Stat rail */}
      <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        <Stat label="Sessions"   value={stats.sessions}                                sub={`${stats.activeSessions} active now`} />
        <Stat label="Projects"   value={stats.projects} />
        <Stat label="Plans"      value={stats.plans}                                   sub={`${stats.plansCompleted} completed`} />
        <Stat label="Tasks"      value={stats.tasks}                                   sub={`${stats.tasksCompleted} done  /  ${stats.tasksInProgress} running`} />
        <Stat label="Prompts"    value={fmtNum(stats.prompts)} />
        <Stat label="Tool calls" value={fmtNum(stats.toolUses)} />
        <Stat label="Tokens"     value={fmtNum(stats.totalTokens)}                    sub="in, out, cache" />
        <Stat label="Est. cost"  value={fmtCost(stats.totalCost)}     emphasis        sub="rough model pricing" />
      </div>

      {/* Activity spread */}
      <Card title="Activity, last 30 days" className="mb-8">
        {events30 && events30.length + recent.length > 0 ? (
          <ActivityChart data={activity} />
        ) : (
          <Empty>No activity yet. Install the Claude Code hooks (see Setup) and start a session.</Empty>
        )}
      </Card>

      {/* Two-lane deck */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions lane (2 cols wide) */}
        <div className="lg:col-span-2">
          <Card
            title="Recent sessions"
            right={
              <Link href="/sessions" className="text-[0.75rem] text-accent hover:underline underline-offset-4">
                all sessions
              </Link>
            }
          >
            {recent.length === 0 ? (
              <Empty>No sessions recorded yet.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-panel2/60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{truncate(s.title, 90)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                          <span>{s.project_id ? projectMap.get(s.project_id) ?? "project" : "no project"}</span>
                          {s.git_branch && <span className="font-mono">{s.git_branch}</span>}
                          <span className="font-mono tabular-nums">{fmtNum(s.prompt_count)} prompts</span>
                          <span className="font-mono tabular-nums text-foreground/80">{fmtCost(Number(s.estimated_cost_usd))}</span>
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isLive(s) ? (
                          <Badge color="green" glyph={<LiveDot className="h-1.5 w-1.5" />}>live</Badge>
                        ) : (
                          <span className="font-mono text-[0.6875rem] text-muted">{fmtRelative(s.last_activity_at)}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Plans + tasks lane */}
        <div className="space-y-6">
          <Card
            title="Active plans"
            right={
              <Link href="/plans" className="text-[0.75rem] text-accent hover:underline underline-offset-4">
                all plans
              </Link>
            }
          >
            {activePlans.length === 0 ? (
              <Empty>No active plans. Create one with <code className="font-mono">cctrack plan add</code>.</Empty>
            ) : (
              <ul className="divide-y divide-line">
                {activePlans.map((p) => {
                  const pTasks = (tasks ?? []).filter((t) => t.plan_id === p.id);
                  const done = pTasks.filter((t) => t.status === "completed").length;
                  return (
                    <li key={p.id} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm text-foreground">{truncate(p.title, 60)}</p>
                        <Link
                          href={p.session_id ? `/sessions/${p.session_id}` : "/plans"}
                          className="shrink-0 text-[0.6875rem] text-accent hover:underline underline-offset-4"
                        >
                          session
                        </Link>
                      </div>
                      {pTasks.length > 0 && (
                        <div className="mt-2">
                          <Progress done={done} total={pTasks.length} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card
            title="Open tasks"
            right={
              <Link href="/plans" className="text-[0.75rem] text-accent hover:underline underline-offset-4">
                all plans
              </Link>
            }
          >
            {openTasks.length === 0 ? (
              <Empty>No open tasks. TodoWrite lists sync automatically.</Empty>
            ) : (
              <ul className="space-y-2">
                {openTasks.map((t) => (
                  <TaskLine key={t.id} status={t.status} content={truncate(t.content, 70)} />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
