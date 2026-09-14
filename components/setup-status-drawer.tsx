"use client";

import { SettingsTrigger, type SetupStatus } from "@/components/deck-preferences";

export function SetupStatusDrawer({
  connected,
  status,
}: {
  connected: boolean;
  status: SetupStatus;
}) {
  const readyCount = [status.url, status.serviceRole, status.apiKey].filter(Boolean).length;
  return (
    <SettingsTrigger
      ariaLabel={connected ? "Open settings, database connected" : "Open settings, configuration incomplete"}
      className="group inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1.5 text-[0.6875rem] uppercase tracking-[0.1em] text-muted transition-colors hover:text-foreground"
    >
      <span
        aria-hidden
        className="inline-block h-[0.4375rem] w-[0.4375rem] rounded-full"
        style={{ background: connected ? "var(--color-green)" : "var(--color-yellow)" }}
      />
      <span>{connected ? "Database connected" : `Setup ${readyCount}/3`}</span>
      <span aria-hidden className="font-mono text-muted-3">↗</span>
    </SettingsTrigger>
  );
}
