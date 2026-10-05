import { fmtCost, fmtRelative } from "@/lib/format";
import type { UsageView, UsageWindowView } from "@/lib/usage";

const TONE: Record<UsageWindowView["tone"], string> = {
  ok: "var(--rail-sage)",
  warn: "var(--rail-amber)",
  hot: "var(--rail-red)",
};

function Bar({ w, label }: { w: UsageWindowView; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={w.percent}
      className="h-[0.2222rem] w-full overflow-hidden rounded-full"
      style={{ background: "var(--rail-line)" }}
    >
      <div className="h-full rounded-full" style={{ width: `${w.percent}%`, background: TONE[w.tone] }} />
    </div>
  );
}

/** Account rate-limit meters, fed by the cc-track mod's SessionUsage events.
 *  Renders nothing until the first reading arrives. The layout re-renders every
 *  5s (NavAutoRefresh), which keeps it current. In the collapsed rail only the
 *  fullest window shows, as one mini bar (see `.rail-usage-*` in globals.css). */
export function UsageMeter({ usage }: { usage: UsageView | null }) {
  if (!usage) return null;
  const { peak, stale } = usage;
  const asOf = `${stale ? "Stale: last" : "Last"} reading ${fmtRelative(usage.at)}`;
  return (
    <section
      aria-label="Session usage"
      className="rail-usage border-t px-[0.8889rem] py-[0.6667rem]"
      style={{ borderColor: "var(--rail-line-soft)", opacity: stale ? 0.55 : 1 }}
    >
      <div className="rail-usage-full flex-col gap-[0.5rem]">
        <div className="flex items-baseline gap-[0.4444rem]" title={asOf}>
          <span style={{ fontSize: "0.6944rem", color: "var(--rail-muted)" }}>Session usage</span>
          <span className="ml-auto font-mono" style={{ fontSize: "0.5833rem", color: "var(--rail-muted2)" }}>
            {stale ? `stale · ${fmtRelative(usage.at)}` : fmtRelative(usage.at)}
          </span>
        </div>
        {usage.windows.map((w) => (
          <div key={w.kind} className="flex flex-col gap-[0.2778rem]">
            <div className="flex items-baseline gap-[0.4444rem]">
              <span style={{ fontSize: "0.6944rem", color: "var(--rail-text)" }}>{w.label}</span>
              <span
                className="ml-auto font-mono tabular-nums"
                style={{ fontSize: "0.6944rem", color: w.tone === "ok" ? "var(--rail-text)" : TONE[w.tone] }}
              >
                {Math.round(w.raw)}%
              </span>
            </div>
            <Bar w={w} label={w.label} />
            {w.resetsIn && (
              <span className="font-mono" style={{ fontSize: "0.5833rem", color: "var(--rail-muted2)" }}>
                resets in {w.resetsIn}
              </span>
            )}
          </div>
        ))}
        {usage.costUsd !== null && (
          <div className="flex items-baseline gap-[0.4444rem]">
            <span style={{ fontSize: "0.6944rem", color: "var(--rail-muted)" }}>Session cost</span>
            <span className="ml-auto font-mono tabular-nums" style={{ fontSize: "0.6944rem", color: "var(--rail-text)" }}>
              {fmtCost(usage.costUsd)}
            </span>
          </div>
        )}
      </div>

      <div
        className="rail-usage-mini flex-col items-center gap-[0.2778rem]"
        title={peak ? `${peak.label} ${Math.round(peak.raw)}% · ${asOf}` : `Session cost · ${asOf}`}
      >
        {peak ? (
          <>
            <span
              className="font-mono tabular-nums"
              style={{ fontSize: "0.5556rem", color: peak.tone === "ok" ? "var(--rail-muted)" : TONE[peak.tone] }}
            >
              {Math.round(peak.raw)}%
            </span>
            <Bar w={peak} label={peak.label} />
          </>
        ) : (
          <span className="font-mono tabular-nums" style={{ fontSize: "0.5556rem", color: "var(--rail-muted)" }}>
            ${Math.round(usage.costUsd ?? 0)}
          </span>
        )}
      </div>
    </section>
  );
}
