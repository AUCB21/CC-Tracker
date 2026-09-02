import Link from "next/link";
import { SetupBanner, Card, Stat, Badge, PageHeader, Empty, Progress, TaskLine, LiveDot } from "@/components/ui";
import { ToolUsageChart } from "@/components/charts";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { LiveTimeline } from "@/components/live-timeline";
import { getSession, getProject, getPlans, getTasks, getEvents } from "@/lib/queries";
import { fmtNum, fmtCost, fmtDate, fmtDuration, fmtRelative, truncate, toList } from "@/lib/format";
import { isLive } from "@/lib/types";

export const dynamic = "force-dynamic";

const EVENT_TYPE_LABEL: Record<string, string> = {
  prompt: "Prompt",
  tool_use: "Tool call",
  tasks_synced: "TodoWrite sync",
  session_start: "Session start",
  session_end: "Session end",
  subagent_dispatch: "Subagent dispatched",
  subagent_kill: "Subagent killed",
  subagent_poll: "Subagent polled",
};

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Search;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const typeFilter = toList(sp.type);
  const toolFilter = toList(sp.tool);

  const [session, plans, tasks, events, allEvents] = await Promise.all([
    getSession(id),
    getPlans({ sessionId: id }),
    getTasks({ sessionId: id }),
    getEvents(id, {
      types: typeFilter.length > 0 ? typeFilter : undefined,
      toolNames: toolFilter.length > 0 ? toolFilter : undefined,
    }),
    // Unfiltered slice for the facet option counts (limited so we do not pull
    // the entire event log on huge sessions):
    getEvents(id, { limit: 500 }),
  ]);

  if (!session) {
    if (!plans) {
      return (
        <>
          <PageHeader title="Session" />
          <SetupBanner />
        </>
      );
    }
    return (
      <>
        <PageHeader title="Session" />
        <Empty>Session not found.</Empty>
      </>
    );
  }

  const project = session.project_id ? await getProject(session.project_id) : null;
  const tokens =
    session.input_tokens + session.output_tokens + session.cache_read_tokens + session.cache_creation_tokens;
  const toolData = Object.entries(session.tool_breakdown ?? {})
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const doneTasks = (tasks ?? []).filter((t) => t.status === "completed").length;

  // Facet options from the unfiltered slice
  const typeCounts = new Map<string, number>();
  const toolCounts = new Map<string, number>();
  for (const e of allEvents ?? []) {
    typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
    if (e.type === "tool_use" && e.tool_name) {
      toolCounts.set(e.tool_name, (toolCounts.get(e.tool_name) ?? 0) + 1);
    }
  }

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "type",
      label: "Event type",
      options: Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({
          value,
          label: EVENT_TYPE_LABEL[value] ?? value,
          count,
        })),
    },
    {
      kind: "checkbox",
      key: "tool",
      label: "Tool",
      options: Array.from(toolCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, label: value, count })),
    },
  ];

  return (
    <>
      <PageHeader
        title={truncate(session.title, 90)}
        sub={`${session.id.slice(0, 8)}  ${fmtDate(session.started_at)}  duration ${fmtDuration(session.started_at, session.ended_at)}${session.model ? `  ${session.model}` : ""}`}
        right={
          isLive(session) ? (
            <Badge color="green" glyph={<LiveDot className="h-1.5 w-1.5" />}>live</Badge>
          ) : (
            <Badge color="muted">last activity {fmtRelative(session.last_activity_at)}</Badge>
          )
        }
      />

      <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-5">
        <Stat
          label="Project"
          value={
            <span className="text-xl">
              {project ? (
                <Link className="text-accent hover:underline" href={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              ) : (
                "no project"
              )}
            </span>
          }
          sub={session.git_branch ?? undefined}
        />
        <Stat label="Prompts"    value={session.prompt_count} />
        <Stat label="Tool calls" value={fmtNum(session.tool_use_count)} />
        <Stat label="Tokens"     value={fmtNum(tokens)} sub={`out ${fmtNum(session.output_tokens)}, cache ${fmtNum(session.cache_read_tokens)}`} />
        <Stat label="Est. cost"  value={fmtCost(Number(session.estimated_cost_usd))} emphasis />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card title="Plans">
          {(plans ?? []).length === 0 ? (
            <Empty>No plans for this session.</Empty>
          ) : (
            <div className="space-y-3">
              {(plans ?? []).map((p) => {
                const pTasks = (tasks ?? []).filter((t) => t.plan_id === p.id);
                const done = pTasks.filter((t) => t.status === "completed").length;
                return (
                  <div key={p.id} className="rounded-lg border border-line bg-panel2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{p.title}</p>
                      <Badge
                        color={p.status === "completed" ? "green" : p.status === "abandoned" ? "muted" : "yellow"}
                      >
                        {p.status}
                      </Badge>
                    </div>
                    {pTasks.length > 0 && (
                      <div className="mt-3">
                        <Progress done={done} total={pTasks.length} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="Tasks">
          {(tasks ?? []).length === 0 ? (
            <Empty>No tasks yet. TodoWrite lists sync automatically.</Empty>
          ) : (
            <>
              <div className="mb-4"><Progress done={doneTasks} total={tasks!.length} /></div>
              <ul className="space-y-2">
                {tasks!.map((t) => (
                  <TaskLine key={t.id} status={t.status} content={t.content} />
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(15rem,18vw,20rem)]">
        <div className="min-w-0 grid gap-6 lg:grid-cols-2 xl:grid-cols-2">
          <Card title="Tool usage">
            {toolData.length === 0 ? <Empty>No tool calls recorded.</Empty> : <ToolUsageChart data={toolData} />}
          </Card>

          <LiveTimeline
            sessionId={session.id}
            sessionEnded={session.status === "ended"}
            initialEvents={events ?? []}
            filters={{ type: typeFilter, tool: toolFilter }}
          />

          {/* Mobile / tablet drawer for filters */}
          <div className="lg:col-span-2 xl:hidden">
            <FilterRail facets={facets} variant="drawer" />
          </div>
        </div>

        <FilterRail
          facets={facets}
          className="hidden xl:sticky xl:top-16 xl:block xl:self-start"
        />
      </div>
    </>
  );
}
