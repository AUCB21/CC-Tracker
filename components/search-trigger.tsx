"use client";

import { useEffect, useState } from "react";
import { CELL_STYLE } from "@/components/ui";

/** Static search-box trigger for the desktop rail. Part 1 of a 2-part
 *  handoff: this renders the pill and the platform-aware Cmd-K hint chip
 *  only. The actual command palette is wired up by a separate Part 2 pass
 *  via the `#deck-search-trigger` / `data-search-trigger` hook below. */
export function SearchTrigger() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const platform = navigator.platform || navigator.userAgent || "";
    setIsMac(/Mac|iPhone|iPad|iPod/.test(platform));
  }, []);

  return (
    <button
      id="deck-search-trigger"
      data-search-trigger
      type="button"
      onClick={() => {
        window.dispatchEvent(new Event("deck-search-open"));
      }}
      className="flex w-full items-center gap-2 rounded-full px-3 text-left"
      style={{ ...CELL_STYLE, borderRadius: "9999px", minHeight: "2.75rem" }}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{ color: "var(--color-muted-3)", flexShrink: 0 }}
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="M17 17l-3.8-3.8" />
      </svg>
      <span className="flex-1 truncate" style={{ fontSize: "0.8125rem", color: "var(--color-muted-2)" }}>
        Search...
      </span>
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center justify-center rounded-[0.375rem]"
        style={{
          minWidth: "1.375rem",
          height: "1.375rem",
          padding: "0 0.375rem",
          fontSize: "0.6875rem",
          fontWeight: 600,
          color: "var(--color-muted-3)",
          background: "var(--color-surface-2)",
          border: "0.0625rem solid var(--color-line)",
        }}
      >
        {isMac ? "⌘K" : "Ctrl K"}
      </span>
    </button>
  );
}
