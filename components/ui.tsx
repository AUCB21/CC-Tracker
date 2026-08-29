import Link from "next/link";

export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-panel ${className}`}>
      {(title || right) && (
        <header className="flex items-center justify-between gap-4 px-5 pt-4 pb-2">
          {title && (
            <h2 className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted">
              {title}
            </h2>
          )}
          {right}
        </header>
      )}
      <div className="px-5 pb-5">{children}</div>
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
  const content = (
    <>
      <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-muted group-hover:text-foreground transition-colors">
        {label}
      </span>
      <span
        className={`stat-value font-mono font-medium leading-none tracking-tight ${
          emphasis ? "text-accent" : "text-foreground"
        }`}
        style={{ fontSize: "clamp(1.75rem, 2.2vw, 2.75rem)", marginTop: "0.25rem" }}
      >
        {value}
      </span>
      {sub && (
        <span className="mt-1 text-[0.75rem] text-muted">{sub}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex flex-col gap-1 rounded-2xl border border-line bg-panel px-5 py-5 transition-all hover:border-accent/50 hover:bg-panel2/60"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="flex flex-col gap-1 rounded-2xl border border-line bg-panel px-5 py-5">
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
  const map = {
    green:  "bg-[color:var(--color-green)] text-background",
    yellow: "bg-[color:var(--color-yellow)] text-background",
    blue:   "bg-[color:var(--color-blue)] text-background",
    accent: "bg-accent text-background",
    muted:  "bg-line text-muted",
    red:    "bg-[color:var(--color-red)] text-background",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-[0.125rem] text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ${map[color]}`}
    >
      {glyph}
      {children}
    </span>
  );
}

export function Progress({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-[color:var(--color-green)] transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[0.6875rem] text-muted tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

export function SetupBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent-soft px-5 py-4 text-sm">
      <span className="mt-[0.15rem] inline-block h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
      <div className="min-w-0">
        <p className="font-semibold text-accent">Supabase is not configured.</p>
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
      <svg
        viewBox="0 0 40 40"
        width="40"
        height="40"
        fill="none"
        aria-hidden
      >
        <circle
          cx="20"
          cy="20"
          r="16"
          stroke="var(--color-line)"
          strokeWidth="1.5"
        />
        <path
          d="M20 4a16 16 0 0 1 14.4 9"
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="1.5" fill="var(--color-muted-2)" />
      </svg>
      <p className="max-w-[42ch] text-sm text-muted">{children}</p>
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1
          className="font-semibold leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(1.5rem, 2vw, 2.5rem)" }}
        >
          {title}
        </h1>
        {sub && <p className="mt-2 max-w-[65ch] text-sm text-muted">{sub}</p>}
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
    completed:  { glyph: "✓", tone: "text-[color:var(--color-green)]" },
    in_progress:{ glyph: "▶", tone: "text-[color:var(--color-yellow)]" },
    pending:    { glyph: "○", tone: "text-muted" },
  }[status];
  return (
    <li className="flex items-center gap-2 text-sm">
      <span className={`inline-flex w-4 justify-center ${spec.tone}`}>{spec.glyph}</span>
      <span className={status === "completed" ? "text-muted line-through decoration-[color:var(--color-line)]" : "text-foreground"}>
        {content}
      </span>
    </li>
  );
}

/* Sidebar / rail icons: authored SVG, one weight, one stroke */
export const RailIcons = {
  overview: (
    <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="11" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="11" width="6" height="6" rx="1" />
      <rect x="11" y="11" width="6" height="6" rx="1" />
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
      <rect x="3.5" y="3.5" width="13" height="13" rx="2" />
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
} as const;

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`} aria-hidden>
      <span className="motion-safe-pulse absolute inset-0 rounded-full bg-[color:var(--color-green)] opacity-70 animate-ping" />
      <span className="absolute inset-0 rounded-full bg-[color:var(--color-green)]" />
    </span>
  );
}
