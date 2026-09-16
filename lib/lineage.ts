// Shared parent_run_id lineage walk, extracted from three call sites that
// each re-implemented it slightly differently:
//   - app/live/live-feed.tsx:computeLineageMap (UI depth chip)
//   - lib/attend.ts:getLineageStatsByTask (attempt N of M per task)
//   - lib/agent-run.ts:countAncestorRetries (retry-cap check)

export type LineageRow = {
  id: string;
  task_id: string | null;
  parent_run_id: string | null;
  trigger?: string | null;
  requested_at?: string;
};

export type Lineage = { n: number; m: number };

/**
 * For each row: `n` is its depth walking parent_run_id up from itself, and
 * `m` is the max `n` across all rows sharing the same task_id. Only rows
 * that are part of a chain (n > 1 OR m > 1 OR the row itself has a
 * parent_run_id) appear in the returned map.
 *
 * Out-of-window semantics: if a row's parent_run_id points at an id not
 * present in `rows`, its depth is treated as >= 2 (we know it has a parent,
 * even though that parent wasn't fetched). This matches the original
 * live-feed behavior. Callers that fetch the complete row set for a task
 * (attend, agent-run) never hit that branch since every ancestor is present.
 */
export function computeLineage(rows: LineageRow[]): Map<string, Lineage> {
  const byId = new Map<string, LineageRow>();
  for (const r of rows) byId.set(r.id, r);

  const cache = new Map<string, number>();

  const depth = (id: string, seen: Set<string>): number => {
    const cached = cache.get(id);
    if (cached != null) return cached;
    const r = byId.get(id);
    if (!r) return 1;
    let d = 1;
    const parentId = r.parent_run_id;
    if (parentId) {
      if (!byId.has(parentId)) {
        d = 2;
      } else if (seen.has(parentId)) {
        d = 1; // cycle guard: stop walking, treat as chain-end
      } else {
        seen.add(parentId);
        d = depth(parentId, seen) + 1;
      }
    }
    cache.set(id, d);
    return d;
  };

  const maxByTask = new Map<string, number>();
  for (const r of rows) {
    if (!r.task_id) continue;
    const d = depth(r.id, new Set([r.id]));
    maxByTask.set(r.task_id, Math.max(maxByTask.get(r.task_id) ?? 0, d));
  }

  const out = new Map<string, Lineage>();
  for (const r of rows) {
    if (!r.task_id) continue;
    const n = depth(r.id, new Set([r.id]));
    const m = maxByTask.get(r.task_id) ?? n;
    if (n > 1 || m > 1 || r.parent_run_id != null) out.set(r.id, { n, m });
  }
  return out;
}

/**
 * Count ancestors of `rootId` (exclusive) whose `trigger === matchTrigger`.
 * Walks parent_run_id upward in memory using the provided rows.
 */
export function ancestorTriggers(rows: LineageRow[], rootId: string, matchTrigger: string): number {
  const byId = new Map<string, LineageRow>();
  for (const r of rows) byId.set(r.id, r);

  const root = byId.get(rootId);
  if (!root) return 0;

  let count = 0;
  const seen = new Set<string>([rootId]);
  let cur = root.parent_run_id;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const row = byId.get(cur);
    if (!row) break;
    if (row.trigger === matchTrigger) count += 1;
    cur = row.parent_run_id;
  }
  return count;
}
