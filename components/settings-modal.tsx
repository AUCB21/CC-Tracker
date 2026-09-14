"use client";

import { useEffect, useRef } from "react";
import { CopyButton } from "@/components/copy-button";
import { SetupContent } from "@/components/setup-content";
import { useDeckPreferences, type SetupStatus } from "@/components/deck-preferences";

const HEALTH_COMMAND = "curl -s http://localhost:3000/api/health";

export function SettingsModal({ status }: { status: SetupStatus }) {
  const { density, setDensity, settingsOpen, closeSettings } = useDeckPreferences();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (settingsOpen && !dialog.open) dialog.showModal();
    if (!settingsOpen && dialog.open) dialog.close();
  }, [settingsOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="settings-title"
      onClose={closeSettings}
      onCancel={closeSettings}
      onClick={(event) => { if (event.target === ref.current) closeSettings(); }}
      className="settings-modal fixed inset-0 m-auto [&::backdrop]:bg-[rgb(20_18_15_/_0.48)] [&::backdrop]:backdrop-blur-sm"
      style={{ width: "min(78rem, calc(100vw - 2rem))", maxWidth: "100vw", maxHeight: "calc(100dvh - 2rem)", padding: 0, border: "0.0625rem solid var(--color-line-strong)", borderRadius: "1.125rem", background: "var(--color-background)", color: "var(--color-text)", overflow: "hidden" }}
    >
      <header className="flex items-start justify-between gap-6 border-b border-line px-6 py-5 md:px-8">
        <div>
          <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-accent">System</p>
          <h2 id="settings-title" className="font-display text-2xl font-semibold tracking-tight text-foreground">Settings</h2>
          <p className="mt-1 text-sm text-muted">Display preferences and the setup reference.</p>
        </div>
        <button type="button" onClick={closeSettings} aria-label="Close settings" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-panel2 text-lg text-muted transition-colors hover:text-foreground">×</button>
      </header>

      <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto px-6 py-6 md:px-8">
        <section className="mb-6 rounded-xl border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">Display density</h3>
              <p className="mt-1 text-xs text-muted">Comfy gives dashboards more breathing room. Compact fits more rows on screen.</p>
            </div>
            <div className="inline-flex rounded-lg border border-line bg-panel2 p-1" role="group" aria-label="Display density">
              {(["comfy", "compact"] as const).map((option) => (
                <button key={option} type="button" onClick={() => setDensity(option)} aria-pressed={density === option} className="rounded-md px-3 py-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] transition-colors" style={{ background: density === option ? "var(--color-surface-1a)" : "transparent", color: density === option ? "var(--color-foreground)" : "var(--color-muted-2)" }}>{option}</button>
              ))}
            </div>
          </div>
        </section>

        <SetupContent dbOk={status.url && status.serviceRole} urlOk={status.url} svcOk={status.serviceRole} keyOk={status.apiKey} embedded />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel2 px-4 py-3">
          <p className="text-xs text-muted">Quick connection check</p>
          <CopyButton text={HEALTH_COMMAND} label="Copy health check" />
        </div>
      </div>
    </dialog>
  );
}
