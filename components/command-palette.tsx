"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtProjectName } from "@/lib/format";
import { useDeckPreferences } from "@/components/deck-preferences";
import { NAV } from "@/components/mobile-nav";

export type PaletteProject = { id: string; name: string; path: string };

type PaletteItem =
  | { kind: "page"; key: string; label: string; href: string }
  | { kind: "settings"; key: string; label: string }
  | { kind: "project"; key: string; label: string; id: string };

const MAX_PROJECTS = 8;

/** Flattened, href-bearing page entries from NAV, plus a synthetic Settings
 *  entry - NAV's Settings item has no href, it opens the settings modal
 *  instead. Computed once at module load since NAV is a static constant. */
const PAGE_ITEMS: PaletteItem[] = (() => {
  const items: PaletteItem[] = [];
  for (const group of NAV) {
    for (const item of group.items) {
      if (item.href) {
        items.push({ kind: "page", key: `page:${item.href}`, label: item.label, href: item.href });
      } else if (item.settings) {
        items.push({ kind: "settings", key: "settings", label: item.label });
      }
    }
  }
  return items;
})();

/** Cmd-K / Ctrl-K command palette: substring search across app pages and
 *  projects (no fuzzy lib). Opens from a global keydown listener or the
 *  `deck-search-open` custom event dispatched by SearchTrigger - kept
 *  decoupled so the trigger doesn't need this component's context. */
export function CommandPalette({ projects }: { projects: PaletteProject[] }) {
  const router = useRouter();
  const { openSettings } = useDeckPreferences();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    const onOpenEvent = () => setOpen(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("deck-search-open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("deck-search-open", onOpenEvent);
    };
  }, []);

  const pageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PAGE_ITEMS;
    return PAGE_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const projectResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = projects.map((project) => ({ project, label: fmtProjectName(project.name, project.path) }));
    const matched = q ? named.filter(({ label }) => label.toLowerCase().includes(q)) : named;
    return matched.slice(0, MAX_PROJECTS).map(({ project, label }): PaletteItem => ({
      kind: "project",
      key: `project:${project.id}`,
      label,
      id: project.id,
    }));
  }, [projects, query]);

  const flatResults = useMemo(() => [...pageResults, ...projectResults], [pageResults, projectResults]);

  const activate = (item: PaletteItem) => {
    if (item.kind === "page") router.push(item.href);
    else if (item.kind === "settings") openSettings();
    else router.push(`/projects/${item.id}`);
    close();
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatResults.length > 0) setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatResults.length > 0) setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = flatResults[activeIndex];
      if (item) activate(item);
    }
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: "0.625rem",
    fontWeight: 600,
    letterSpacing: "0.16em",
    color: "var(--color-muted-4)",
  };

  const rowStyle = (active: boolean): React.CSSProperties => ({
    minHeight: "2.75rem",
    color: "var(--color-foreground)",
    background: active ? "var(--color-surface-2)" : "transparent",
  });

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      onClose={close}
      onClick={(event) => { if (event.target === dialogRef.current) close(); }}
      className="command-palette fixed inset-x-0 m-auto [&::backdrop]:bg-[rgb(20_18_15_/_0.48)] [&::backdrop]:backdrop-blur-sm"
      style={{
        top: "10vh",
        width: "min(32rem, calc(100% - 2rem))",
        maxWidth: "100%",
        maxHeight: "calc(100% - 14vh)",
        padding: 0,
        border: "0.0625rem solid var(--color-line-strong)",
        borderRadius: "1rem",
        background: "var(--color-background)",
        color: "var(--color-text)",
        overflow: "hidden",
      }}
    >
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="command-palette-listbox"
        aria-activedescendant={flatResults[activeIndex]?.key}
        aria-autocomplete="list"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
        onKeyDown={onInputKeyDown}
        placeholder="Search pages and projects..."
        className="w-full border-0 border-b bg-transparent px-4 outline-none"
        style={{ minHeight: "2.75rem", borderColor: "var(--color-line)", fontSize: "0.9375rem" }}
      />

      <div id="command-palette-listbox" role="listbox" aria-label="Search results" className="max-h-[60vh] overflow-y-auto px-2 py-2">
        {flatResults.length === 0 ? (
          <p className="px-3 py-6 text-center" style={{ fontSize: "0.8125rem", color: "var(--color-muted-3)" }}>
            No results
          </p>
        ) : (
          <>
            {pageResults.length > 0 && (
              <div className="px-2 pb-1 pt-2 uppercase" style={sectionLabelStyle}>Pages</div>
            )}
            {pageResults.map((item, i) => (
              <div
                key={item.key}
                id={item.key}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => activate(item)}
                className="flex cursor-pointer items-center rounded-lg px-3"
                style={rowStyle(i === activeIndex)}
              >
                <span className="truncate" style={{ fontSize: "0.875rem" }}>{item.label}</span>
              </div>
            ))}

            {projectResults.length > 0 && (
              <div className="px-2 pb-1 pt-3 uppercase" style={sectionLabelStyle}>Projects</div>
            )}
            {projectResults.map((item, i) => {
              const index = pageResults.length + i;
              return (
                <div
                  key={item.key}
                  id={item.key}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => activate(item)}
                  className="flex cursor-pointer items-center rounded-lg px-3"
                  style={rowStyle(index === activeIndex)}
                >
                  <span className="truncate" style={{ fontSize: "0.875rem" }}>{item.label}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </dialog>
  );
}
