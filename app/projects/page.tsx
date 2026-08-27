import Link from "next/link";
import { SetupBanner, Badge, PageHeader, Empty, Progress } from "@/components/ui";
import { getProjects, getSessions, getTasks } from "@/lib/queries";
import { fmtNum, fmtRelative, fmtCost } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [projects, sessions, tasks] = await Promise.all([getProjects(), getSessions(), getTasks()]);
  if (!projects) {
    return (
      <>
        <PageHeader title="Projects" sub="Auto-created from the working directory of each session." />
        <SetupBanner />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Projects" sub="Auto-created from the working directory of each session." />
      {projects.length === 0 ? (
        <Empty>No projects yet. They appear as soon as the first session is tracked.</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const pSessions = (sessions ?? []).filter((s) => s.project_id === p.id);
            const pTasks = (tasks ?? []).filter((t) => t.project_id === p.id);
            const done = pTasks.filter((t) => t.status === "completed").length;
            const cost = pSessions.reduce((a, s) => a + Number(s.estimated_cost_usd), 0);
            const tokens = pSessions.reduce(
              (a, s) => a + s.input_tokens + s.output_tokens + s.cache_read_tokens + s.cache_creation_tokens,
              0
            );
            const last = pSessions[0]?.last_activity_at;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-accent/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold tracking-tight">{p.name}</h2>
                  <Badge color="muted">{pSessions.length} sessions</Badge>
                </div>
                <p className="mt-1 truncate font-mono text-[0.6875rem] text-muted" title={p.path}>
                  {p.path}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-[0.6875rem] text-muted">
                  <div>
                    <div className="font-mono text-lg font-medium tabular-nums text-foreground">{fmtNum(tokens)}</div>
                    tokens
                  </div>
                  <div>
                    <div className="font-mono text-lg font-medium tabular-nums text-foreground">{fmtCost(cost)}</div>
                    est. cost
                  </div>
                  <div>
                    <div className="font-mono text-lg font-medium tabular-nums text-foreground">{fmtRelative(last)}</div>
                    last activity
                  </div>
                </div>
                {pTasks.length > 0 && (
                  <div className="mt-4">
                    <Progress done={done} total={pTasks.length} />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
