import type { Metadata } from "next";
import { PageHeader, SetupBanner, Empty, Badge } from "@/components/ui";
import { getSupabase, isDbConfigured } from "@/lib/supabase";
import { getProjects } from "@/lib/queries";
import { fmtDate } from "@/lib/format";
import type { PromptRow } from "@/lib/types";
import { PromptEditor } from "./prompt-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prompts" };

async function getPrompts(): Promise<PromptRow[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db
    .from("prompts")
    .select("*")
    .order("name", { ascending: true })
    .order("version", { ascending: false });
  return (data as PromptRow[]) ?? [];
}

// Group prompt rows into [name, project_id]-keyed families so we can show
// "latest + previous versions" per family and expose a `new version` button
// that seeds from the latest row.
function groupPrompts(rows: PromptRow[]): Map<string, PromptRow[]> {
  const groups = new Map<string, PromptRow[]>();
  for (const r of rows) {
    const key = `${r.project_id ?? "__global__"}::${r.kind}::${r.name}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => b.version - a.version);
  }
  return groups;
}

export default async function PromptsPage() {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Prompts" />
        <SetupBanner />
      </>
    );
  }

  const [rows, projects] = await Promise.all([getPrompts(), getProjects()]);
  const groups = groupPrompts(rows);
  const projectMap = new Map((projects ?? []).map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        title="Prompts"
        sub={`${groups.size} prompt famil${groups.size === 1 ? "y" : "ies"}, ${rows.length} total versions. Every save creates a new immutable row.`}
      />

      <div className="mb-6 rounded-2xl border border-line bg-panel p-5">
        <h2 className="mb-3 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
          New prompt
        </h2>
        <PromptEditor seed={null} projectId={null} projectName={null} />
      </div>

      {groups.size === 0 ? (
        <Empty>No prompts yet. Add one above to start a library.</Empty>
      ) : (
        <div className="space-y-4">
          {Array.from(groups.entries()).map(([key, versions]) => {
            const latest = versions[0];
            const projectName = latest.project_id ? projectMap.get(latest.project_id) ?? "project" : null;
            return (
              <section key={key} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{latest.name}</span>
                  <Badge color={latest.kind === "system" ? "accent" : "blue"}>
                    {latest.kind}
                  </Badge>
                  {projectName ? (
                    <span className="text-[0.6875rem] text-muted">{projectName}</span>
                  ) : (
                    <span className="text-[0.6875rem] text-muted">global</span>
                  )}
                  <span className="ml-auto text-[0.6875rem] text-muted">
                    v{latest.version} · {fmtDate(latest.created_at)}
                  </span>
                </div>
                <pre className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-panel2 p-2 font-mono text-[0.6875rem] leading-relaxed text-foreground">
                  {latest.body}
                </pre>
                <div className="mt-3">
                  <PromptEditor
                    seed={latest}
                    projectId={latest.project_id}
                    projectName={projectName}
                  />
                </div>
                {versions.length > 1 && (
                  <details className="mt-3 text-[0.6875rem] text-muted">
                    <summary className="cursor-pointer hover:text-foreground">
                      {versions.length - 1} older version{versions.length - 1 === 1 ? "" : "s"}
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {versions.slice(1).map((v) => (
                        <li key={v.id} className="flex items-center gap-2 font-mono">
                          <span>v{v.version}</span>
                          <span>{fmtDate(v.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
