"use client";

import { Chip, Fold, Label } from "@/components/ui";
import { fmtProjectName, fmtRelative, fmtSessionTitle } from "@/lib/format";

export function SessionTree({
  projects,
  sessions,
}: {
  projects: { id: string; name: string; path: string }[];
  sessions: { id: string; project_id: string | null; title: string | null; prompt_count: number; started_at: string; model: string | null }[];
}) {
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const groups = new Map<string | null, typeof sessions>();
  for (const s of sessions) {
    const list = groups.get(s.project_id) ?? [];
    list.push(s);
    groups.set(s.project_id, list);
  }

  const orderedKeys: (string | null)[] = [...groups.keys()].filter((k) => k !== null);
  if (groups.has(null)) orderedKeys.push(null);

  return (
    <div className="flex flex-col gap-3">
      {orderedKeys.map((key) => {
        const groupSessions = groups.get(key) ?? [];
        const project = key ? projectMap.get(key) : undefined;
        const projectName = key ? fmtProjectName(project?.name, project?.path) : "no project";
        return (
          <Fold
            key={key ?? "no-project"}
            level={1}
            summary={
              <span className="flex items-center gap-2">
                <Label as="span" className="text-foreground">
                  {projectName}
                </Label>
                <Chip variant="neutral" size="sm" as="span">
                  {groupSessions.length}
                </Chip>
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {groupSessions.map((s) => {
                const title = fmtSessionTitle(s.title, s.prompt_count);
                return (
                  <Fold
                    key={s.id}
                    level={2}
                    summary={
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-[0.75rem]">{title}</span>
                        <span className="text-[0.6875rem] text-muted">{fmtRelative(s.started_at)}</span>
                        {s.model && (
                          <Chip as="span" size="sm">
                            {s.model}
                          </Chip>
                        )}
                      </span>
                    }
                  >
                    <div className="text-[0.75rem] text-muted">Tool-call summary not yet implemented</div>
                  </Fold>
                );
              })}
            </div>
          </Fold>
        );
      })}
    </div>
  );
}
