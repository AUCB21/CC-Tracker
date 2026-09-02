"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DeckRail } from "@/components/deck-rail";

const DRAWER_ID = "mobile-nav-drawer";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDialogElement>(null);

  const close = () => setOpen(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="ml-auto md:hidden">
      <button
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

      <dialog
        id={DRAWER_ID}
        ref={ref}
        aria-label="Navigation"
        onClose={close}
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="mobile-nav-drawer [&::backdrop]:bg-[rgb(13_12_11_/_0.6)]"
        style={{
          position: "fixed",
          inset: "0 0 0 auto",
          margin: 0,
          width: "18rem",
          maxWidth: "85vw",
          maxHeight: "100dvh",
          padding: 0,
          border: 0,
          borderLeft: "0.0625rem solid var(--color-line)",
          background: "linear-gradient(180deg, #17141200 0%, #0e0d0c 100%), #131110",
          color: "var(--color-text)",
          overflowY: "auto",
        }}
      >
        <DeckRail onNavigate={close} />
      </dialog>
      <style>{`
        .mobile-nav-drawer[open] { animation: drawerIn var(--duration-base) var(--ease-standard) both; }
        .mobile-nav-drawer[open]::backdrop { animation: veil var(--duration-base) var(--ease-standard) both; }
        @keyframes drawerIn { from { transform: translateX(100%); } to { transform: none; } }
        @media (prefers-reduced-motion: reduce) {
          .mobile-nav-drawer[open], .mobile-nav-drawer[open]::backdrop { animation: none; }
        }
      `}</style>
    </div>
  );
}
