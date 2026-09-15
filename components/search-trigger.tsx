"use client";

import { useEffect, useState } from "react";

/** Static search-box trigger for the desktop rail (and mobile drawer, since
 *  DeckNav's siblings in the rail markup are shared). Part 1 of a 2-part
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
      className="rail-hit flex w-full items-center gap-[0.4444rem] rounded-[0.5rem] px-[0.5556rem] py-[0.3889rem] text-left mt-[0.6667rem] mb-[0.2222rem]"
      style={{ background: "var(--rail-cell)", boxShadow: "inset 0 0 0 0.0625rem var(--rail-line)" }}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-[0.8333rem] w-[0.8333rem] shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        style={{ color: "var(--rail-muted2)" }}
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
      <span className="flex-1 truncate" style={{ fontSize: "0.75rem", color: "var(--rail-muted)" }}>
        Search...
      </span>
      <span aria-hidden className="inline-flex shrink-0 items-center gap-[0.1667rem]">
        {(isMac ? ["⌘", "K"] : ["Ctrl", "K"]).map((key) => (
          <span
            key={key}
            className="inline-flex items-center justify-center rounded-[0.2222rem] font-mono"
            style={{
              fontSize: "0.5278rem",
              color: "var(--rail-muted2)",
              background: "var(--rail-panel)",
              boxShadow: "inset 0 0 0 0.0625rem var(--rail-line)",
              padding: "0.0556rem 0.2222rem",
            }}
          >
            {key}
          </span>
        ))}
      </span>
    </button>
  );
}
