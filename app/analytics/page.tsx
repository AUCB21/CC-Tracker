import { SetupBanner, Card, Stat, PageHeader, Empty } from "@/components/ui";
import {
  ActivityChart,
  ToolUsageChart,
  TokenCostChart,
  DonutChart,
  SimpleBarChart,
} from "@/components/charts";
import { getStats, getAllSessions, getTasks, getRecentActivityEventsCached } from "@/lib/queries";
import {
  buildActivitySeries,
  buildTokenCostSeries,
  aggregateTools,
  taskStatusBreakdown,
  modelBreakdown,
  sessionDurationBuckets,
  hourlyActivity,
} from "@/lib/series";
import { fmtCost } from "@/lib/format";

export const dynamic = "force-dynamic";

const DAYS = 30;

export default async function AnalyticsPage() {
  const [stats, sessions, tasks, events] = await Promise.all([
    getStats(),
    getAllSessions(),
    getTasks({ columns: "status" }),
    getRecentActivityEventsCached(DAYS, ["prompt", "tool_use", "tasks_synced"]),
  ]);

  if (!stats) {
    return (
      <>
        <PageHeader title="Analytics" sub="Workflow analysis across all sessions." />
        <SetupBanner />
      </>
    );
  }

  const all = sessions ?? [];
  const activity = buildActivitySeries(DAYS, events ?? [], all);
  const tokenCost = buildTokenCostSeries(DAYS, all);
  const tools = aggregateTools(all).slice(0, 12);
  const taskStatus = taskStatusBreakdown(tasks ?? []);
  const models = modelBreakdown(all);
  const durations = sessionDurationBuckets(all);
  const hourly = hourlyActivity((events ?? []).filter((e) => e.type === "prompt"));

  // Compute both terms from the same `all` snapshot: mixing stats.totalTokens
  // (unstable_cache 15s) with a live cache_read sum drifts and can push the
  // ratio past 100% between a hook write and the next cache revalidation.
  const tokenTotals = all.reduce(
    (a, s) => {
      a.cacheRead += s.cache_read_tokens;
      a.total += s.input_tokens + s.output_tokens + s.cache_read_tokens + s.cache_creation_tokens;
      return a;
    },
    { cacheRead: 0, total: 0 },
  );
  const cachePct = tokenTotals.total > 0
    ? Math.round((tokenTotals.cacheRead / tokenTotals.total) * 100)
    : 0;
  const avgPrompts = all.length ? (stats.prompts / all.length).toFixed(1) : "0";
  const completion = stats.tasks > 0 ? Math.round((stats.tasksCompleted / stats.tasks) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Analytics"
        sub={`Workflow patterns across the last ${DAYS} days unless noted otherwise.`}
      />

      <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Avg prompts / session" value={avgPrompts} />
        <Stat label="Task completion" value={`${completion}%`} sub={`${stats.tasksCompleted} of ${stats.tasks}`} />
        <Stat label="Cache hit share" value={`${cachePct}%`} sub="of all tokens" />
        <Stat label="Cost / session" value={fmtCost(all.length ? stats.totalCost / all.length : 0)} sub="average" emphasis />
      </div>

      {all.length === 0 ? (
        <Empty>Track a few sessions and the charts fill in.</Empty>
      ) : (
        <div className="space-y-6">
          <Card title="Activity">
            <ActivityChart data={activity} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Tokens and estimated cost per day">
              <TokenCostChart data={tokenCost} />
            </Card>
            <Card title="Tool usage, all time">
              {tools.length === 0 ? <Empty>No tool calls yet.</Empty> : <ToolUsageChart data={tools} />}
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Task status, all time">
              {taskStatus.length === 0 ? <Empty>No tasks yet.</Empty> : <DonutChart data={taskStatus} />}
            </Card>
            <Card title="Sessions by model">
              {models.length === 0 ? <Empty>No model data yet.</Empty> : <DonutChart data={models} />}
            </Card>
            <Card title="Session durations">
              <SimpleBarChart data={durations} xKey="bucket" yKey="count" />
            </Card>
          </div>

          <Card title="When you prompt, hour of day">
            <SimpleBarChart data={hourly} xKey="hour" yKey="count" height={200} />
          </Card>
        </div>
      )}
    </>
  );
}
