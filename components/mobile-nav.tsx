"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RailIcons, NavBadge } from "@/components/ui";
import { useDeckPreferences } from "@/components/deck-preferences";

const DRAWER_ID = "mobile-nav-drawer";

type NavTone = "neutral" | "sage" | "amber" | "red";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  countKey?: "pendingApprovals" | "inProgressTasks" | "liveSessions" | "pendingPlans";
  tone?: NavTone;
  settings?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export type NavCounts = {
  pendingApprovals: number;
  inProgressTasks: number;
  liveSessions: number;
  pendingPlans: number;
};

export const NAV: NavGroup[] = [
  {
    label: "Observe",
    items: [
      { href: "/",          label: "Overview",  icon: RailIcons.overview },
      { href: "/analytics", label: "Analytics", icon: RailIcons.analytics },
      { href: "/live",      label: "Live", icon: RailIcons.live, countKey: "liveSessions", tone: "sage" },
      { href: "/projects",  label: "Projects", icon: RailIcons.projects },
      { href: "/sessions",  label: "Sessions", icon: RailIcons.sessions },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/plans", label: "Plans", icon: RailIcons.plans, countKey: "pendingPlans", tone: "red" },
      { href: "/tasks", label: "Tasks", icon: RailIcons.tasks, countKey: "inProgressTasks", tone: "amber" },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/hitl",    label: "HITL",    icon: RailIcons.hitl, countKey: "pendingApprovals", tone: "red" },
      { href: "/prompts", label: "Prompts", icon: RailIcons.prompts },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/hub", label: "Hub", icon: RailIcons.hub },
      { label: "Setup", icon: RailIcons.setup, settings: true },
    ],
  },
];

/** Splits the standalone "Overview" item (href === "/") out of NAV so it can
 *  render as a pinned top-of-nav row, and drops any group left empty after
 *  the split. Computed once at module load since NAV is a static constant. */
function splitOverview(nav: NavGroup[]): { overview: NavItem | undefined; rest: NavGroup[] } {
  let overview: NavItem | undefined;
  const rest: NavGroup[] = [];
  for (const group of nav) {
    const items = group.items.filter((item) => {
      if (item.href === "/") {
        overview = item;
        return false;
      }
      return true;
    });
    if (items.length > 0) rest.push({ ...group, items });
  }
  return { overview, rest };
}

const { overview: OVERVIEW_ITEM, rest: REST_GROUPS } = splitOverview(NAV);

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Shared by the desktop rail and the mobile drawer (DeckNav renders both).
 *  Desktop rows are auto-height (padding-driven, matching the design source);
 *  below md they get a 2.75rem minimum for touch. Active state uses an inset
 *  box-shadow ring (not a real border) so nothing shifts layout. */
function NavRow({
  item,
  active,
  count,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  count?: number;
  onNavigate?: () => void;
}) {
  const rowClass =
    "group rail-nav-row flex items-center gap-[0.6111rem] rounded-[0.4444rem] px-[0.6111rem] py-[0.4444rem] text-[0.75rem] min-h-[2.75rem] md:min-h-0 hover:bg-[color:var(--rail-panel2)]";
  // Only set background/boxShadow inline when active. Inline style always
  // beats the `hover:bg-[...]` class, so leaving them unset (not merely
  // "transparent"/"none") when inactive is what lets hover actually show.
  const rowStyle: React.CSSProperties = active
    ? {
        background: "var(--rail-panel2)",
        boxShadow: "inset 0 0 0 0.0625rem var(--rail-line-strong)",
        transition: "background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
      }
    : {
        transition: "background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)",
      };
  const ariaLabel = count ? `${item.label}, ${count}` : item.label;
  const content = (
    <>
      <span aria-hidden className="inline-flex shrink-0" style={{ color: active ? "var(--rail-ink)" : "var(--rail-muted)" }}>
        {item.icon}
      </span>
      <span
        className="rail-label min-w-0 flex-1 truncate"
        style={{ color: active ? "var(--rail-ink)" : "var(--rail-text)", fontWeight: active ? 600 : 400 }}
      >
        {item.label}
      </span>
      <NavBadge count={count ?? 0} tone={item.tone} />
    </>
  );

  if (item.settings) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        aria-label={ariaLabel}
        title={item.label}
        className={`${rowClass} w-full text-left`}
        style={rowStyle}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={item.href ?? "/"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      title={item.label}
      className={rowClass}
      style={rowStyle}
    >
      {content}
    </Link>
  );
}

export function DeckNav({
  counts,
  onNavigate,
}: {
  counts: NavCounts;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { openSettings } = useDeckPreferences();
  return (
    <nav className="rail-nav flex flex-1 flex-col px-[0.6667rem] pb-[0.8889rem] pt-[0.2222rem]" aria-label="Primary">
      {OVERVIEW_ITEM && (
        <NavRow
          item={OVERVIEW_ITEM}
          active={isActive(pathname, OVERVIEW_ITEM.href ?? "/")}
          count={OVERVIEW_ITEM.countKey ? counts[OVERVIEW_ITEM.countKey] : undefined}
          onNavigate={onNavigate}
        />
      )}
      <div className="rail-divider" aria-hidden="true" />
      {REST_GROUPS.map((group, i) => (
        <div key={group.label} className="flex flex-col">
          {i > 0 && <div className="rail-divider" aria-hidden="true" />}
          <ul className="rail-nav-group flex flex-col">
            {group.items.map((item) => (
              <li key={item.label}>
                <NavRow
                  item={item}
                  active={item.href ? isActive(pathname, item.href) : false}
                  count={item.countKey ? counts[item.countKey] : undefined}
                  onNavigate={item.settings ? () => { onNavigate?.(); openSettings(); } : onNavigate}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ counts }: { counts: NavCounts }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md"
        style={{ color: "var(--color-muted-2)" }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ width: "1.375rem", height: "1.375rem" }}
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      <dialog
        id={DRAWER_ID}
        ref={ref}
        aria-label="Navigation"
        onClose={close}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="rail mobile-nav-drawer [&::backdrop]:bg-[rgb(13_12_11_/_0.6)]"
        style={{
          position: "fixed",
          inset: "0 0 0 auto",
          margin: 0,
          width: "18rem",
          maxWidth: "85vw",
          maxHeight: "100dvh",
          padding: 0,
          border: 0,
          borderLeft: "0.0625rem solid var(--rail-line)",
          background: "var(--rail-panel)",
          color: "var(--rail-text)",
          overflowY: "auto",
        }}
      >
        <DeckNav counts={counts} onNavigate={close} />
      </dialog>
    </div>
  );
}
