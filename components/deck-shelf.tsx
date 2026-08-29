"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTION_LABEL: Record<string, string> = {
  "": "Overview",
  analytics: "Analytics",
  live: "Live",
  projects: "Projects",
  plans: "Plans",
  tasks: "Tasks",
  sessions: "Sessions",
  setup: "Setup",
};

function crumbFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  return SECTION_LABEL[seg] ?? "Command Deck";
}

export function DeckShelf({ connected }: { connected: boolean }) {
  const pathname = usePathname();
  const label = crumbFromPath(pathname);

  return (
    <div className="sticky top-0 z-30 hidden items-center gap-4 border-b border-line bg-panel/95 px-6 py-2.5 md:flex md:px-10">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>

      <div className="flex-1" />

      <Link
        href="/setup"
        aria-label={connected ? "Database connected" : "Database not configured"}
        className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-[0.6875rem] uppercase tracking-[0.06em] transition-colors hover:border-accent/60"
      >
        <span
          aria-hidden
          className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-[color:var(--color-green)]" : "bg-[color:var(--color-yellow)]"
            }`}
        />
        <span className="text-muted group-hover:text-foreground">
          {connected ? "Database connected" : "Database not configured"}
        </span>
      </Link>
    </div>
  );
}
