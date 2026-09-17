import Link from "next/link";

export function Stat({
  label,
  value,
  sub,
  emphasis = false,
  href,
  spark,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  emphasis?: boolean;
  href?: string;
  spark?: number[];
  delta?: { pct: number | null; goodDirection?: "up" | "down"; sub?: string };
}) {
  const content = (
    <>
      {spark && (
        <span
          className="pointer-events-none absolute @max-[11rem]:hidden"
          style={{ top: "1.25rem", right: "1.25rem" }}
        >
          <Sparkline data={spark} className="text-muted-3" />
        </span>
      )}
      <span
        className="relative flex items-center justify-between uppercase"
        style={{
          fontSize: "0.625rem",
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: "var(--color-muted-2)",
        }}
      >
        <span>{label}</span>
        {href && (
          <span
            aria-hidden
            className="text-accent transition-all group-hover:opacity-100 group-hover:translate-x-0.5"
            style={{
              opacity: 0,
              fontFamily: "var(--font-mono)",
              color: "var(--color-accent-400)",
            }}
          >
            ↗
          </span>
        )}
      </span>
      <span
        className="relative"
        style={{
          marginTop: "0.5rem",
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: "-0.04em",
          fontSize: "clamp(1.875rem, 2.3vw, 2.875rem)",
          color: "var(--color-foreground)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      {delta && (
        <span className="relative" style={{ marginTop: "0.5rem" }}>
          <TrendDelta {...delta} />
        </span>
      )}
      {sub && (
        <span
          className="relative"
          style={{
            marginTop: "0.5rem",
            fontSize: "0.75rem",
            color: "var(--color-muted-3)",
          }}
        >
          {sub}
        </span>
      )}
    </>
  );

  const baseStyle: React.CSSProperties = {
    padding: "1.25rem 1.25rem 1.125rem",
    position: "relative",
    overflow: "hidden",
    transition:
      "border-color var(--duration-base) var(--ease-standard), transform var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
  };

  if (href) {
    return (
      <Link
        href={href}
        className="group @container relative flex flex-col deck-stat hover:-translate-y-[0.1875rem]"
        style={baseStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="group @container relative flex flex-col deck-stat" style={baseStyle}>
      {content}
    </article>
  );
}

export function Progress({
  done,
  total,
  delayMs = 0,
}: {
  done: number;
  total: number;
  delayMs?: number;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-[0.375rem] flex-1 overflow-hidden rounded-full"
        style={{ background: "#262119" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            transformOrigin: "left",
            background:
              "linear-gradient(90deg, var(--color-green), var(--color-green-bright))",
            boxShadow: "0 0 0.5rem color-mix(in oklab, var(--color-green) 50%, transparent)",
            animation: `fillbar 900ms var(--ease-standard) ${delayMs}ms both`,
          }}
        />
      </div>
      <span
        className="tabular-nums"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.6875rem",
          color: "var(--color-muted-2)",
        }}
      >
        {done}/{total}
      </span>
    </div>
  );
}

export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  if (data.length < 2 || data.every((value) => value === 0)) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const xStep = 40 / (data.length - 1);
  const points = data
    .map((value, index) => `${index * xStep},${12 - ((value - min) / range) * 12}`)
    .join(" ");
  return (
    <svg viewBox="0 0 40 12" className={`w-[2.5rem] h-[0.75rem] ${className}`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1" points={points} />
    </svg>
  );
}

export function TrendDelta({
  pct,
  goodDirection = "up",
  sub,
}: {
  pct: number | null;
  goodDirection?: "up" | "down";
  sub?: string;
}) {
  if (pct === null) return null;
  const direction = pct > 0 ? "up" : pct < 0 ? "down" : "zero";
  const colorClass =
    direction === "zero"
      ? "text-muted"
      : direction === goodDirection
        ? "text-[color:var(--color-green)]"
        : "text-[color:var(--color-red)]";
  const arrow = direction === "up" ? "^" : direction === "down" ? "v" : "-";
  return (
    <span className={`inline-flex items-center gap-1 text-[0.6875rem] font-medium tabular-nums ${colorClass}`}>
      {arrow} {Math.abs(pct).toFixed(1)}%
      {sub && <span className="text-muted ml-1">{sub}</span>}
    </span>
  );
}
