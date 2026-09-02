"use client";

import { useEffect, useRef } from "react";

/**
 * Shared modal primitive built on the native <dialog> element.
 *
 * From the platform: top-layer stacking, focus trap, ESC to close, initial
 * focus. Added: controlled `open`/`onClose`, backdrop-click close, body
 * scroll lock (iOS Safari), and the veil + lift entrance from HANDOFF §6.
 */
export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const maxWidth = size === "sm" ? "25rem" : size === "lg" ? "38rem" : "32rem";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      style={{
        width: "calc(100% - 2rem)",
        maxWidth,
        maxHeight: "82vh",
        overflow: "auto",
        border: "0.0625rem solid #322c25",
        borderRadius: "1.25rem",
        padding: 0,
        background: "linear-gradient(180deg, #201c19, #151312)",
        color: "var(--color-text)",
        boxShadow:
          "inset 0 0.0625rem 0 rgb(255 255 255 / 0.06), 0 2.5rem 5rem -1rem rgb(0 0 0 / 0.9)",
        animation: "lift 320ms var(--ease-standard) both",
      }}
      className="[&::backdrop]:bg-[rgb(6_5_5_/_0.72)] [&::backdrop]:backdrop-blur-sm [&::backdrop]:animate-[veil_240ms_var(--ease-standard)_both]"
    >
      <div
        className="flex items-start justify-between gap-4 px-6 pt-5 pb-4"
        style={{ borderBottom: "0.0625rem solid var(--color-line-soft)" }}
      >
        <div className="min-w-0">
          {eyebrow && (
            <p
              className="mb-1 uppercase"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.625rem",
                letterSpacing: "0.16em",
                color: "var(--color-muted-3)",
              }}
            >
              {eyebrow}
            </p>
          )}
          <h2
            className="font-display font-semibold"
            style={{
              margin: 0,
              fontSize: "1.5rem",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--color-foreground)",
            }}
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex shrink-0 items-center justify-center rounded-[0.625rem] transition-colors hover:bg-[var(--color-surface-2)] hover:text-foreground"
          style={{
            height: "2.25rem",
            width: "2.25rem",
            color: "var(--color-muted-2)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
            <path d="M5 5L15 15M15 5L5 15" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: "0.0625rem solid var(--color-line-soft)" }}
        >
          {footer}
        </div>
      )}
    </dialog>
  );
}
