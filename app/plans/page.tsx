import Link from "next/link";
import { SetupBanner, Card, Badge, PageHeader, Empty, Progress } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { CopyButton } from "@/components/copy-button";
import { Pager } from "@/components/pager";
import { RenamePlanButton } from "./rename-plan-button";
import { DeletePlanButton } from "./delete-plan-button";
import { TaskRowEditable } from "@/components/task-row-editable";
import { getPlansPage, getPlanFacetRows, getTasks, getProjects, getPlans } from "@/lib/queries";
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

  const [plansPage, projects, allTasks, facetRows, planOptions] = await Promise.all([
    getPlansPage({
      projectIds: projectFilter.length > 0 ? projectFilter : undefined,
      statuses: statusFilter.length > 0 ? statusFilter : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getProjects(),
    getTasks(),
    getPlanFacetRows(),
    getPlans({ columns: "id,title" }),
  ]);
  const planPickerOptions = (planOptions ?? []) as { id: string; title: string }[];

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(15rem,18vw,20rem)]">
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
                        <div className="flex shrink-0 items-center gap-1">
                          {p.session_id && (
                            <Link
                              href={`/sessions/${p.session_id}`}
                              className="text-[0.6875rem] text-accent hover:underline underline-offset-4"
                            >
                              session
                            </Link>
                          )}
                          <RenamePlanButton
                            planId={p.id}
                            initialTitle={p.title}
                            initialDescription={p.description}
                          />
                          <DeletePlanButton planId={p.id} planTitle={p.title} />
                        </div>
                      </div>
                      {p.description && <p className="mt-3 text-sm text-muted">{p.description}</p>}
                      {pTasks.length > 0 ? (
                        <>
                          <ul className="mt-4 space-y-1.5">
                            {pTasks.map((t) => (
                              <TaskRowEditable key={t.id} task={t} plans={planPickerOptions} />
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
                  <TaskRowEditable key={t.id} task={t} plans={planPickerOptions} />
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
