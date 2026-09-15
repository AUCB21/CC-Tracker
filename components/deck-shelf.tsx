"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/deck-preferences";
import { SetupStatusDrawer } from "@/components/setup-status-drawer";

const SCREEN_LABEL: Record<string, { screen: string; record: string }> = {
  "": { screen: "Control Panel", record: "all sessions" },
  analytics: { screen: "Analytics", record: "last 14 days" },
  plans: { screen: "Plans", record: "all plans" },
  live: { screen: "Live", record: "live sessions" },
  projects: { screen: "Projects", record: "all projects" },
  sessions: { screen: "Sessions", record: "all sessions" },
  tasks: { screen: "Tasks", record: "all tasks" },
  hitl: { screen: "HITL", record: "pending approvals" },
  prompts: { screen: "Prompts", record: "all prompts" },
  hub: { screen: "Hub", record: "claude code config" },
};

/** First path segment picks the screen/record pair; a second segment (a
 *  detail page like /projects/[id] or /sessions/[id]) replaces the record
 *  with that segment's id, letting the ellipsis handle long ones. */
function crumbFromPath(pathname: string): { screen: string; record: string } {
  const [first, second] = pathname.split("/").filter(Boolean);
  const base = SCREEN_LABEL[first ?? ""] ?? { screen: "Command Deck", record: first ?? "" };
  return second ? { screen: base.screen, record: second } : base;
}

export function DeckShelf({
  connected,
  setupStatus,
}: {
  connected: boolean;
  setupStatus: { url: boolean; serviceRole: boolean; apiKey: boolean };
}) {
  const pathname = usePathname();
  const { screen, record } = crumbFromPath(pathname);

  return (
    <div
      className="rail sticky top-0 z-30 hidden items-center gap-[0.7778rem] px-[1.4444rem] py-[0.8889rem] md:flex"
      style={{ background: "var(--rail-panel)", borderBottom: "0.0625rem solid var(--rail-line)" }}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-[0.5rem]">
        <span
          key={`screen:${pathname}`}
          className="rail-crumb"
          style={{ fontSize: "0.7778rem", color: "var(--rail-muted)", whiteSpace: "nowrap" }}
        >
          {screen}
        </span>
        <span aria-hidden style={{ fontSize: "0.7778rem", color: "var(--rail-line-strong)" }}>
          /
        </span>
        <span
          key={`record:${pathname}`}
          className="rail-crumb rail-crumb-record min-w-0"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "0.7222rem",
            fontWeight: 600,
            color: "var(--rail-ink)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {record}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-[0.7778rem]">
        <ThemeToggle />
        <SetupStatusDrawer connected={connected} status={setupStatus} />
      </div>
    </div>
  );
}
