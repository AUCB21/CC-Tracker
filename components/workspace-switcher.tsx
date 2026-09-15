"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { fmtProjectName } from "@/lib/format";

export type WorkspaceProject = { id: string; name: string; path: string };

const CUBE_PATH = "M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9";
const CHEVRON_PATH = "M8 9l4-4 4 4M16 15l-4 4-4-4";

type MenuState = "closed" | "open" | "closing";

/** Nav-shortcut dropdown, not a global filter: picking a project navigates to
 *  /projects/[id] (or /projects for "All projects"). It never mutates state
 *  read by other pages. Trigger label always reads "All projects" regardless
 *  of the current route, by design (kept simple, no active-route tracking).
 *  Collapses to an icon-only "cube" via the shared `.rail-label` hide rule
 *  and the `.rail-workspace-trigger` / `.rail-workspace-menu` CSS hooks in
 *  globals.css, which reposition the menu to open rightward when collapsed.
 *  The popover follows transitions.dev "Menu dropdown"
 *  (.claude/skills/transitions-dev/05-menu-dropdown.md): mount with
 *  `.t-dropdown`, add `.is-open` a frame later so the pre-open scale/opacity
 *  actually transitions in, then on close swap to `.is-closing` and unmount
 *  after --dropdown-close-dur. */
export function WorkspaceSwitcher({ projects }: { projects: WorkspaceProject[] }) {
  const [menuState, setMenuState] = useState<MenuState>("closed");
  const [isOpenClass, setIsOpenClass] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset before mounting a fresh cycle (in the click handler, not an
  // effect) so a reopen after a prior close doesn't inherit a stale
  // `true` and skip straight past the pre-scale/opacity:0 resting frame.
  const openMenu = () => {
    setIsOpenClass(false);
    setMenuState("open");
  };
  const closeMenu = () => {
    setMenuState((current) => (current === "closed" ? current : "closing"));
  };

  // Open: `.t-dropdown` is already mounted at rest (pre-scale/opacity:0).
  // Force a reflow before flipping `.is-open` so the browser has committed
  // the resting frame first and the transition actually replays - the
  // reflow approach transitions-dev documents for this, robust even in a
  // backgrounded tab where requestAnimationFrame may never fire.
  useLayoutEffect(() => {
    if (menuState !== "open") return;
    const el = menuRef.current;
    if (!el) return;
    void el.offsetWidth;
    setIsOpenClass(true);
  }, [menuState]);

  // Closing: hold `.is-closing` for --dropdown-close-dur, then unmount.
  useEffect(() => {
    if (menuState !== "closing") return;
    const closeMs =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")) || 150;
    closeTimeoutRef.current = setTimeout(() => setMenuState("closed"), closeMs);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [menuState]);

  useEffect(() => {
    if (menuState !== "open") return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) closeMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuState]);

  return (
    <div ref={rootRef} className="rail-workspace-wrap relative mx-[0.6667rem]">
      <button
        type="button"
        onClick={() => (menuState === "closed" ? openMenu() : closeMenu())}
        aria-haspopup="menu"
        aria-expanded={menuState === "open"}
        title="All projects"
        className="rail-hit rail-workspace-trigger flex w-full items-center gap-[0.5rem] rounded-[0.5rem] px-[0.6111rem] py-[0.5rem] text-left"
        style={{ background: "var(--rail-accent-soft)", boxShadow: "inset 0 0 0 0.0625rem var(--rail-accent-ring)" }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-[0.8889rem] w-[0.8889rem] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinejoin="round"
          style={{ color: "var(--rail-accent)" }}
        >
          <path d={CUBE_PATH} />
        </svg>
        <span
          className="rail-label min-w-0 flex-1 truncate"
          style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--rail-ink)" }}
        >
          All projects
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="rail-label h-[0.7222rem] w-[0.7222rem] shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--rail-accent)" }}
        >
          <path d={CHEVRON_PATH} />
        </svg>
      </button>

      {menuState !== "closed" && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Switch workspace"
          data-origin="top-left"
          className={`t-dropdown rail-workspace-menu absolute z-20 flex flex-col overflow-auto ${
            menuState === "closing" ? "is-closing" : isOpenClass ? "is-open" : ""
          }`}
          style={{
            gap: "0.0556rem",
            background: "var(--rail-panel)",
            border: "0.0625rem solid var(--rail-line-strong)",
            borderRadius: "0.5556rem",
            padding: "0.2778rem",
            boxShadow: "0 0.7778rem 1.8889rem -0.8889rem rgb(23 21 18 / 0.42)",
            maxHeight: "16rem",
          }}
        >
          <Link
            href="/projects"
            role="menuitem"
            onClick={closeMenu}
            className="rail-hit flex items-center rounded-[0.3889rem] px-[0.5556rem] py-[0.4444rem] transition-colors hover:bg-[color:var(--rail-panel2)]"
            style={{ fontSize: "0.7222rem", color: "var(--rail-text)" }}
          >
            All projects
          </Link>
          {projects.length === 0 ? (
            <p className="px-[0.5556rem] py-[0.4444rem]" style={{ fontSize: "0.7222rem", color: "var(--rail-muted2)" }}>
              No other projects yet
            </p>
          ) : (
            projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                role="menuitem"
                onClick={closeMenu}
                className="rail-hit flex items-center truncate rounded-[0.3889rem] px-[0.5556rem] py-[0.4444rem] transition-colors hover:bg-[color:var(--rail-panel2)]"
                style={{ fontSize: "0.7222rem", color: "var(--rail-text)" }}
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
