import Link from "next/link";
import { SetupBanner, Badge, PageHeader, Empty, Progress } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { Pager } from "@/components/pager";
import { getProjectsPage, getSessions, getTasks } from "@/lib/queries";
import { fmtNum, fmtRelative, fmtCost, fmtProjectName } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const PAGE_SIZE = 24;

export default async function ProjectsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const projectsPage = await getProjectsPage({ page, pageSize: PAGE_SIZE });
  if (!projectsPage) {
    return (
      <>
        <PageHeader title="Projects" sub="Auto-created from the working directory of each session." />
        <SetupBanner />
      </>
    );
  }

  const { rows: projects, total } = projectsPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageIds = projects.map((p) => p.id);
  const [sessions, tasks] = await Promise.all([
    pageIds.length > 0 ? getSessions({ projectIds: pageIds }) : Promise.resolve([]),
    pageIds.length > 0 ? getTasks({ projectIds: pageIds }) : Promise.resolve([]),
  ]);

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
            const displayName = fmtProjectName(p.name, p.path);
            const countText = `${pSessions.length} ${pSessions.length === 1 ? "session" : "sessions"}`;

            return (
              <div
                key={p.id}
                className="group relative rounded-2xl border border-line bg-panel p-5 transition-all hover:border-accent/50 hover:bg-panel2/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/projects/${p.id}`} className="min-w-0 hover:text-accent">
                    <h2 className="truncate text-base font-semibold tracking-tight" title={displayName}>
                      {displayName}
                    </h2>
                  </Link>
                  <Badge color="muted">{countText}</Badge>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="truncate font-mono text-[0.6875rem] text-muted" title={p.path}>
                    {p.path}
                  </p>
                  {p.path && <CopyButton text={p.path} label="Copy path" iconOnly className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>

                <Link href={`/projects/${p.id}`} className="mt-4 block">
                  <div className="grid grid-cols-3 gap-3 text-[0.6875rem] text-muted">
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
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <Pager pathname="/projects" searchParams={params} page={page} totalPages={totalPages} />
      </div>
    </>
  );
}
