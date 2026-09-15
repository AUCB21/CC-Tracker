"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtProjectName } from "@/lib/format";
import { PANEL_STYLE } from "@/components/ui";

export type WorkspaceProject = { id: string; name: string; path: string };

/** Nav-shortcut dropdown, not a global filter: picking a project navigates to
 *  /projects/[id] (or /projects for "All projects"). It never mutates state
 *  read by other pages. Trigger label always reads "All projects" regardless
 *  of the current route, by design (kept simple, no active-route tracking). */
export function WorkspaceSwitcher({ projects }: { projects: WorkspaceProject[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-full px-3 text-left"
        style={{
          minHeight: "2.75rem",
          background: "var(--color-accent-soft)",
          border: "0.0625rem solid var(--color-accent-ring)",
        }}
      >
        <span aria-hidden className="inline-flex shrink-0" style={{ color: "var(--color-accent-600)" }}>
          <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M10 2.5l6.5 3.4v8.2L10 17.5l-6.5-3.4V5.9z" />
            <path d="M10 9.8v7.4M10 9.8l6.5-3.4M10 9.8l-6.5-3.4" />
          </svg>
        </span>
        <span className="flex-1 truncate" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-foreground)" }}>
          All projects
        </span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--color-muted-2)", flexShrink: 0 }}
        >
          <path d={open ? "M6 12l4-4 4 4" : "M6 8l4 4 4-4"} />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch workspace"
          className="absolute left-0 right-0 z-30 mt-1.5 overflow-auto"
          style={{ ...PANEL_STYLE, borderRadius: "0.75rem", maxHeight: "16rem" }}
        >
          <Link
            href="/projects"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-sm transition-colors hover:bg-panel2"
            style={{ color: "var(--color-foreground)" }}
          >
            All projects
          </Link>
          {projects.length === 0 ? (
            <p className="px-3 py-2.5" style={{ fontSize: "0.75rem", color: "var(--color-muted-3)" }}>
              No other projects yet
            </p>
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block truncate px-3 py-2.5 text-sm transition-colors hover:bg-panel2"
                style={{ color: "var(--color-foreground)" }}
              >
                {fmtProjectName(project.name, project.path)}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
