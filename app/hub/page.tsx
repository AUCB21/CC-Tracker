import { PageHeader, Card, Badge, Stat, Empty } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { getProjects } from "@/lib/queries";
import { toList } from "@/lib/format";
import { getHub } from "@/lib/hub";
import type { Hub, HubItem, HubScope, HubState, HubType } from "@/lib/hub-parse";

export const dynamic = "force-dynamic";

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

const TYPE_ORDER: HubType[] = ["plugin", "mcp", "skill", "command", "agent", "hook"];

const TYPE_LABEL: Record<HubType, string> = {
  plugin: "Plugins",
  mcp: "MCP servers",
  skill: "Skills",
  command: "Commands",
  agent: "Agents",
  hook: "Hooks",
};

const SCOPE_LABEL: Record<HubScope["kind"], string> = {
  user: "User",
  project: "Project",
  plugin: "Plugin",
  inline: "Inline",
};

const STATE_LABEL: Record<HubState, string> = {
  enabled: "enabled",
  disabled: "disabled",
  pending: "pending",
  stale: "stale",
};

const STATE_BADGE: Record<HubState, "green" | "muted" | "yellow" | "red"> = {
  enabled: "green",
  disabled: "muted",
  pending: "yellow",
  stale: "red",
};

function scopeText(scope: HubScope): string {
  switch (scope.kind) {
    case "user":
      return "user";
    case "project":
      return scope.name;
    case "plugin":
      return `plugin: ${scope.plugin}`;
    case "inline":
      return "inline";
    default:
      return scope satisfies never;
  }
}

function metaParts(item: HubItem): string[] {
  const m = item.meta;
  switch (item.type) {
    case "plugin":
      return [m.version ? `v${m.version}` : "", m.components ?? ""].filter(Boolean);
    case "mcp":
      return [
        m.transport ?? "",
        m.command || m.url || "",
        m.envKeys ? `env: ${m.envKeys}` : "",
      ].filter(Boolean);
    case "skill":
      return [m.version ? `v${m.version}` : "", m.usageCount ? `used ${m.usageCount}` : ""].filter(Boolean);
    case "command":
      return [m.format ?? ""].filter(Boolean);
    case "agent":
      return [m.model ?? "", m.tools ?? ""].filter(Boolean);
    case "hook":
      return [m.event ?? "", m.matcher ?? "", m.command ?? ""].filter(Boolean);
    default:
      return [];
  }
}

function metaLine(item: HubItem): string {
  const parts = metaParts(item);
  return parts.length > 0 ? `${parts.join(" | ")} | ${item.source}` : item.source;
}

export default async function HubPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const typeFilter = new Set(toList(params.type));
  const scopeFilter = new Set(toList(params.scope));
  const stateFilter = new Set(toList(params.state));
  const projectFilter = new Set(toList(params.project));

  const projects = await getProjects();
  const projectPaths = Array.from(new Set([...(projects ?? []).map((p) => p.path), process.cwd()]));
  const hub: Hub = await getHub({ projectPaths });

  const items = hub.items;

  const projectOptions = new Map<string, string>();
  for (const item of items) {
    if (item.scope.kind === "project") projectOptions.set(item.scope.path, item.scope.name);
  }
  const showProjectFacet = hub.projectsScanned.length > 1;

  const facets: Facet[] = [
    {
      kind: "checkbox",
      key: "type",
      label: "Type",
      options: TYPE_ORDER.map((t) => ({
        value: t,
        label: TYPE_LABEL[t],
        count: items.filter((i) => i.type === t).length,
      })),
    },
    {
      kind: "checkbox",
      key: "scope",
      label: "Scope",
      options: (["user", "project", "plugin", "inline"] as const).map((s) => ({
        value: s,
        label: SCOPE_LABEL[s],
        count: items.filter((i) => i.scope.kind === s).length,
      })),
    },
    {
      kind: "checkbox",
      key: "state",
      label: "State",
      options: (["enabled", "disabled", "pending", "stale"] as const).map((s) => ({
        value: s,
        label: STATE_LABEL[s],
        count: items.filter((i) => i.state === s).length,
      })),
    },
  ];

  if (showProjectFacet) {
    facets.push({
      kind: "checkbox",
      key: "project",
      label: "Project",
      options: Array.from(projectOptions.entries()).map(([path, name]) => ({
        value: path,
        label: name,
        count: items.filter((i) => i.scope.kind === "project" && i.scope.path === path).length,
      })),
    });
  }

  const filtered = items.filter((item) => {
    if (typeFilter.size > 0 && !typeFilter.has(item.type)) return false;
    if (scopeFilter.size > 0 && !scopeFilter.has(item.scope.kind)) return false;
    if (stateFilter.size > 0 && !stateFilter.has(item.state)) return false;
    if (projectFilter.size > 0) {
      if (item.scope.kind !== "project" || !projectFilter.has(item.scope.path)) return false;
    }
    return true;
  });

  const filteredByType = new Map<HubType, HubItem[]>();
  for (const item of filtered) {
    const list = filteredByType.get(item.type) ?? [];
    list.push(item);
    filteredByType.set(item.type, list);
  }

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Hub"
        sub="Skills, MCP servers, hooks, plugins and agents configured for Claude Code on this machine."
      />
      {projects === null && (
        <p className="mb-6 -mt-6 text-sm text-muted">
          Database not configured. Scanning user scope and this repo only.
        </p>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {TYPE_ORDER.map((t) => (
          <Stat key={t} label={TYPE_LABEL[t]} value={items.filter((i) => i.type === t).length} />
        ))}
        <Stat label="Projects scanned" value={hub.projectsScanned.length} />
        <Stat label="Warnings" value={hub.warnings.length} />
      </div>

      {hub.warnings.length > 0 && (
        <div className="mb-6">
          <Card title="Warnings" right={<Badge color="yellow">{hub.warnings.length}</Badge>}>
            <ul className="divide-y divide-line">
              {hub.warnings.map((w, idx) => (
                <li key={`${w.code}-${idx}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge color={w.code === "stale-plugin" ? "red" : "yellow"}>{w.code}</Badge>
                    <span className="text-sm text-foreground">{w.message}</span>
                  </div>
                  <span className="break-all font-mono text-xs text-muted">{w.source}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(15rem,18vw,20rem)]">
        <div className="min-w-0 space-y-4">
          <ActiveFilterBar facets={facets} />
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {filtered.length === 0 ? (
            <Empty>No items match these filters.</Empty>
          ) : (
            TYPE_ORDER.filter((t) => (filteredByType.get(t)?.length ?? 0) > 0).map((t) => {
              const typeItems = filteredByType.get(t) ?? [];
              return (
                <Card
                  key={t}
                  title={TYPE_LABEL[t]}
                  right={
                    <span className="font-mono text-xs tabular-nums text-muted">{typeItems.length}</span>
                  }
                >
                  <ul className="divide-y divide-line">
                    {typeItems.map((item) => (
                      <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display text-sm font-semibold text-foreground">
                            {item.name}
                          </span>
                          <Badge color="blue">{scopeText(item.scope)}</Badge>
                          <Badge color={STATE_BADGE[item.state]}>{STATE_LABEL[item.state]}</Badge>
                        </div>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-sm text-muted">{item.description}</p>
                        )}
                        <p className="mt-1 break-all font-mono text-xs text-muted">{metaLine(item)}</p>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })
          )}
        </div>

        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
