import Link from "next/link";
import { SettingsTrigger } from "@/components/deck-preferences";

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
    <section className={`deck-card min-w-0 ${className}`} style={style}>
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

/** Native <details>/<summary> disclosure used to group the Hub page's owner
 *  boxes (level 1, same material as Card) and per-type sub-boxes (level 2, a
 *  lighter Surface 2 inset). No JS, no persisted open state.
 *  ponytail: native <details>, no persisted open state; add URL/localStorage persistence if people ask */
export function Fold({
  summary,
  right,
  open,
  children,
  className = "",
  level = 1,
}: {
  summary: React.ReactNode;
  right?: React.ReactNode;
  open?: boolean;
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2;
}) {
  const headerPad = level === 1 ? "px-5 py-4" : "px-4 py-3";
  const bodyPad = level === 1 ? "px-5 pb-5" : "px-4 pb-4";
  const shellClass = level === 1 ? "deck-card" : "rounded-[0.875rem] bg-panel2/40";

  return (
    <details open={open} className={`group min-w-0 ${shellClass} ${className}`}>
      <summary
        className={`flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-3 ${headerPad} [&::-webkit-details-marker]:hidden`}
        style={level === 1 ? { borderBottom: "0.0625rem solid var(--color-line-soft)" } : undefined}
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-90"
          style={{ transitionDuration: "var(--duration-fast)" }}
        >
          <path d="M7 4.5l6 5.5-6 5.5" />
        </svg>
        <span className="min-w-0 flex-1 break-words">{summary}</span>
        {right && (
          <span className="ml-auto flex min-w-0 flex-wrap items-center gap-2">{right}</span>
        )}
      </summary>
      <div className={bodyPad}>{children}</div>
    </details>
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
          "linear-gradient(180deg, color-mix(in oklab, var(--color-accent-900) 40%, transparent), transparent)",
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
          <SettingsTrigger className="text-accent underline underline-offset-4">Full instructions</SettingsTrigger>
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
  breadcrumbs,
}: {
  title: string;
  sub?: string;
  right?: React.ReactNode;
  eyebrow?: string;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <header
      className="mb-9 flex flex-wrap items-end justify-between gap-5"
      style={{ animation: "rise 500ms var(--ease-standard) both" }}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 1 && (
          <div className="mb-2">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        )}
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
          className="font-display font-bold"
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 3vw, 3.25rem)",
            lineHeight: 1,
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

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  if (items.length <= 1) return null;
  const lastIndex = items.length - 1;
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center text-[0.75rem]">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="mx-2 text-muted">
                &gt;
              </span>
            )}
            {index === lastIndex || !item.href ? (
              <span className="text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="text-muted hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
