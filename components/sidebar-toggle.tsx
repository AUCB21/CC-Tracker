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
      className="rail-hit rail-toggle ml-auto inline-flex shrink-0 items-center justify-center rounded-[0.3333rem] p-[0.2222rem] transition-colors hover:bg-[color:var(--rail-panel2)] hover:text-[color:var(--rail-ink)]"
      style={{ color: "var(--rail-muted)" }}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-[0.9444rem] w-[0.9444rem]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
      </svg>
    </button>
  );
}
