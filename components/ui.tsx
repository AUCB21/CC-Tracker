import Link from "next/link";

/* ---------------------------------------------------------------------------
   Material recipes (HANDOFF §3)
   Panel:      cards, chart shells, filter rail
   Stat:       stat cards (tighter radius + shallower shadow)
   Cell:       list-cell (rows in cell-column lists)
   Everything flat gets one of them.
--------------------------------------------------------------------------- */

const PANEL_STYLE: React.CSSProperties = {
  borderRadius: "1.125rem",
  border: "0.0625rem solid var(--color-line)",
  background:
    "linear-gradient(180deg, var(--color-surface-1a), var(--color-surface-1b))",
  boxShadow:
    "inset 0 0.0625rem 0 rgb(255 255 255 / 0.045), 0 1rem 2rem -1.25rem rgb(0 0 0 / 0.8)",
};

const STAT_STYLE: React.CSSProperties = {
  borderRadius: "0.875rem",
  border: "0.0625rem solid var(--color-line)",
  background:
    "linear-gradient(180deg, var(--color-surface-1a), var(--color-surface-1b))",
  boxShadow:
    "inset 0 0.0625rem 0 rgb(255 255 255 / 0.045), 0 0.0625rem 0.125rem rgb(0 0 0 / 0.5)",
};

/* Cell style is applied by callers on each list item (Overview cells). */
export const CELL_STYLE: React.CSSProperties = {
  borderRadius: "0.75rem",
  border: "0.0625rem solid var(--color-line)",
  background:
    "linear-gradient(180deg, var(--color-surface-cell-a), var(--color-surface-cell-b))",
  boxShadow: "inset 0 0.0625rem 0 rgb(255 255 255 / 0.03)",
  overflow: "hidden",
  width: "100%",
};

export function Card({
  title,
  right,
  children,
  className = "",
  style,
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`min-w-0 ${className}`} style={{ ...PANEL_STYLE, ...style }}>
      {(title || right) && (
        <header
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: "0.0625rem solid var(--color-line-soft)" }}
        >
          {title && (
            <h2
              className="font-display uppercase"
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.14em",
                color: "var(--color-muted-2)",
              }}
            >
              {title}
            </h2>
          )}
          {right}
        </header>
      )}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  emphasis = false,
  href,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  emphasis?: boolean;
  href?: string;
}) {
  const emphasisStyle: React.CSSProperties = emphasis
    ? {
        border: "0.0625rem solid oklch(0.44 0.082 40 / 0.75)",
        background:
          "linear-gradient(180deg, oklch(0.32 0.062 38 / 0.5), var(--color-surface-1b) 70%)",
        boxShadow:
          "inset 0 0.0625rem 0 oklch(0.86 0.058 46 / 0.14), 0 0.0625rem 0.125rem rgb(0 0 0 / 0.5)",
      }
    : {};
  const content = (
    <>
      {emphasis && (
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-45%",
            right: "-20%",
            height: "10rem",
            width: "10rem",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, var(--color-accent-600) 0%, transparent 68%)",
            opacity: 0.5,
            filter: "blur(0.5rem)",
          }}
        />
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
          fontFamily: "var(--font-mono)",
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          fontSize: "clamp(1.875rem, 2.3vw, 2.875rem)",
          color: emphasis ? "var(--color-accent-200)" : "var(--color-foreground)",
          textShadow: emphasis
            ? "0 0 1.75rem oklch(0.66 0.108 44 / 0.65)"
            : undefined,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
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
    ...STAT_STYLE,
    ...emphasisStyle,
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
        className="group relative flex flex-col hover:-translate-y-[0.1875rem]"
        style={baseStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="group relative flex flex-col" style={baseStyle}>
      {content}
    </article>
  );
}

