"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label,
  className = "",
  iconOnly = false,
}: {
  text: string;
  label?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied to clipboard!" : `Copy ${label ?? text}`}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1 text-[0.6875rem] font-medium leading-none transition-all hover:bg-[var(--color-surface-2)] focus-visible:ring-1 focus-visible:ring-accent active:scale-[0.96] ${className}`}
      style={{
        borderColor: copied ? "var(--color-green)" : "var(--color-line-strong)",
        background: copied ? "var(--color-green-soft)" : "var(--color-surface-1a)",
        color: copied ? "var(--color-green-bright)" : "var(--color-muted-2)",
      }}
    >
      {copied ? (
        <span
          className="inline-flex items-center gap-1.5"
          style={{ animation: "lift 260ms var(--ease-standard) both" }}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          {!iconOnly && <span className="font-semibold">Copied</span>}
        </span>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {!iconOnly && <span>{label ?? "Copy"}</span>}
        </>
      )}
    </button>
  );
}
