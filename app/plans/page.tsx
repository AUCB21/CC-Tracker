import Link from "next/link";
import { SetupBanner, Card, Badge, PageHeader, Empty, Progress, TaskLine } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { CopyButton } from "@/components/copy-button";
import { Pager } from "@/components/pager";
import { getPlansPage, getPlanFacetRows, getTasks, getProjects } from "@/lib/queries";
import { fmtDate, truncate, toList } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "active",    label: "active" },
  { value: "completed", label: "completed" },
  { value: "abandoned", label: "abandoned" },
];

export default async function PlansPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const projectFilter = toList(params.project);
  const statusFilter = toList(params.status);
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const [plansPage, projects, allTasks, facetRows] = await Promise.all([
    getPlansPage({
      projectIds: projectFilter.length > 0 ? projectFilter : undefined,
      statuses: statusFilter.length > 0 ? statusFilter : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getProjects(),
    getTasks(),
    getPlanFacetRows(),
  ]);

  if (!plansPage) {
    return (
      <>
        <PageHeader title="Plans" sub="Plans that you or Claude create with cctrack, and their tasks." />
        <SetupBanner />
      </>
    );
  }

  const { rows: plans, total } = plansPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const planIds = new Set(plans.map((p) => p.id));
  const tasksByPlan = (allTasks ?? []).filter((t) => t.plan_id && planIds.has(t.plan_id));
  const unassigned = (allTasks ?? []).filter((t) => !t.plan_id).slice(-20);

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "project",
      label: "Project",
      options: (projects ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        count: facetRows.filter((pl) => pl.project_id === p.id).length,
      })),
    },
    {
      kind: "checkbox",
      key: "status",
      label: "Status",
      options: STATUS_OPTIONS.map((o) => ({
        ...o,
        count: facetRows.filter((pl) => pl.status === o.value).length,
      })),
    },
  ];

  return (
    <>
      <PageHeader
        title="Plans"
        sub={`${total} plan${total === 1 ? "" : "s"} match${total === 1 ? "es" : ""} the current filters.`}
        right={
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <code className="max-w-full break-all rounded-md border border-line bg-panel2 px-3 py-1.5 font-mono text-[0.6875rem] text-muted">
              cctrack plan add --title &quot;...&quot;
            </code>
            <CopyButton text='cctrack plan add --title "Refactor auth"' label="Copy CLI" />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <ActiveFilterBar facets={facets} />
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {plans.length === 0 ? (
            <Empty>
              No plans match the current filters. From inside a Claude Code session run{" "}
              <code className="font-mono">cctrack plan add --title &quot;Refactor auth&quot;</code>.
            </Empty>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {plans.map((p) => {
                const pTasks = tasksByPlan.filter((t) => t.plan_id === p.id);
                const done = pTasks.filter((t) => t.status === "completed").length;
                return (
                  <Card key={p.id}>
                    <div className="pt-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{truncate(p.title, 90)}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                            <Badge
                              color={p.status === "completed" ? "green" : p.status === "abandoned" ? "muted" : "yellow"}
                            >
                              {p.status}
                            </Badge>
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
          )}

          <Pager pathname="/plans" searchParams={params} page={page} totalPages={totalPages} />

          {unassigned.length > 0 && (
            <Card title={`Tasks without a plan (${unassigned.length} most recent)`}>
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

        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
