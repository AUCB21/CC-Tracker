"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { DeckRail } from "@/components/deck-rail";

const DRAWER_ID = "mobile-nav-drawer";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setMounted(true);
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While open: lock body scroll, close on Escape, move focus into the drawer,
  // and return focus to the toggle when it closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      toggleRef.current?.focus();
    };
  }, [open]);

  return (
    <div className="ml-auto md:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls={DRAWER_ID}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md"
        style={{ color: "var(--color-muted-2)" }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ width: "1.375rem", height: "1.375rem" }}
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Scrim */}
            <div
              aria-hidden
              onClick={close}
              className="fixed inset-0 z-30"
              style={{
                background: "rgb(13 12 11 / 0.6)",
                opacity: open ? 1 : 0,
                pointerEvents: open ? "auto" : "none",
                transition: reduceMotion ? "none" : "opacity var(--duration-base) var(--ease-standard)",
              }}
            />

            {/* Drawer */}
            <div
              id={DRAWER_ID}
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              tabIndex={-1}
              inert={!open}
              className="fixed inset-y-0 left-0 z-40 flex w-[18rem] max-w-[85vw] flex-col overflow-y-auto border-r border-line outline-none"
              style={{
                background:
                  "linear-gradient(180deg, #17141200 0%, #0e0d0c 100%), #131110",
                transform: open ? "translateX(0)" : "translateX(-100%)",
                transition: reduceMotion ? "none" : "transform var(--duration-base) var(--ease-standard)",
              }}
            >
              <DeckRail onNavigate={close} />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
