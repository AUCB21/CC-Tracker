"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RailIcons, NavBadge } from "@/components/ui";
import { useDeckPreferences } from "@/components/deck-preferences";

const DRAWER_ID = "mobile-nav-drawer";

type NavItem = {
  href?: string;
  label: string;
  icon: React.ReactNode;
  countKey?: "pendingApprovals" | "inProgressTasks" | "liveSessions";
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
};

export const NAV: NavGroup[] = [
  {
    label: "Observe",
    items: [
      { href: "/",          label: "Overview",  icon: RailIcons.overview },
      { href: "/analytics", label: "Analytics", icon: RailIcons.analytics },
      { href: "/live",      label: "Live",      icon: RailIcons.live, countKey: "liveSessions" },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: RailIcons.projects },
      { href: "/plans",    label: "Plans",    icon: RailIcons.plans },
      { href: "/tasks",    label: "Tasks",    icon: RailIcons.tasks, countKey: "inProgressTasks" },
      { href: "/sessions", label: "Sessions", icon: RailIcons.sessions },
    ],
  },
  {
    label: "Control",
    items: [
      { href: "/hitl",    label: "HITL",    icon: RailIcons.hitl, countKey: "pendingApprovals" },
      { href: "/prompts", label: "Prompts", icon: RailIcons.prompts },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/hub",   label: "Hub",   icon: RailIcons.hub },
      { label: "Settings", icon: RailIcons.setup, settings: true },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const className = "group flex items-center gap-3 rounded-[0.5rem] px-3 py-2.5";
  const style = {
    color: active ? "var(--color-foreground)" : "var(--color-muted-2)",
    background: active ? "var(--color-surface-2)" : "transparent",
    fontSize: "0.875rem",
    transition: "color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
  };
  const content = (
    <>
      <span
        aria-hidden
        className="inline-flex"
        style={{ color: "var(--color-accent-600)", opacity: active ? 1 : 0.62, transition: "opacity var(--duration-fast) var(--ease-standard)" }}
      >
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      <NavBadge count={count ?? 0} />
    </>
  );

  if (item.settings) {
    return (
      <button
        type="button"
        onClick={onNavigate}
        className={`${className} w-full text-left`}
        style={style}
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
      className={className}
      style={style}
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
    <nav className="flex-1 space-y-7 px-3 py-5" aria-label="Primary">
      {NAV.map((group) => (
        <div key={group.label}>
          <p
            className="mb-2 px-3 uppercase"
            style={{
              fontSize: "0.625rem",
              fontWeight: 600,
              letterSpacing: "0.16em",
              color: "var(--color-muted-4)",
            }}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
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
        className="mobile-nav-drawer [&::backdrop]:bg-[rgb(13_12_11_/_0.6)]"
        style={{
          position: "fixed",
          inset: "0 0 0 auto",
          margin: 0,
          width: "18rem",
          maxWidth: "85vw",
          maxHeight: "100dvh",
          padding: 0,
          border: 0,
          borderLeft: "0.0625rem solid var(--color-line)",
          background: "var(--gradient-topbar)",
          color: "var(--color-text)",
          overflowY: "auto",
        }}
      >
        <DeckNav counts={counts} onNavigate={close} />
      </dialog>
    </div>
  );
}
