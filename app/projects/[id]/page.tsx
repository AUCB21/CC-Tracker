import Link from "next/link";
import { notFound } from "next/navigation";
import { SetupBanner, Card, Stat, Badge, PageHeader, Empty, Progress, TaskLine, LiveDot } from "@/components/ui";
import { getProject, getSessions, getPlans, getTasks } from "@/lib/queries";
import { fmtNum, fmtCost, fmtDate, fmtRelative, truncate } from "@/lib/format";
import { isLive } from "@/lib/types";
import { RenameEntityButton } from "@/components/rename-entity-button";
import { DeleteProjectButton } from "./delete-project-button";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, sessions, plans, tasks] = await Promise.all([
    getProject(id),
    getSessions({ projectId: id }),
    getPlans({ projectId: id }),
    getTasks({ projectId: id }),
  ]);

  if (!project) {
    if (!sessions) {
      return (
        <>
          <PageHeader title="Project" />
          <SetupBanner />
        </>
      );
    }
    notFound();
  }

  const s = sessions ?? [];
  const tokens = s.reduce(
    (a, x) => a + x.input_tokens + x.output_tokens + x.cache_read_tokens + x.cache_creation_tokens,
    0
  );
  const cost = s.reduce((a, x) => a + Number(x.estimated_cost_usd), 0);
  const doneTasks = (tasks ?? []).filter((t) => t.status === "completed").length;

  return (
    <>
      <PageHeader
        title={project.name}
        sub={project.path}
        right={
          <div className="flex items-center gap-2">
            {project.repo && (
              <Badge color="blue">{project.repo.split("/").pop()?.replace(/\.git$/, "")}</Badge>
            )}
            <RenameEntityButton
              apiPath={`/api/projects/${project.id}`}
              field="name"
              currentValue={project.name}
              entityLabel="project"
              placeholder="Project name"
            />
            <DeleteProjectButton projectId={project.id} projectName={project.name} />
          </div>
        }
      />

      <div className="mb-8 grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Sessions" value={s.length} />
        <Stat label="Tokens"   value={fmtNum(tokens)} />
        <Stat label="Est. cost" value={fmtCost(cost)} emphasis />
        <Stat label="Tasks"    value={tasks?.length ?? 0} sub={`${doneTasks} completed`} />
      </div>

      <Card title="Sessions" className="mb-8">
        {s.length === 0 ? (
          <Empty>No sessions for this project yet.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {s.map((sess) => (
              <li key={sess.id}>
                <Link
                  href={`/sessions/${sess.id}`}
                  className="-mx-2 flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-panel2/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{truncate(sess.title, 90)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                      <span className="font-mono">{fmtDate(sess.started_at)}</span>
                      {sess.git_branch && <span className="font-mono">{sess.git_branch}</span>}
                      {sess.model && <span>{sess.model.replace("claude-", "")}</span>}
                      <span className="font-mono tabular-nums">{fmtNum(sess.prompt_count)} prompts</span>
                      <span className="ml-auto font-mono tabular-nums text-foreground/80">{fmtCost(Number(sess.estimated_cost_usd))}</span>
                    </p>
                  </div>
                  {isLive(sess) ? (
                    <Badge color="green" glyph={<LiveDot className="h-1.5 w-1.5" />}>live</Badge>
                  ) : (
                    <span className="shrink-0 font-mono text-[0.6875rem] text-muted">
                      {fmtRelative(sess.last_activity_at)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Plans and tasks">
        {(plans ?? []).length === 0 && (tasks ?? []).length === 0 ? (
          <Empty>Nothing planned here yet.</Empty>
        ) : (
          <div className="space-y-4">
            {(plans ?? []).map((p) => {
              const pTasks = (tasks ?? []).filter((t) => t.plan_id === p.id);
              const done = pTasks.filter((t) => t.status === "completed").length;
              return (
                <div key={p.id} className="rounded-xl border border-line bg-panel2 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{p.title}</p>
                    <Badge
                      color={p.status === "completed" ? "green" : p.status === "abandoned" ? "muted" : "yellow"}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  {p.description && <p className="mt-2 text-xs text-muted">{p.description}</p>}
                  {pTasks.length > 0 && (
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
                  )}
                </div>
              );
            })}
            {(tasks ?? []).filter((t) => !t.plan_id).length > 0 && (
              <div className="rounded-xl border border-line bg-panel2 p-5">
                <p className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
                  Session tasks (TodoWrite, unassigned)
                </p>
                <ul className="space-y-1.5">
                  {(tasks ?? [])
                    .filter((t) => !t.plan_id)
                    .map((t) => (
                      <TaskLine key={t.id} status={t.status} content={t.content} />
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
