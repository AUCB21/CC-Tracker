// Pure shaping of the latest `session_usage` event (sent by the cc-track mod,
// mods/cc-track) into what the sidebar meter draws. Rate-limit windows are
// account-wide, so the newest event across all sessions is the current reading.

export type UsageWindowView = {
  kind: string;
  label: string;
  /** 0..100 for the bar; `raw` keeps the reported value (spend limits can pass 100). */
  percent: number;
  raw: number;
  tone: "ok" | "warn" | "hot";
  /** "2h 14m", or null when the window reports no reset time. */
  resetsIn: string | null;
};

export type UsageView = {
  at: string;
  /** Cost of the session that sent the reading, as /cost totals it. */
  costUsd: number | null;
  /** The reading is over STALE_MS old: shown muted. */
  stale: boolean;
  windows: UsageWindowView[];
  /** The fullest window, for the collapsed rail's single indicator; null with no windows. */
  peak: UsageWindowView | null;
};

export const STALE_MS = 6 * 60 * 60_000;

const LABELS: Record<string, string> = {
  five_hour: "5h limit",
  seven_day: "7d limit",
  spend_limit: "Spend",
};
const ORDER = ["five_hour", "seven_day", "spend_limit"];

function fmtIn(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/** Shape the `data` column of the newest `session_usage` event; null when it has neither
 *  rate-limit windows nor a cost (API-key sessions report cost alone). */
export function buildUsageView(data: unknown, at: string, now = Date.now()): UsageView | null {
  const { rate_limits: limits, cost_usd: cost } = (data ?? {}) as { rate_limits?: unknown; cost_usd?: unknown };
  const windows: UsageWindowView[] = [];
  for (const w of Array.isArray(limits) ? limits : []) {
    if (!w || typeof w !== "object") continue;
    const { kind, percentUsed, resetsAt } = w as { kind?: unknown; percentUsed?: unknown; resetsAt?: unknown };
    if (typeof kind !== "string" || typeof percentUsed !== "number") continue;
    const resetMs = typeof resetsAt === "string" ? new Date(resetsAt).getTime() : NaN;
    // A window whose reset time has passed since the reading has started over.
    const hasReset = Number.isFinite(resetMs) && resetMs <= now;
    const raw = hasReset ? 0 : percentUsed;
    windows.push({
      kind,
      label: LABELS[kind] ?? kind.replace(/_/g, " "),
      percent: Math.min(100, Math.max(0, raw)),
      raw,
      tone: raw >= 90 ? "hot" : raw >= 75 ? "warn" : "ok",
      resetsIn: Number.isFinite(resetMs) && !hasReset ? fmtIn(resetMs - now) : null,
    });
  }
  const costUsd = typeof cost === "number" ? cost : null;
  if (windows.length === 0 && costUsd === null) return null;
  const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : ORDER.length);
  windows.sort((a, b) => rank(a.kind) - rank(b.kind));
  const peak = windows.reduce<UsageWindowView | null>((a, b) => (a && a.raw >= b.raw ? a : b), null);
  const atMs = new Date(at).getTime();
  return {
    at,
    costUsd,
    stale: !Number.isFinite(atMs) || now - atMs > STALE_MS,
    windows,
    peak,
  };
}