export function Badge({
  color,
  children,
  glyph,
}: {
  color: "green" | "yellow" | "blue" | "accent" | "muted" | "red";
  children: React.ReactNode;
  glyph?: React.ReactNode;
}) {
  const map: Record<typeof color, { border: string; bg: string; text: string }> = {
    green: {
      border: "oklch(0.74 0.10 142 / 0.45)",
      bg: "oklch(0.74 0.10 142 / 0.14)",
      text: "var(--color-green-bright)",
    },
    yellow: {
      border: "oklch(0.79 0.11 85 / 0.45)",
      bg: "oklch(0.79 0.11 85 / 0.14)",
      text: "var(--color-yellow)",
    },
    blue: {
      border: "oklch(0.72 0.10 248 / 0.45)",
      bg: "oklch(0.72 0.10 248 / 0.14)",
      text: "var(--color-blue)",
    },
    accent: {
      border: "var(--color-accent-700)",
      bg: "oklch(0.44 0.082 40 / 0.2)",
      text: "var(--color-accent-200)",
    },
    muted: {
      border: "var(--color-line-strong)",
      bg: "transparent",
      text: "var(--color-muted-2)",
    },
    red: {
      border: "oklch(0.66 0.16 25 / 0.5)",
      bg: "oklch(0.66 0.16 25 / 0.14)",
      text: "var(--color-red)",
    },
  };
  const c = map[color];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full uppercase"
      style={{
        border: `0.0625rem solid ${c.border}`,
        background: c.bg,
        color: c.text,
        padding: "0.1875rem 0.5rem",
        fontSize: "0.625rem",
        fontWeight: 700,
        letterSpacing: "0.1em",
      }}
    >
      {glyph}
      {children}
    </span>
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
            boxShadow: "0 0 0.5rem oklch(0.74 0.10 142 / 0.5)",
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

export function SetupBanner() {
  return (
    <div
      className="mb-6 flex items-start gap-3 px-5 py-4 text-sm"
      style={{
        borderRadius: "1.125rem",
        border: "0.0625rem solid var(--color-accent-700)",
        background:
          "linear-gradient(180deg, oklch(0.32 0.062 38 / 0.4), transparent)",
      }}
    >
      <span
        className="mt-[0.15rem] inline-block h-2 w-2 shrink-0 rounded-full bg-accent"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="font-semibold" style={{ color: "var(--color-accent-200)" }}>
          Supabase is not configured.
        </p>
        <p className="mt-1 text-muted">
          Add <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
          <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code> and{" "}
          <code className="text-foreground">CC_TRACKER_API_KEY</code> to{" "}
          <code className="text-foreground">.env.local</code>, run{" "}
          <code className="text-foreground">supabase/schema.sql</code>, then restart the dev server.{" "}
          <Link href="/setup" className="text-accent underline underline-offset-4">
            Full instructions
          </Link>
        </p>
      </div>
    </div>
  );
}

/* Empty-state emblem: a soft ring with a single terracotta stroke arc,
   evoking a partial gauge - "nothing yet, room for it to fill in". Matches
   the single-stroke weight of RailIcons and stays intentional over generic. */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <svg viewBox="0 0 40 40" width="40" height="40" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="16" stroke="var(--color-line-strong)" strokeWidth="1.5" />
        <path
          d="M20 4a16 16 0 0 1 14.4 9"
          stroke="var(--color-accent-500)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="1.5" fill="var(--color-muted-3)" />
      </svg>
      <p
        className="max-w-[42ch] text-sm"
        style={{ color: "var(--color-muted-2)" }}
      >
        {children}
      </p>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  right,
  eyebrow,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header
      className="mb-9 flex flex-wrap items-end justify-between gap-5"
      style={{ animation: "rise 500ms var(--ease-standard) both" }}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p
            className="mb-2.5 uppercase"
            style={{
              margin: "0 0 0.625rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.625rem",
              letterSpacing: "0.2em",
              color: "var(--color-accent-600)",
            }}
          >
            {eyebrow}
          </p>
        )}
        <h1
          className="font-display font-semibold"
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 3vw, 3.25rem)",
            lineHeight: 1.02,
            letterSpacing: "-0.035em",
            color: "var(--color-foreground)",
          }}
        >
          {title}
        </h1>
        {sub && (
          <p
            className="mt-3"
            style={{
              maxWidth: "58ch",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: "var(--color-muted-2)",
              textWrap: "pretty",
            }}
          >
            {sub}
          </p>
        )}
      </div>
      {right}
    </header>
  );
}

export function TaskLine({
  status,
  content,
}: {
  status: "pending" | "in_progress" | "completed";
  content: string;
}) {
  const spec = {
    completed: { glyph: "✓", tone: "text-[color:var(--color-green)]" },
    in_progress: { glyph: "▶", tone: "text-[color:var(--color-yellow)]" },
    pending: { glyph: "○", tone: "text-muted" },
  }[status];
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`mt-0.5 inline-flex w-4 shrink-0 justify-center ${spec.tone}`}>{spec.glyph}</span>
      <span
        className={`min-w-0 flex-1 break-words ${
          status === "completed"
            ? "text-muted line-through decoration-[color:var(--color-line-strong)]"
            : "text-foreground"
        }`}
      >
        {content}
      </span>
    </li>
  );
}

/* Sidebar / rail icons: authored SVG, one weight, one stroke */
export const RailIcons = {
  overview: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" />
    </svg>
  ),
  projects: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M3 6.5a2 2 0 0 1 2-2h3l2 2h5a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  plans: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M4 5h12M4 10h12M4 15h8" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
      <path d="M6.5 10l2.5 2.5 5-5" />
    </svg>
  ),
  sessions: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M6 4l10 6-10 6z" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M4 16V9M9 16V4M14 16v-8" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <circle cx="10" cy="10" r="2" />
      <path d="M6.5 13.5a5 5 0 0 1 0-7M13.5 6.5a5 5 0 0 1 0 7" />
      <path d="M4 16a9 9 0 0 1 0-12M16 4a9 9 0 0 1 0 12" strokeOpacity="0.4" />
    </svg>
  ),
  setup: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 3v2M10 15v2M3 10h2M15 10h2M5 5l1.5 1.5M13.5 13.5L15 15M5 15l1.5-1.5M13.5 6.5L15 5" strokeLinecap="round" />
    </svg>
  ),
  hitl: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3.5l5.5 2v4c0 3.8-2.3 6.2-5.5 7-3.2-.8-5.5-3.2-5.5-7v-4z" />
      <path d="M7.3 10l2 2 3.4-3.8" />
    </svg>
  ),
  prompts: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v6A1.5 1.5 0 0 1 14.5 13H9l-3.5 3v-3H5.5A1.5 1.5 0 0 1 4 11.5z" />
    </svg>
  ),
} as const;

/** Small inline-action glyphs (edit/delete chips) shared across entity rows. */
export const ActionIcons = {
  pencil: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 16h4l8-8-4-4-8 8v4z" />
      <path d="M12 4l4 4" />
    </svg>
  ),
  trash: (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6M6 6l.6 9.2A1.5 1.5 0 0 0 8.1 16.6h3.8a1.5 1.5 0 0 0 1.5-1.4L14 6" />
    </svg>
  ),
} as const;

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`} aria-hidden>
      <span
        className="motion-safe-pulse absolute inset-0 rounded-full"
        style={{
          background: "var(--color-green)",
          animation: "beacon 2.4s var(--ease-standard) infinite",
        }}
      />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: "var(--color-green)",
          boxShadow: "0 0 0.5rem oklch(0.74 0.10 142 / 0.8)",
        }}
      />
    </span>
  );
}
