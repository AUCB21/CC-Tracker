"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RailIcons } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    label: "Observe",
    items: [
      { href: "/",          label: "Overview",  icon: RailIcons.overview },
      { href: "/analytics", label: "Analytics", icon: RailIcons.analytics },
      { href: "/live",      label: "Live",      icon: RailIcons.live },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: RailIcons.projects },
      { href: "/plans",    label: "Plans",    icon: RailIcons.plans },
      { href: "/tasks",    label: "Tasks",    icon: RailIcons.tasks },
      { href: "/sessions", label: "Sessions", icon: RailIcons.sessions },
    ],
  },
  {
    label: "System",
    items: [{ href: "/setup", label: "Setup", icon: RailIcons.setup }],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="group relative flex items-center gap-3 rounded-[0.5rem] px-3 py-2.5"
      style={{
        color: active ? "#f3efe8" : "var(--color-muted-2)",
        background: active
          ? "linear-gradient(90deg, var(--color-accent-900), var(--color-surface-2))"
          : "transparent",
        fontSize: "0.875rem",
        transition:
          "color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)",
      }}
    >
      {/* Left accent bar - always mounted; opacity 1 active, 0 idle, 0.45 hover */}
      <span
        aria-hidden
        className="absolute left-0"
        style={{
          top: "0.5rem",
          bottom: "0.5rem",
          width: "0.125rem",
          borderRadius: "9999px",
          background: "var(--color-accent-400)",
          opacity: active ? 1 : 0,
          boxShadow: active ? "0 0 0.5rem var(--color-accent-600)" : "none",
          transition: "opacity var(--duration-fast) var(--ease-standard)",
        }}
      />
      <style jsx>{`
        a:hover span[aria-hidden]:first-of-type { opacity: ${active ? 1 : 0.45}; }
        a:hover { background: var(--color-surface-2); color: #f3efe8; }
      `}</style>
      <span
        aria-hidden
        className="inline-flex"
        style={{
          color: "var(--color-accent-400)",
          opacity: active ? 1 : 0.42,
          transition: "opacity var(--duration-fast) var(--ease-standard)",
        }}
      >
        {item.icon}
      </span>
      <span>{item.label}</span>
    </Link>
  );
}

export function DeckRail() {
  const pathname = usePathname();
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
              <li key={item.href}>
                <NavRow item={item} active={isActive(pathname, item.href)} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DeckRailMobile() {
  const pathname = usePathname();
  const flat = NAV.flatMap((g) => g.items);
  const activeRef = useRef<HTMLAnchorElement | null>(null);
  // ponytail: scroll the active item into center on mount so users on small
  // viewports notice items that would otherwise be scrolled off-screen.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);
  return (
    <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Primary">
      {flat.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            ref={active ? activeRef : undefined}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors"
            style={{
              background: active ? "var(--color-surface-2)" : "transparent",
              color: active ? "var(--color-accent-400)" : "var(--color-muted-2)",
            }}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
