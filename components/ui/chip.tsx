/** Square 2.75rem icon-only button. Hits WCAG AAA touch-target size
 *  even when the SVG inside is 14-16px. `intent="danger"` swaps the
 *  hover color to Red for destructive actions. */
export function IconButton({
  onClick,
  ariaLabel,
  title,
  children,
  className = "",
  intent = "default",
  type = "button",
  disabled,
}: {
  onClick?: () => void;
  ariaLabel: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  intent?: "default" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const hover =
    intent === "danger"
      ? "hover:text-[color:var(--color-red)]"
      : "hover:text-accent";
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      disabled={disabled}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 ${hover} disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** Red-tinted role=alert block. Per DESIGN.md's Alarm-Is-Terminal Rule,
 *  Red belongs on failures; use this for surfaced errors, not Ember. */
export function ErrorAlert({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`rounded-md border border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 px-3 py-2 text-[0.75rem] text-[color:var(--color-red)] ${className}`}
    >
      {children}
    </div>
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
      border: "var(--color-green-ring)",
      bg: "var(--color-green-soft)",
      text: "var(--color-green-bright)",
    },
    yellow: {
      border: "var(--color-yellow-ring)",
      bg: "var(--color-yellow-soft)",
      text: "var(--color-yellow)",
    },
    blue: {
      border: "var(--color-blue-ring)",
      bg: "var(--color-blue-soft)",
      text: "var(--color-blue)",
    },
    accent: {
      border: "var(--color-accent-700)",
      bg: "color-mix(in oklab, var(--color-accent-800) 20%, transparent)",
      text: "var(--color-accent-status)",
    },
    muted: {
      border: "var(--color-line-strong)",
      bg: "transparent",
      text: "var(--color-muted-2)",
    },
    red: {
      border: "var(--color-red-ring)",
      bg: "var(--color-red-soft)",
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

/* ---------------------------------------------------------------------------
   Phase A primitives: <Chip>, <InlineError>, <Label>, <Input>, <Textarea>.
   Collapse the CHIP class-string that had drifted across ~7 files, plus the
   inline-error / eyebrow-label / modal-input recipes duplicated alongside it.
--------------------------------------------------------------------------- */

export type ChipVariant = "neutral" | "primary" | "allow" | "deny" | "warn" | "pass" | "fail";
export type ChipSize = "sm" | "md";

const CHIP_BASE_CLASS =
  "inline-flex items-center gap-1.5 rounded-full border font-medium leading-none transition-colors disabled:opacity-40";

const CHIP_SIZE_CLASS: Record<ChipSize, string> = {
  md: "px-3 py-1 text-[0.75rem]",
  sm: "px-2.5 py-1 text-[0.75rem]",
};

const CHIP_VARIANT_CLASS: Record<ChipVariant, string> = {
  neutral: "border-line text-muted hover:border-accent hover:text-foreground",
  primary: "border-accent/40 bg-accent/10 text-foreground hover:border-accent",
  allow:
    "border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)] hover:border-[color:var(--color-green)]",
  pass:
    "border-[color:var(--color-green)]/40 bg-[color:var(--color-green)]/10 text-[color:var(--color-green)] hover:border-[color:var(--color-green)]",
  deny:
    "border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 text-[color:var(--color-red)] hover:border-[color:var(--color-red)]",
  fail:
    "border-[color:var(--color-red)]/40 bg-[color:var(--color-red)]/10 text-[color:var(--color-red)] hover:border-[color:var(--color-red)]",
  warn:
    "border-[color:var(--color-yellow)]/40 bg-[color:var(--color-yellow)]/10 text-[color:var(--color-yellow)] hover:border-[color:var(--color-yellow)]",
};

// Solid "armed" look for the two-step arm/confirm chip pattern. Variants not
// listed here simply keep their idle class when armed (no error, no-op).
const CHIP_ARMED_CLASS: Partial<Record<ChipVariant, string>> = {
  allow: "border-[color:var(--color-green)] bg-[color:var(--color-green)] text-background hover:opacity-90",
  pass: "border-[color:var(--color-green)] bg-[color:var(--color-green)] text-background hover:opacity-90",
  primary: "border-accent bg-accent text-background hover:opacity-90",
};

type ChipOwnProps = {
  variant?: ChipVariant;
  size?: ChipSize;
  armed?: boolean;
  as?: "button" | "span";
  className?: string;
  children?: React.ReactNode;
};

export type ChipProps = ChipOwnProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ChipOwnProps>;

export function Chip({
  variant = "neutral",
  size = "md",
  armed = false,
  as = "button",
  className = "",
  children,
  type = "button",
  ...rest
}: ChipProps) {
  const variantClass = (armed && CHIP_ARMED_CLASS[variant]) || CHIP_VARIANT_CLASS[variant];
  const classes = `${CHIP_BASE_CLASS} ${CHIP_SIZE_CLASS[size]} ${variantClass} ${className}`;

  if (as === "span") {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

/** Inline text error, complementing the boxed `<ErrorAlert>`. Renders nothing
 *  for null/undefined/empty-string so callers can write `<InlineError>{err}</InlineError>`
 *  in place of `{err && <span>...}`. */
export function InlineError({ children }: { children?: React.ReactNode }) {
  if (children === null || children === undefined || children === "") return null;
  return <span className="text-[0.6875rem] text-[color:var(--color-red)]">{children}</span>;
}

const NAV_BADGE_TONE: Record<"neutral" | "sage" | "amber" | "red", { bg: string; fg: string }> = {
  neutral: { bg: "var(--rail-line-strong)", fg: "var(--rail-muted)" },
  sage: { bg: "var(--rail-sage-soft)", fg: "var(--rail-sage)" },
  amber: { bg: "var(--rail-amber-soft)", fg: "var(--rail-amber)" },
  red: { bg: "var(--rail-red-soft)", fg: "var(--rail-red)" },
};

/** Nav row count pill. Sets `--badge-fg` inline so the collapsed-rail dot
 *  variant (globals.css) can recolor itself per tone without JS. */
export function NavBadge({
  count,
  tone = "neutral",
}: {
  count: number;
  tone?: "neutral" | "sage" | "amber" | "red";
}) {
  if (count <= 0) return null;
  const display = count > 99 ? "99+" : String(count);
  const { bg, fg } = NAV_BADGE_TONE[tone];
  return (
    <span
      aria-label={String(count)}
      className="rail-badge ml-auto inline-flex items-center justify-center rounded-full px-[0.3889rem] py-[0.0556rem] text-[0.5556rem] font-mono font-semibold tabular-nums"
      style={{
        color: "var(--badge-fg)",
        ["--badge-bg" as string]: bg,
        ["--badge-fg" as string]: fg,
      }}
    >
      {display}
    </span>
  );
}
