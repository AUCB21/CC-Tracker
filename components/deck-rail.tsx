"use client";

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

export function DeckRail() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 px-3 py-4" aria-label="Primary">
      {NAV.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-2">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-panel2 text-foreground"
                        : "text-muted hover:bg-panel2 hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`transition-colors ${
                        active ? "text-accent" : "text-muted group-hover:text-accent"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {active && (
                      <span
                        aria-hidden
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-accent"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function DeckRailMobile() {
  const pathname = usePathname();
  const flat = NAV.flatMap((g) => g.items);
  return (
    <nav className="ml-auto flex items-center gap-1 overflow-x-auto" aria-label="Primary">
      {flat.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-colors ${
              active ? "bg-panel2 text-accent" : "text-muted hover:bg-panel2 hover:text-foreground"
            }`}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}
