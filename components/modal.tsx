"use client";

import { useEffect, useRef } from "react";

/**
 * Shared modal primitive built on the native <dialog> element.
 *
 * `dialog.showModal()` gives us for free:
 *   - top-layer stacking (always above app content, no z-index war)
 *   - built-in focus trap
 *   - ESC to close
 *   - initial focus on the first focusable child
 *
 * We add:
 *   - controlled `open` / `onClose` API so parent React owns state
 *   - click-outside-to-close on the ::backdrop
 *   - body scroll lock (dialog does not lock scroll on iOS Safari)
 *
 * ponytail: no portal, no third-party lib. If a specific caller ever needs
 * to opt out of backdrop-click-close, add a `dismissible={false}` prop then,
 * not now.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sync React `open` prop with the native dialog state.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Body scroll lock while open. dialog handles the trap but Safari still
  // scrolls the body underneath the backdrop without this.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const maxW =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-md";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Click on the ::backdrop bubbles as a click on the <dialog> itself
        // with target === dialog. Clicks inside land on <form>/children.
        if (e.target === ref.current) onClose();
      }}
      className={`w-[calc(100%-2rem)] ${maxW} rounded-2xl border border-line bg-panel p-0 text-foreground shadow-2xl backdrop:bg-background/70 backdrop:backdrop-blur-sm open:animate-in`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-panel2 hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M5 5L15 15M15 5L5 15" />
          </svg>
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
