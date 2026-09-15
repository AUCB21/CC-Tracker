"use client";

import { useEffect, useState } from "react";

const RAIL_KEY = "cc-track-rail";

export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(document.documentElement.dataset.rail === "collapsed");
  }, []);

  const showCollapsed = mounted && collapsed;

  const toggle = () => {
    const next = !showCollapsed;
    document.documentElement.dataset.rail = next ? "collapsed" : "expanded";
    try {
      localStorage.setItem(RAIL_KEY, next ? "collapsed" : "expanded");
    } catch {}
    setCollapsed(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={showCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-expanded={!showCollapsed}
      className="inline-flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-[0.5rem] text-muted transition-colors hover:bg-panel2 hover:text-foreground"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: "1.25rem", height: "1.25rem" }}
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    </button>
  );
}
