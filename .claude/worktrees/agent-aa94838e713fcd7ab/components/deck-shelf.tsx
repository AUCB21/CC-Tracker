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
    <div
      className="sticky top-0 z-30 hidden h-[5rem] items-center gap-4 border-b border-line px-6 md:flex md:px-11"
      style={{
        background: "rgb(13 12 11 / 0.72)",
        backdropFilter: "blur(0.75rem) saturate(1.2)",
        WebkitBackdropFilter: "blur(0.75rem) saturate(1.2)",
      }}
    >
      <p
        className="m-0 font-display uppercase"
        style={{
          fontSize: "0.6875rem",
          fontWeight: 600,
          letterSpacing: "0.16em",
          color: "var(--color-muted-2)",
        }}
      >
        {label}
      </p>
      <span
        aria-hidden
        className="inline-block"
        style={{
          height: "0.0625rem",
          width: "2rem",
          background: "linear-gradient(90deg, var(--color-line-strong), transparent)",
        }}
      />

      <div className="flex-1" />

      <Link
        href="/setup"
        aria-label={connected ? "Database connected" : "Database not configured"}
        className="group inline-flex items-center gap-2 rounded-full border uppercase"
        style={{
          borderColor: "#2b2621",
          background: "linear-gradient(180deg, #1c1916, #141210)",
          padding: "0.375rem 0.875rem",
          fontSize: "0.6875rem",
          letterSpacing: "0.1em",
          color: "var(--color-muted-2)",
          boxShadow: "inset 0 0.0625rem 0 rgb(255 255 255 / 0.04)",
          transition:
            "border-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
        }}
      >
        <span aria-hidden className="relative inline-flex h-[0.4375rem] w-[0.4375rem]">
          <span
            className="motion-safe-pulse absolute inset-0 rounded-full"
            style={{
              background: connected ? "var(--color-green)" : "var(--color-yellow)",
              animation: "beacon 2.4s var(--ease-standard) infinite",
            }}
          />
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: connected ? "var(--color-green)" : "var(--color-yellow)",
              boxShadow: connected
                ? "0 0 0.5rem oklch(0.74 0.10 142 / 0.8)"
                : "0 0 0.5rem oklch(0.79 0.11 85 / 0.6)",
            }}
          />
        </span>
        <span className="transition-colors group-hover:text-foreground">
          {connected ? "Database connected" : "Database not configured"}
        </span>
        <span
          aria-hidden
          className="opacity-0 transition-opacity group-hover:opacity-100"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          ↗
        </span>
      </Link>
    </div>
  );
}
