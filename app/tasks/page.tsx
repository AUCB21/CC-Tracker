import Link from "next/link";
import { SetupBanner, PageHeader, Empty } from "@/components/ui";
import { AttendButton } from "./attend-button";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { Pager } from "@/components/pager";
import { TaskRowEditable } from "@/components/task-row-editable";
import { getTasksPage, getTaskFacetRows, getProjects, getPlans } from "@/lib/queries";
import { fmtDate, toList } from "@/lib/format";
import { getSupabase } from "@/lib/supabase";
import { getLatestRunsByTask, getLineageStatsByTask } from "@/lib/attend";
import type { RunLineage } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: "pending",     label: "pending" },
  { value: "in_progress", label: "in progress" },
  { value: "completed",   label: "completed" },
];

export default async function TasksPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const projectFilter = toList(params.project);
  const statusFilter = toList(params.status);
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const [tasksPage, projects, plans, facetRows] = await Promise.all([
    getTasksPage({
      projectIds: projectFilter.length > 0 ? projectFilter : undefined,
      statuses: statusFilter.length > 0 ? statusFilter : undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    getProjects(),
    getPlans(),
    getTaskFacetRows(),
  ]);

  const db = getSupabase();
  const taskIds = tasksPage ? tasksPage.rows.map((t) => t.id) : [];
  const [latestRuns, lineageStats] = db && tasksPage
    ? await Promise.all([
        getLatestRunsByTask(db, taskIds),
        getLineageStatsByTask(db, taskIds),
      ])
    : [new Map(), new Map<string, RunLineage>()];

  if (!tasksPage) {
    return (
      <>
        <PageHeader title="Tasks" sub="Every task across every project, newest first." />
        <SetupBanner />
      </>
    );
  }

  const { rows: tasks, total } = tasksPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const planMap = new Map((plans ?? []).map((p) => [p.id, p.title]));
  const planPickerOptions = (plans ?? []).map((p) => ({ id: p.id, title: p.title }));

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "project",
      label: "Project",
      options: (projects ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        count: facetRows.filter((t) => t.project_id === p.id).length,
      })),
    },
    {
      kind: "checkbox",
      key: "status",
      label: "Status",
      options: STATUS_OPTIONS.map((o) => ({
        ...o,
        count: facetRows.filter((t) => t.status === o.value).length,
      })),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        sub={`${total} task${total === 1 ? "" : "s"} match${total === 1 ? "es" : ""} the current filters.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(15rem,18vw,20rem)]">
        <div className="min-w-0 space-y-4">
          <ActiveFilterBar facets={facets} />
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {tasks.length === 0 ? (
            <Empty>No tasks match the current filters.</Empty>
          ) : (
            <div className="rounded-2xl border border-line bg-panel">
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <TaskRowEditable
                    key={t.id}
                    task={t}
                    plans={planPickerOptions}
                    variant="row"
                    projectSlot={
                      t.project_id && (
                        <Link
                          href={`/projects/${t.project_id}`}
                          className="max-w-full truncate hover:text-accent hover:underline underline-offset-4"
                        >
                          {projectMap.get(t.project_id) ?? "project"}
                        </Link>
                      )
                    }
                    planLabel={t.plan_id ? planMap.get(t.plan_id) : undefined}
                    dateSlot={<span className="font-mono">{fmtDate(t.created_at)}</span>}
                    descriptionSlot={
                      t.description && (
                        <p className="mt-1 max-w-[75ch] break-words text-[0.75rem] text-muted">{t.description}</p>
                      )
                    }
                    right={
                      <AttendButton
                        taskId={t.id}
                        initialRun={latestRuns.get(t.id) ?? null}
                        lineage={lineageStats.get(t.id) ?? null}
                      />
                    }
                  />

                ))}
              </ul>
            </div>
          )}

          <Pager pathname="/tasks" searchParams={params} page={page} totalPages={totalPages} />
        </div>

        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
