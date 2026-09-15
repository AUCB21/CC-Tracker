"use client";

import { SettingsTrigger, type SetupStatus } from "@/components/deck-preferences";

/** Same base+pulse dot construction as LiveDot in ui.tsx, so reduced motion
 *  is handled the same way via the shared `motion-safe-pulse` class. */
export function SetupStatusDrawer({
  connected,
  status,
}: {
  connected: boolean;
  status: SetupStatus;
}) {
  const readyCount = [status.url, status.serviceRole, status.apiKey].filter(Boolean).length;
  const tone = connected ? "var(--rail-sage)" : "var(--rail-amber)";
  return (
    <SettingsTrigger
      ariaLabel={connected ? "Open settings, database connected" : "Open settings, configuration incomplete"}
      className="inline-flex items-center gap-[0.4444rem] whitespace-nowrap transition-opacity hover:opacity-80"
    >
      <span aria-hidden className="relative inline-flex h-[0.3889rem] w-[0.3889rem]">
        <span className="absolute inset-0 rounded-full" style={{ background: tone }} />
        <span
          className="motion-safe-pulse absolute inset-0 rounded-full"
          style={{ background: tone, animation: "beacon 2.4s ease-out infinite" }}
        />
      </span>
      <span
        className="font-mono uppercase"
        style={{ fontSize: "0.5278rem", fontWeight: 600, letterSpacing: "0.13em", color: tone }}
      >
        {connected ? "Database connected" : `Setup ${readyCount}/3`}
      </span>
    </SettingsTrigger>
  );
}
