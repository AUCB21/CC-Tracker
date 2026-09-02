import type { Session, Task } from "./types";

/** Pure aggregation helpers, kept separate so they're unit-testable. */

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function lastNDays(n: number): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    out.push(dayKey(d));
  }
  return out;
}

export function buildActivitySeries(
  days: number,
  events: { type: string; created_at: string }[],
  sessions: { started_at: string }[]
): { day: string; dayLabel: string; prompts: number; toolUses: number; sessions: number }[] {
  const keys = lastNDays(days);
  const byDay = new Map(keys.map((k) => [k, { prompts: 0, toolUses: 0, sessions: 0 }]));
  for (const e of events) {
    const k = e.created_at.slice(0, 10);
    const row = byDay.get(k);
    if (!row) continue;
    if (e.type === "prompt") row.prompts++;
    else if (e.type === "tool_use" || e.type === "tasks_synced") row.toolUses++;
  }
  for (const s of sessions) {
    const row = byDay.get(s.started_at.slice(0, 10));
    if (row) row.sessions++;
  }
  return keys.map((k) => ({
    day: k,
    dayLabel: k.slice(5),
    ...byDay.get(k)!,
  }));
}

export function buildTokenCostSeries(
  days: number,
  sessions: Session[]
): { day: string; dayLabel: string; input: number; output: number; cacheRead: number; cost: number }[] {
  const keys = lastNDays(days);
  const byDay = new Map(keys.map((k) => [k, { input: 0, output: 0, cacheRead: 0, cost: 0 }]));
  for (const s of sessions) {
    const row = byDay.get(s.started_at.slice(0, 10));
    if (!row) continue;
    row.input += s.input_tokens + s.cache_creation_tokens;
    row.output += s.output_tokens;
    row.cacheRead += s.cache_read_tokens;
    row.cost += Number(s.estimated_cost_usd);
  }
  return keys.map((k) => {
    const r = byDay.get(k)!;
    return { day: k, dayLabel: k.slice(5), ...r, cost: Math.round(r.cost * 10000) / 10000 };
  });
}

export function aggregateTools(sessions: Session[]): { tool: string; count: number }[] {
  const m = new Map<string, number>();
  for (const s of sessions) {
    for (const [tool, n] of Object.entries(s.tool_breakdown ?? {})) {
      m.set(tool, (m.get(tool) ?? 0) + n);
    }
  }
  return [...m.entries()]
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);
}

export function taskStatusBreakdown(tasks: Task[]): { name: string; value: number }[] {
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  for (const t of tasks) counts[t.status] = (counts[t.status] ?? 0) + 1;
  return [
    { name: "Completed", value: counts.completed },
    { name: "In progress", value: counts.in_progress },
    { name: "Pending", value: counts.pending },
  ].filter((x) => x.value > 0);
}

export function modelBreakdown(sessions: Session[]): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const s of sessions) {
    const model = s.model ?? "unknown";
    m.set(model, (m.get(model) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function sessionDurationBuckets(
  sessions: Session[]
): { bucket: string; count: number }[] {
  const buckets = [
    { label: "<5m", max: 5 },
    { label: "5-15m", max: 15 },
    { label: "15-30m", max: 30 },
    { label: "30-60m", max: 60 },
    { label: "1-2h", max: 120 },
    { label: ">2h", max: Infinity },
  ];
  const counts = buckets.map((b) => ({ bucket: b.label, count: 0 }));
  for (const s of sessions) {
    if (!s.ended_at) continue;
    const mins = (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60_000;
    if (mins < 0) continue;
    const idx = buckets.findIndex((b) => mins < b.max);
    if (idx >= 0) counts[idx].count++;
  }
  return counts;
}

export function hourlyActivity(
  events: { created_at: string }[]
): { hour: string; count: number }[] {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const e of events) counts[new Date(e.created_at).getHours()]++;
  return counts.map((count, h) => ({ hour: `${String(h).padStart(2, "0")}h`, count }));
}
