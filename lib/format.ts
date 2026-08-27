const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const DASH = "-"; /* ponytail: hyphen only. The No-Em-Dash Rule (DESIGN.md). */

export function fmtNum(n: number | null | undefined): string {
  return compactNumber.format(n ?? 0);
}

export function fmtCost(n: number | null | undefined): string {
  if (n == null) return "$0.00";
  if (n > 0 && n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function fmtDuration(startIso: string, endIso: string | null): string {
  const ms = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime();
  if (ms < 0) return DASH;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "<1m";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return DASH;
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? clean.slice(0, n - 1) + "…" : clean;
}
