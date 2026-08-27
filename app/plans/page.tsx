import Link from "next/link";
import { SetupBanner, Card, Badge, PageHeader, Empty, Progress, TaskLine } from "@/components/ui";
import { getPlans, getTasks, getProjects } from "@/lib/queries";
import { fmtDate, truncate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const [plans, tasks, projects] = await Promise.all([getPlans(), getTasks(), getProjects()]);
  if (!plans) {
    return (
      <>
        <PageHeader title="Plans" sub="Plans that you or Claude create with cctrack, and their tasks." />
        <SetupBanner />
      </>
    );
  }

  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const grouped = {
    Active:    plans.filter((p) => p.status === "active"),
    Completed: plans.filter((p) => p.status === "completed"),
    Abandoned: plans.filter((p) => p.status === "abandoned"),
  };
  const unassigned = (tasks ?? []).filter((t) => !t.plan_id);

  return (
    <>
      <PageHeader
        title="Plans"
        sub="Plans that you or Claude create with cctrack, and their tasks."
        right={
          <code className="rounded-md border border-line bg-panel2 px-3 py-1.5 font-mono text-[0.6875rem] text-muted">
            cctrack plan add --title &quot;...&quot;
          </code>
        }
      />

      {plans.length === 0 ? (
        <Empty>
          No plans yet. From inside a Claude Code session run{" "}
          <code className="font-mono">cctrack plan add --title &quot;Refactor auth&quot;</code>.
        </Empty>
      ) : (
        <div className="space-y-10">
          {Object.entries(grouped).map(([group, list]) =>
            list.length === 0 ? null : (
              <section key={group}>
                <h2 className="mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                  {group} <span className="ml-1 font-mono text-foreground/60">({list.length})</span>
                </h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.map((p) => {
                    const pTasks = (tasks ?? []).filter((t) => t.plan_id === p.id);
                    const done = pTasks.filter((t) => t.status === "completed").length;
                    return (
                      <Card key={p.id}>
                        <div className="pt-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{truncate(p.title, 90)}</p>
                              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                                <span>{p.project_id ? projectMap.get(p.project_id) ?? "project" : "no project"}</span>
                                <span className="font-mono">{fmtDate(p.created_at)}</span>
                              </p>
                            </div>
                            {p.session_id && (
                              <Link
                                href={`/sessions/${p.session_id}`}
                                className="shrink-0 text-[0.6875rem] text-accent hover:underline underline-offset-4"
                              >
                                session
                              </Link>
                            )}
                          </div>
                          {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
                          {pTasks.length > 0 ? (
                            <>
                              <ul className="mt-4 space-y-1.5">
                                {pTasks.map((t) => (
                                  <TaskLine key={t.id} status={t.status} content={t.content} />
                                ))}
                              </ul>
                              <div className="mt-4">
                                <Progress done={done} total={pTasks.length} />
                              </div>
                            </>
                          ) : (
                            <p className="mt-3 text-xs text-muted">No tasks yet.</p>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )
          )}

          {unassigned.length > 0 && (
            <Card title={`Tasks without a plan (${unassigned.length})`}>
              <p className="mb-4 text-xs text-muted">
                Synced automatically from TodoWrite lists. Attach them to a plan with{" "}
                <code className="font-mono">cctrack task add --plan &lt;id&gt; --content &quot;...&quot;</code>.
              </p>
              <ul className="space-y-2">
                {unassigned.map((t) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <Badge
                      color={t.status === "completed" ? "green" : t.status === "in_progress" ? "yellow" : "muted"}
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                    <span className={`text-sm ${t.status === "completed" ? "text-muted line-through" : "text-foreground"}`}>
                      {t.content}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
