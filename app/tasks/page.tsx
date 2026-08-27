import Link from "next/link";
import { SetupBanner, Badge, PageHeader, Empty } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { getTasks, getProjects, getPlans } from "@/lib/queries";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const STATUS_OPTIONS = [
  { value: "pending",     label: "pending" },
  { value: "in_progress", label: "in progress" },
  { value: "completed",   label: "completed" },
];

function toList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  return raw.split(",").filter(Boolean);
}

export default async function TasksPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const projectFilter = toList(params.project);
  const statusFilter = toList(params.status);

  const [allTasks, projects, plans] = await Promise.all([getTasks(), getProjects(), getPlans()]);

  if (!allTasks) {
    return (
      <>
        <PageHeader title="Tasks" sub="Every task across every project, newest first." />
        <SetupBanner />
      </>
    );
  }

  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));
  const planMap = new Map((plans ?? []).map((p) => [p.id, p.title]));

  const tasks = allTasks
    .filter((t) => projectFilter.length === 0 || (t.project_id && projectFilter.includes(t.project_id)))
    .filter((t) => statusFilter.length === 0 || statusFilter.includes(t.status))
    .slice()
    .reverse();

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "project",
      label: "Project",
      options: (projects ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        count: allTasks.filter((t) => t.project_id === p.id).length,
      })),
    },
    {
      kind: "checkbox",
      key: "status",
      label: "Status",
      options: STATUS_OPTIONS.map((o) => ({
        ...o,
        count: allTasks.filter((t) => t.status === o.value).length,
      })),
    },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        sub={`${tasks.length} of ${allTasks.length} tasks match the current filters.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {tasks.length === 0 ? (
            <Empty>No tasks match the current filters.</Empty>
          ) : (
            <div className="rounded-2xl border border-line bg-panel">
              <ul className="divide-y divide-line">
                {tasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-4 px-5 py-4">
                    <Badge
                      color={t.status === "completed" ? "green" : t.status === "in_progress" ? "yellow" : "muted"}
                    >
                      {t.status.replace("_", " ")}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          t.status === "completed"
                            ? "max-w-[75ch] text-sm font-medium text-muted line-through decoration-line"
                            : "max-w-[75ch] text-sm font-medium text-foreground"
                        }
                      >
                        {t.content}
                      </p>
                      {t.description && (
                        <p className="mt-1 max-w-[75ch] text-[0.75rem] text-muted">{t.description}</p>
                      )}
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] text-muted">
                        {t.project_id && (
                          <Link href={`/projects/${t.project_id}`} className="hover:text-accent hover:underline underline-offset-4">
                            {projectMap.get(t.project_id) ?? "project"}
                          </Link>
                        )}
                        {t.plan_id && planMap.get(t.plan_id) && <span>{planMap.get(t.plan_id)}</span>}
                        <span className="font-mono">{fmtDate(t.created_at)}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
