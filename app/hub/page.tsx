import { PageHeader, Fold, Badge, Stat, Empty } from "@/components/ui";
import { FilterRail, type Facet } from "@/components/filter-rail";
import { ActiveFilterBar } from "@/components/active-filters";
import { getProjects } from "@/lib/queries";
import { toList } from "@/lib/format";
import { getHub, hubProjectPaths } from "@/lib/hub";
import { HubToggle } from "@/components/hub-toggle";
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

const TYPE_NOUN: Record<HubType, { singular: string; plural: string }> = {
  plugin: { singular: "plugin", plural: "plugins" },
  mcp: { singular: "mcp server", plural: "mcp servers" },
  skill: { singular: "skill", plural: "skills" },
  command: { singular: "command", plural: "commands" },
  agent: { singular: "agent", plural: "agents" },
  hook: { singular: "hook", plural: "hooks" },
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
        m.decidedBy ? `decided by ${m.decidedBy}` : "",
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

function renderToggle(item: HubItem) {
  if (item.type === "plugin" && item.scope.kind === "plugin" && item.state !== "stale") {
    return (
      <HubToggle
        kind="plugin"
        pluginKey={`${item.scope.plugin}@${item.meta.marketplace}`}
        enabled={item.state === "enabled"}
      />
    );
  }
  if (item.type === "mcp" && item.scope.kind === "project" && item.meta.local !== "true") {
    return (
      <HubToggle
        kind="mcpjson"
        projectPath={item.scope.path}
        server={item.name}
        state={item.state as "enabled" | "disabled" | "pending"}
      />
    );
  }
  return null;
}

/** Derived, presentation-only grouping of `HubItem[]` by who owns the config:
 *  the user, a project, an installed plugin, or the "inline plugins" bucket
 *  bundled with the CLI. `lib/hub.ts` stays a flat item list; this shape is
 *  built fresh from it on every render. */
type Owner =
  | { kind: "user"; label: string; sub: string; items: HubItem[] }
  | { kind: "project"; label: string; sub: string; path: string; items: HubItem[] }
  | { kind: "plugin"; label: string; sub: string; key: string; head: HubItem; items: HubItem[] }
  | { kind: "inline"; label: string; sub: string; items: HubItem[] };

function deriveOwners(items: HubItem[], configDir: string): Owner[] {
  const userItems: HubItem[] = [];
  const projectMap = new Map<string, { name: string; items: HubItem[] }>();
  const pluginMap = new Map<
    string,
    { plugin: string; marketplace: string; head: HubItem | null; items: HubItem[] }
  >();
  const inlineItems: HubItem[] = [];

  for (const item of items) {
    switch (item.scope.kind) {
      case "user":
        userItems.push(item);
        break;
      case "project": {
        const entry = projectMap.get(item.scope.path) ?? { name: item.scope.name, items: [] };
        entry.items.push(item);
        projectMap.set(item.scope.path, entry);
        break;
      }
      case "plugin": {
        const key = `${item.scope.plugin}@${item.scope.marketplace}`;
        const entry =
          pluginMap.get(key) ??
          { plugin: item.scope.plugin, marketplace: item.scope.marketplace, head: null, items: [] };
        if (item.type === "plugin") entry.head = item;
        else entry.items.push(item);
        pluginMap.set(key, entry);
        break;
      }
      case "inline":
        inlineItems.push(item);
        break;
      default:
        item.scope satisfies never;
    }
  }

  const owners: Owner[] = [];

  if (userItems.length > 0) {
    owners.push({
      kind: "user",
      label: "User",
      sub: configDir,
      items: userItems,
    });
  }

  owners.push(
    ...Array.from(projectMap.entries())
      .map(([path, v]) => ({ kind: "project" as const, label: v.name, sub: path, path, items: v.items }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  owners.push(
    ...Array.from(pluginMap.entries())
      .filter((entry): entry is [string, { plugin: string; marketplace: string; head: HubItem; items: HubItem[] }] =>
        entry[1].head !== null,
      )
      .map(([key, v]) => ({
        kind: "plugin" as const,
        label: v.head.name,
        sub: `${v.head.meta.version ? `v${v.head.meta.version}` : "v?"} · ${v.marketplace}`,
        key,
        head: v.head,
        items: v.items,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  if (inlineItems.length > 0) {
    owners.push({
      kind: "inline",
      label: "Inline plugins",
      sub: "bundled with Claude Code",
      items: inlineItems,
    });
  }

  return owners;
}

function ownerCounts(items: HubItem[]): string {
  const parts: string[] = [];
  for (const t of TYPE_ORDER) {
    const n = items.filter((i) => i.type === t).length;
    if (n > 0) {
      const noun = TYPE_NOUN[t];
      parts.push(`${n} ${n === 1 ? noun.singular : noun.plural}`);
    }
  }
  return parts.join(" · ");
}

function sortItemsForType(type: HubType, items: HubItem[]): HubItem[] {
  if (type !== "hook") return items;
  return [...items].sort(
    (a, b) =>
      (a.meta.event ?? "").localeCompare(b.meta.event ?? "") ||
      (a.meta.matcher ?? "").localeCompare(b.meta.matcher ?? ""),
  );
}

/** One row inside an owner's type group (or, for the Inline owner, directly
 *  inside the owner Fold). The state badge only shows when it differs from
 *  the owner's own state (plugin owners); user/project/inline owners have no
 *  state of their own, so every row's badge shows. */
function ItemRow({ item, ownerState }: { item: HubItem; ownerState: HubState | null }) {
  const showBadge = ownerState === null || item.state !== ownerState;
  const name = item.type === "hook" ? (item.meta.event ?? item.name) : item.name;
  const sub =
    item.type === "hook"
      ? (item.meta.matcher ?? "*")
      : (item.description ?? metaParts(item).slice(0, 2).join(" · "));

  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-sm text-foreground">{name}</span>
        {showBadge && <Badge color={STATE_BADGE[item.state]}>{STATE_LABEL[item.state]}</Badge>}
        <span className="min-w-0 flex-1 truncate text-sm text-muted">{sub}</span>
        {renderToggle(item)}
        {/* Row-level detail disclosure: lives in the <li>, never inside a <summary>,
            so it stays valid alongside the owner/type Folds above it. */}
        <details className="ml-auto shrink-0 open:w-full open:basis-full">
          <summary className="flex min-h-11 cursor-pointer list-none items-center text-xs text-muted hover:text-foreground [&::-webkit-details-marker]:hidden sm:min-h-0">
            details
          </summary>
          <div className="mt-1 space-y-1">
            {item.description && <p className="break-words text-sm text-muted">{item.description}</p>}
            <p className="break-all font-mono text-xs text-muted">{metaLine(item)}</p>
          </div>
        </details>
      </div>
    </li>
  );
}

export default async function HubPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const typeFilter = new Set(toList(params.type));
  const scopeFilter = new Set(toList(params.scope));
  const stateFilter = new Set(toList(params.state));
  const projectFilter = new Set(toList(params.project));

  const projects = await getProjects();
  const hub: Hub = await getHub({ projectPaths: await hubProjectPaths() });

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

  const itemMatchesFilters = (item: HubItem): boolean => {
    if (typeFilter.size > 0 && !typeFilter.has(item.type)) return false;
    if (scopeFilter.size > 0 && !scopeFilter.has(item.scope.kind)) return false;
    if (stateFilter.size > 0 && !stateFilter.has(item.state)) return false;
    if (projectFilter.size > 0) {
      if (item.scope.kind !== "project" || !projectFilter.has(item.scope.path)) return false;
    }
    return true;
  };
  const anyFilterActive =
    typeFilter.size > 0 || scopeFilter.size > 0 || stateFilter.size > 0 || projectFilter.size > 0;

  const owners = deriveOwners(items, hub.configDir);
  const visibleOwners = owners
    .map((owner) => {
      const visibleItems = owner.items.filter(itemMatchesFilters);
      const headVisible = owner.kind === "plugin" && itemMatchesFilters(owner.head);
      if (visibleItems.length === 0 && !headVisible) return null;
      return { owner, visibleItems };
    })
    .filter((entry): entry is { owner: Owner; visibleItems: HubItem[] } => entry !== null);

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Hub"
        sub="Skills, MCP servers, hooks, plugins and agents configured for Claude Code on this machine."
      />
      <p className="mb-6 -mt-6 text-sm text-muted">
        Toggles write to Claude Code settings files after saving a backup to ~/.cc-track/backups. Changes apply to
        new Claude Code sessions.
      </p>
      {projects === null && (
        <p className="mb-6 text-sm text-muted">
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
        <Fold
          level={1}
          className="mb-6"
          open={hub.warnings.some((w) => w.code === "stale-plugin")}
          summary={<span className="font-display text-base font-semibold text-foreground">Warnings</span>}
          right={<Badge color="yellow">{hub.warnings.length}</Badge>}
        >
          <ul className="divide-y divide-line">
            {hub.warnings.map((w, idx) => (
              <li key={`${w.code}-${idx}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge color={w.code === "stale-plugin" ? "red" : "yellow"}>{w.code}</Badge>
                  <span className="text-sm text-foreground">{w.message}</span>
                </div>
                <span className="break-all font-mono text-xs text-muted">{w.source}</span>
              </li>
            ))}
          </ul>
        </Fold>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_clamp(15rem,18vw,20rem)]">
        <div className="min-w-0 space-y-4">
          <ActiveFilterBar facets={facets} />
          <FilterRail facets={facets} variant="drawer" className="xl:hidden" />

          {visibleOwners.length === 0 ? (
            <Empty>No items match these filters.</Empty>
          ) : (
            visibleOwners.map(({ owner, visibleItems }) => {
              const ownerState: HubState | null = owner.kind === "plugin" ? owner.head.state : null;

              const byType = new Map<HubType, HubItem[]>();
              for (const item of visibleItems) {
                const list = byType.get(item.type) ?? [];
                list.push(item);
                byType.set(item.type, list);
              }
              const presentTypes = TYPE_ORDER.filter((t) => (byType.get(t)?.length ?? 0) > 0);

              return (
                <Fold
                  key={owner.kind === "plugin" ? owner.key : owner.kind === "project" ? owner.path : owner.kind}
                  level={1}
                  open
                  summary={
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-display text-base font-semibold text-foreground">{owner.label}</span>
                      <span className="min-w-0 break-all font-mono text-xs text-muted">{owner.sub}</span>
                      {owner.kind === "plugin" && (
                        <Badge color={STATE_BADGE[owner.head.state]}>{STATE_LABEL[owner.head.state]}</Badge>
                      )}
                    </span>
                  }
                  right={
                    <>
                      <span className="min-w-0 break-words font-mono text-xs tabular-nums text-muted">
                        {ownerCounts(visibleItems)}
                      </span>
                      {owner.kind === "plugin" && owner.head.state !== "stale" && renderToggle(owner.head)}
                    </>
                  }
                >
                  {owner.kind === "inline" ? (
                    <ul className="divide-y divide-line">
                      {visibleItems.map((item) => (
                        <ItemRow key={item.id} item={item} ownerState={ownerState} />
                      ))}
                    </ul>
                  ) : (
                    <div className="space-y-3">
                      {presentTypes.map((t) => {
                        const typeItems = sortItemsForType(t, byType.get(t) ?? []);
                        return (
                          <Fold
                            key={t}
                            level={2}
                            open={anyFilterActive}
                            summary={
                              <span className="font-display text-sm font-semibold text-foreground">
                                {TYPE_LABEL[t]}
                              </span>
                            }
                            right={
                              <span className="font-mono text-xs tabular-nums text-muted">{typeItems.length}</span>
                            }
                          >
                            <ul className="divide-y divide-line">
                              {typeItems.map((item) => (
                                <ItemRow key={item.id} item={item} ownerState={ownerState} />
                              ))}
                            </ul>
                          </Fold>
                        );
                      })}
                    </div>
                  )}
                </Fold>
              );
            })
          )}
        </div>

        <FilterRail facets={facets} className="hidden xl:sticky xl:top-16 xl:block xl:self-start" />
      </div>
    </>
  );
}
