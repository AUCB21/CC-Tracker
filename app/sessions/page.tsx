import Link from "next/link";
import { SetupBanner, Badge, PageHeader, Empty, LiveDot } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { Pager } from "@/components/pager";
import { getSessionsPage, getSessionFacetRows, getProjects } from "@/lib/queries";
import { fmtNum, fmtCost, fmtDate, fmtDuration, truncate } from "@/lib/format";
import { isLive } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const PAGE_SIZE = 50;

const WINDOW_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d",  label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

function windowToSinceIso(w: string | undefined): string | undefined {
  if (!w || w === "all") return undefined;
  const days = w === "7d" ? 7 : w === "30d" ? 30 : w === "90d" ? 90 : 0;
  if (days === 0) return undefined;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function toList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  const raw = Array.isArray(v) ? v.join(",") : v;
  return raw.split(",").filter(Boolean);
}

export default async function SessionsPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const projectFilter = toList(params.project);
  const modelFilter = toList(params.model);
  const windowFilter = (Array.isArray(params.window) ? params.window[0] : params.window) ?? "all";
  const sinceIso = windowToSinceIso(windowFilter);
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const [sessionsPage, projects, facetRows] = await Promise.all([
    getSessionsPage({
      projectIds: projectFilter.length > 0 ? projectFilter : undefined,
      models: modelFilter.length > 0 ? modelFilter : undefined,
      sinceIso,
      page,
      pageSize: PAGE_SIZE,
    }),
    getProjects(),
    getSessionFacetRows(), // unfiltered, narrow columns, for the facet option counts
  ]);

  if (!sessionsPage) {
    return (
      <>
        <PageHeader title="Sessions" sub="Every Claude Code session, newest activity first." />
        <SetupBanner />
      </>
    );
  }

  const { rows: sessions, total } = sessionsPage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

  // Facet options derived from the full session set
  const modelSet = new Map<string, number>();
  for (const s of facetRows) {
    const m = s.model ?? "unknown";
    modelSet.set(m, (modelSet.get(m) ?? 0) + 1);
  }

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "project",
      label: "Project",
      options: (projects ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        count: facetRows.filter((s) => s.project_id === p.id).length,
      })),
    },
    {
      kind: "checkbox",
      key: "model",
      label: "Model",
      options: Array.from(modelSet.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([value, count]) => ({
          value,
          label: value === "unknown" ? "unknown" : value.replace(/^claude-/, ""),
          count,
        })),
    },
    {
      kind: "radio",
      key: "window",
      label: "Time window",
      default: "all",
      options: WINDOW_OPTIONS,
    },
  ];

  return (
    <>
      <PageHeader
        title="Sessions"
        sub={`${total} session${total === 1 ? "" : "s"} match${total === 1 ? "es" : ""} the current filters.`}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-4">
          <ActiveFilterBar facets={facets} />
          {/* Mobile / tablet: filters as drawer above the table */}
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {sessions.length === 0 ? (
            <Empty>No sessions match the current filters.</Empty>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
                    <th className="px-5 py-3">Session</th>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Started</th>
                    <th className="px-5 py-3 text-right">Prompts</th>
                    <th className="px-5 py-3 text-right">Tools</th>
                    <th className="px-5 py-3 text-right">Tokens</th>
                    <th className="px-5 py-3 text-right">Cost</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sessions.map((s) => (
                    <tr
                      key={s.id}
                      className="relative transition-colors hover:bg-panel2/60 focus-within:bg-panel2/60"
                    >
                      <td className="max-w-[24rem] px-5 py-3">
                        <Link
                          href={`/sessions/${s.id}`}
                          className="relative block truncate hover:text-accent before:absolute before:inset-0 before:z-10 before:content-['']"
                        >
                          {truncate(s.title, 60)}
                        </Link>
                        <p className="mt-0.5 text-[0.6875rem] text-muted">
                          {s.model ? s.model.replace("claude-", "") : "no model"}
                          {s.git_branch ? ` / ${s.git_branch}` : ""}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {s.project_id ? projectMap.get(s.project_id) ?? "" : ""}
                      </td>
                      <td className="px-5 py-3 font-mono text-[0.75rem] text-muted">{fmtDate(s.started_at)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{s.prompt_count}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{fmtNum(s.tool_use_count)}</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {fmtNum(
                          s.input_tokens + s.output_tokens + s.cache_read_tokens + s.cache_creation_tokens,
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        {fmtCost(Number(s.estimated_cost_usd))}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isLive(s) ? (
                          <Badge color="green" glyph={<LiveDot className="h-1.5 w-1.5" />}>live</Badge>
                        ) : s.status === "ended" ? (
                          <Badge color="muted">{fmtDuration(s.started_at, s.ended_at)}</Badge>
                        ) : (
                          <Badge color="yellow">idle</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pager pathname="/sessions" searchParams={params} page={page} totalPages={totalPages} />
        </div>

        {/* Desktop: sticky filter rail on the right */}
        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
