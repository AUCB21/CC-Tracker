import Link from "next/link";
import {
  SetupBanner,
  Card,
  Stat,
  Badge,
  Progress,
  PageHeader,
  Empty,
  LiveDot,
  CELL_STYLE,
} from "@/components/ui";
import { ActivityChart } from "@/components/charts-lazy";
import {
  getStats,
  getRecentSessions,
  getSessionStartsSince,
  getTasks,
  getPlans,
  getRecentActivityEventsCached,
  getProjects,
} from "@/lib/queries";
import { buildActivitySeries } from "@/lib/series";
import { fmtNum, fmtCost, fmtRelative, truncate, fmtProjectName } from "@/lib/format";
import { isLive } from "@/lib/types";

export const dynamic = "force-dynamic";

// Meta separator dot used between chips inside a cell's second line.
const DOT = (
  <span
    aria-hidden
    className="inline-block h-[0.1875rem] w-[0.1875rem] rounded-full"
    style={{ background: "var(--color-line-strong)" }}
  />
);

const CARD_ANIM = (delayMs: number) =>
  `rise var(--duration-enter) var(--ease-standard) ${delayMs}ms both`;

export default async function OverviewPage() {
  const stats = await getStats();
  if (!stats) {
    return (
      <>
        <PageHeader
          eyebrow="Command deck"
          title="Control Panel"
          sub="Every Claude Code session, plan and task in one place."
        />
        <SetupBanner />
      </>
    );
  }

  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [recentSessions, sessionStarts30, tasks, plans, projects, events30] = await Promise.all([
    getRecentSessions(8),
    getSessionStartsSince(since30),
    getTasks({ columns: "id,status,content,plan_id" }),
    getPlans({ columns: "id,status,title,session_id" }),
    getProjects(),
    getRecentActivityEventsCached(30, ["prompt", "tool_use", "tasks_synced"]),
  ]);

  const recent = recentSessions ?? [];
  const activity = buildActivitySeries(30, events30 ?? [], sessionStarts30 ?? []);
  const openTasks = (tasks ?? []).filter((t) => t.status !== "completed").slice(-12).reverse();
  const activePlans = (plans ?? []).filter((p) => p.status === "active").slice(0, 8);
  const projectMap = new Map((projects ?? []).map((p) => [p.id, fmtProjectName(p.name, p.path)]));
  const liveCount = recent.filter(isLive).length;

  return (
    <>
      <PageHeader
        eyebrow="Command deck"
        title="Control Panel"
        sub="What is running, what is done, what is next. Across every Claude Code session on this machine."
        right={
          liveCount > 0 ? (
            <span
              className="inline-flex items-center gap-2 rounded-full px-3.5 py-2"
              style={{
                border: "0.0625rem solid oklch(0.44 0.082 40 / 0.6)",
                background: "linear-gradient(180deg, oklch(0.32 0.062 38 / 0.35), transparent)",
                fontSize: "0.8125rem",
                color: "var(--color-muted-2)",
              }}
            >
              <LiveDot />
              <span className="font-mono tabular-nums" style={{ color: "var(--color-foreground)" }}>
                {liveCount}
              </span>
              <span>active session{liveCount === 1 ? "" : "s"}</span>
            </span>
          ) : null
        }
      />

      {/* Stat rail */}
      <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8">
        {[
          { label: "Sessions",   value: stats.sessions,               href: "/sessions",  sub: `${stats.activeSessions} active now` },
          { label: "Projects",   value: stats.projects,               href: "/projects",  sub: "tracked directories" },
          { label: "Plans",      value: stats.plans,                  href: "/plans",     sub: `${stats.plansCompleted} completed` },
          { label: "Tasks",      value: stats.tasks,                  href: "/tasks",     sub: `${stats.tasksCompleted} done / ${stats.tasksInProgress} running` },
          { label: "Prompts",    value: fmtNum(stats.prompts),        href: "/analytics", sub: "hook-captured" },
          { label: "Tool calls", value: fmtNum(stats.toolUses),       href: "/analytics", sub: "across all sessions" },
          { label: "Tokens",     value: fmtNum(stats.totalTokens),    href: "/analytics", sub: "in, out, cache" },
          { label: "Est. cost",  value: fmtCost(stats.totalCost),     href: "/analytics", sub: "rough model pricing", emphasis: true },
        ].map((s, i) => (
          <div key={s.label} style={{ animation: CARD_ANIM(40 + i * 40) }}>
            <Stat {...s} />
          </div>
        ))}
      </div>

      {/* Activity spread */}
      <div style={{ animation: CARD_ANIM(360) }}>
        <Card title="Activity, last 30 days" className="mb-8">
          {events30 && events30.length + recent.length > 0 ? (
            <ActivityChart data={activity} />
          ) : (
            <Empty>No activity yet. Install the Claude Code hooks (see Setup) and start a session.</Empty>
          )}
        </Card>
      </div>

      {/* Two-lane deck */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions lane (2 cols wide) */}
        <div className="min-w-0 lg:col-span-2" style={{ animation: CARD_ANIM(420) }}>
          <Card
            title="Recent sessions"
            right={
              <Link
                href="/sessions"
                className="inline-flex items-center gap-1 text-accent transition-transform hover:translate-x-0.5 hover:underline underline-offset-4"
                style={{ fontSize: "0.75rem" }}
              >
                all sessions <span aria-hidden>→</span>
              </Link>
            }
          >
            {recent.length === 0 ? (
              <Empty>No sessions recorded yet.</Empty>
            ) : (
              <ul className="flex flex-col gap-2 py-1">
                {recent.map((s) => (
                  <li key={s.id} style={CELL_STYLE}>
                    <Link
                      href={`/sessions/${s.id}`}
                      className="group relative flex items-start gap-4 px-4 py-3.5 transition-all hover:-translate-y-[0.0625rem]"
                      style={{ ["--reveal" as string]: 0 } as React.CSSProperties}
                    >
                      <span
                        aria-hidden
                        className="pointer-events-none absolute left-0 top-1.5 bottom-1.5 rounded-full transition-opacity group-hover:opacity-100"
                        style={{
                          width: "0.125rem",
                          background: "var(--color-accent-500)",
                          opacity: 0,
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.9375rem]" style={{ color: "var(--color-foreground)" }}>
                          {truncate(s.title, 90)}
                        </p>
                        <p
                          className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
                          style={{ fontSize: "0.6875rem", color: "var(--color-muted-2)" }}
                        >
                          <span>{s.project_id ? projectMap.get(s.project_id) ?? "project" : "no project"}</span>
                          {s.git_branch && (<>{DOT}<span className="font-mono">{s.git_branch}</span></>)}
                          {DOT}
                          <span className="font-mono tabular-nums">{fmtNum(s.prompt_count)} prompts</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className="font-mono tabular-nums"
                          style={{ fontSize: "0.8125rem", color: "var(--color-muted)" }}
                        >
                          {fmtCost(Number(s.estimated_cost_usd))}
                        </span>
                        {isLive(s) ? (
                          <Badge color="green" glyph={<LiveDot className="h-1.5 w-1.5" />}>live</Badge>
                        ) : (
                          <span className="font-mono" style={{ fontSize: "0.6875rem", color: "var(--color-muted-3)" }}>
                            {fmtRelative(s.last_activity_at)}
                          </span>
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
        <div className="min-w-0 space-y-6">
          <div style={{ animation: CARD_ANIM(480) }}>
            <Card
              title="Active plans"
              right={
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-1 text-accent transition-transform hover:translate-x-0.5 hover:underline underline-offset-4"
                  style={{ fontSize: "0.75rem" }}
                >
                  all plans <span aria-hidden>→</span>
                </Link>
              }
            >
              {activePlans.length === 0 ? (
                <Empty>No active plans. Create one with <code className="font-mono">cctrack plan add</code>.</Empty>
              ) : (
                <ul className="flex flex-col gap-2 py-1">
                  {activePlans.map((p, i) => {
                    const pTasks = (tasks ?? []).filter((t) => t.plan_id === p.id);
                    const done = pTasks.filter((t) => t.status === "completed").length;
                    return (
                      <li key={p.id} style={CELL_STYLE}>
                        <div className="px-4 py-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="min-w-0 flex-1 truncate text-[0.9375rem]" style={{ color: "var(--color-foreground)" }}>
                              {truncate(p.title, 60)}
                            </p>
                            <Link
                              href={p.session_id ? `/sessions/${p.session_id}` : "/plans"}
                              className="shrink-0 text-accent hover:underline underline-offset-4"
                              style={{ fontSize: "0.6875rem" }}
                            >
                              session
                            </Link>
                          </div>
                          {pTasks.length > 0 && (
                            <div className="mt-3">
                              <Progress done={done} total={pTasks.length} delayMs={500 + i * 90} />
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div style={{ animation: CARD_ANIM(540) }}>
            <Card
              title="Open tasks"
              right={
                <Link
                  href="/tasks"
                  className="inline-flex items-center gap-1 text-accent transition-transform hover:translate-x-0.5 hover:underline underline-offset-4"
                  style={{ fontSize: "0.75rem" }}
                >
                  all tasks <span aria-hidden>→</span>
                </Link>
              }
            >
              {openTasks.length === 0 ? (
                <Empty>No open tasks. TodoWrite lists sync automatically.</Empty>
              ) : (
                <ul className="flex flex-col gap-1.5 py-1">
                  {openTasks.map((t) => {
                    const spec = {
                      completed: { glyph: "✓", tone: "text-[color:var(--color-green)]" },
                      in_progress: { glyph: "▶", tone: "text-[color:var(--color-yellow)]" },
                      pending: { glyph: "○", tone: "text-muted" },
                    }[t.status];
                    return (
                      <li key={t.id} style={{ ...CELL_STYLE, borderRadius: "0.625rem" }}>
                        <div className="flex items-start gap-2 px-3.5 py-2.5 text-sm">
                          <span className={`mt-0.5 inline-flex w-4 shrink-0 justify-center ${spec.tone}`}>
                            {spec.glyph}
                          </span>
                          <span
                            className={`min-w-0 flex-1 break-words ${
                              t.status === "completed"
                                ? "text-muted line-through decoration-[color:var(--color-line-strong)]"
                                : "text-foreground"
                            }`}
                          >
                            {truncate(t.content, 70)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
