"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type SetupStatus = { url: boolean; serviceRole: boolean; apiKey: boolean };
type Theme = "light" | "dark";
type Density = "comfy" | "compact";

type DeckPreferences = {
  theme: Theme;
  density: Density;
  toggleTheme: () => void;
  setDensity: (density: Density) => void;
  openSettings: () => void;
  closeSettings: () => void;
  settingsOpen: boolean;
};

const PreferencesContext = createContext<DeckPreferences | null>(null);
const THEME_KEY = "cc-track-theme";
const DENSITY_KEY = "cc-track-density";

export function useDeckPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Deck preferences must be used inside DeckPreferences");
  return value;
}

export function DeckPreferences({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  const [density, setDensity] = useState<Density>(() => typeof document !== "undefined" && document.documentElement.dataset.density === "compact" ? "compact" : "comfy");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_KEY);
      const savedDensity = localStorage.getItem(DENSITY_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      if (savedDensity === "compact" || savedDensity === "comfy") setDensity(savedDensity);
    } catch {}
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.density = density;
    try {
      localStorage.setItem(THEME_KEY, theme);
      localStorage.setItem(DENSITY_KEY, density);
    } catch {}
    window.dispatchEvent(new Event("deck-theme-change"));
  }, [theme, density]);

  return (
    <PreferencesContext.Provider
      value={{
        theme,
        density,
        toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
        setDensity,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        settingsOpen,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function SettingsTrigger({
  children,
  className = "",
  ariaLabel = "Open settings",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}) {
  const { openSettings } = useDeckPreferences();
  return (
    <button type="button" onClick={() => { onClick?.(); openSettings(); }} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  );
}

// Colors live in the class list, not inline style: inline `color`/`border`
// always beat a `hover:` class, which was silencing the hover state.
const THEME_TOGGLE_DEFAULT_CLASS =
  "inline-flex items-center gap-[0.3333rem] rounded-[0.3889rem] border-[0.0625rem] border-[color:var(--rail-line-strong)] px-[0.5556rem] py-[0.3333rem] font-mono text-[0.5556rem] font-medium uppercase tracking-[0.1em] text-[color:var(--rail-text)] transition-colors hover:text-[color:var(--rail-ink)] hover:bg-[color:var(--rail-panel2)]";

/** Icon swap follows transitions.dev "Icon swap" (.claude/skills/transitions-dev/09-icon-swap.md):
 *  both icons stay mounted in the same grid cell, data-state picks which is visible. */
export function ThemeToggle({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const { theme, toggleTheme } = useDeckPreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const next = theme === "light" ? "dark" : "light";
  const isDefault = !className;
  const resolvedClassName = isDefault ? THEME_TOGGLE_DEFAULT_CLASS : className;

  const icons = (
    <>
      <span className="t-icon flex h-full w-full items-center justify-center" data-icon="a" aria-hidden>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-full w-full">
          <path d="M10.8 2.3a5.8 5.8 0 1 0 2.9 10.8A5.8 5.8 0 0 1 10.8 2.3Z" />
        </svg>
      </span>
      <span className="t-icon flex h-full w-full items-center justify-center" data-icon="b" aria-hidden>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-full w-full">
          <circle cx="8" cy="8" r="2.7" />
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13" />
        </svg>
      </span>
    </>
  );

  if (!mounted) {
    return (
      <button type="button" onClick={toggleTheme} aria-label="Toggle color theme" className={resolvedClassName}>
        <span className="t-icon-swap h-[0.7222rem] w-[0.7222rem] shrink-0">{icons}</span>
        {!compact && "THEME"}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggleTheme} aria-label={`Switch to ${next} mode`} className={resolvedClassName}>
      <span className="t-icon-swap h-[0.7222rem] w-[0.7222rem] shrink-0" data-state={theme === "light" ? "a" : "b"}>
        {icons}
      </span>
      {!compact && (theme === "light" ? "DARK" : "LIGHT")}
    </button>
  );
}
