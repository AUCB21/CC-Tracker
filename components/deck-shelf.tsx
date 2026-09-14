"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/deck-preferences";
import { SetupStatusDrawer } from "@/components/setup-status-drawer";

const SECTION_LABEL: Record<string, string> = {
  "": "Overview",
  analytics: "Analytics",
  live: "Live",
  projects: "Projects",
  plans: "Plans",
  tasks: "Tasks",
  sessions: "Sessions",
  setup: "Setup",
  hub: "Hub",
};

function crumbFromPath(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "";
  return SECTION_LABEL[seg] ?? "Command Deck";
}

export function DeckShelf({
  connected,
  setupStatus,
}: {
  connected: boolean;
  setupStatus: { url: boolean; serviceRole: boolean; apiKey: boolean };
}) {
  const pathname = usePathname();
  const label = crumbFromPath(pathname);

  return (
    <div
      className="sticky top-0 z-30 hidden h-[5rem] items-center gap-4 border-b border-line px-6 md:flex md:px-11"
      style={{
        background: "color-mix(in oklab, var(--color-background) 88%, transparent)",
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

      <ThemeToggle />
      <SetupStatusDrawer connected={connected} status={setupStatus} />
    </div>
  );
}
