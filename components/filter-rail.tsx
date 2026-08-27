"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

export type Facet =
  | {
      kind: "checkbox";
      key: string;
      label: string;
      options: { value: string; label: string; count?: number }[];
    }
  | {
      kind: "radio";
      key: string;
      label: string;
      options: { value: string; label: string }[];
      /** value considered "default" (equivalent to unset in the URL) */
      default?: string;
    };

export function FilterRail({
  facets,
  className = "",
  variant = "sidebar",
}: {
  facets: Facet[];
  className?: string;
  variant?: "sidebar" | "drawer";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const currentSet = (key: string): Set<string> => {
    const v = searchParams.get(key);
    return v ? new Set(v.split(",")) : new Set();
  };

  const toggle = (key: string, value: string) => {
    const current = currentSet(key);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    setParam(key, current.size === 0 ? null : Array.from(current).join(","));
  };

  const activeCount = facets.reduce((n, f) => {
    const v = searchParams.get(f.key);
    if (!v) return n;
    if (f.kind === "checkbox") return n + v.split(",").length;
    if (f.kind === "radio" && v !== f.default) return n + 1;
    return n;
  }, 0);

  const clearAll = () => router.replace(pathname, { scroll: false });

  // Drawer rows are touch targets on mobile; sidebar stays dense for mouse/hover use.
  const rowPad = variant === "drawer" ? "py-2.5" : "py-1";

  const content = (
    <>
      <header className="flex items-center justify-between">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
          Filters
          {activeCount > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 py-0.5 font-mono text-[0.6875rem] text-background">
              {activeCount}
            </span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[0.6875rem] uppercase tracking-[0.06em] text-accent hover:underline underline-offset-4"
          >
            clear
          </button>
        )}
      </header>

      {facets.map((facet) => (
        <section key={facet.key}>
          <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
            {facet.label}
          </p>
          {facet.kind === "checkbox" ? (
            <ul className="space-y-1.5">
              {facet.options.map((opt) => {
                const on = currentSet(facet.key).has(opt.value);
                return (
                  <li key={opt.value}>
                    <label className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 ${rowPad} text-[0.75rem] hover:bg-panel2`}>
                      <span className="flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => toggle(facet.key, opt.value)}
                          className="h-3.5 w-3.5 shrink-0 accent-[color:var(--color-accent)]"
                        />
                        <span
                          className={on ? "truncate text-foreground" : "truncate text-muted"}
                          title={opt.label}
                        >
                          {opt.label}
                        </span>
                      </span>
                      {typeof opt.count === "number" && (
                        <span className="font-mono tabular-nums text-[0.6875rem] text-muted-2">
                          {opt.count}
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-1.5">
              {facet.options.map((opt) => {
                const current = searchParams.get(facet.key) ?? facet.default ?? "";
                const on = current === opt.value;
                return (
                  <li key={opt.value}>
                    <label className={`flex cursor-pointer items-center gap-2 rounded-md px-2 ${rowPad} text-[0.75rem] hover:bg-panel2`}>
                      <input
                        type="radio"
                        name={facet.key}
                        checked={on}
                        onChange={() =>
                          setParam(
                            facet.key,
                            opt.value === (facet.default ?? "") ? null : opt.value,
                          )
                        }
                        className="h-3.5 w-3.5 shrink-0 accent-[color:var(--color-accent)]"
                      />
                      <span className={on ? "text-foreground" : "text-muted"}>{opt.label}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </>
  );

  if (variant === "drawer") {
    return (
      <details
        className={`rounded-2xl border border-line bg-panel ${className}`}
      >
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
          <span>
            Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-accent px-2 py-0.5 font-mono text-background">
                {activeCount}
              </span>
            )}
          </span>
          <span aria-hidden className="text-muted">+</span>
        </summary>
        <div className="space-y-5 border-t border-line px-5 py-4">{content}</div>
      </details>
    );
  }

  return (
    <aside
      aria-label="Filters"
      className={`space-y-6 rounded-2xl border border-line bg-panel p-5 ${className}`}
    >
      {content}
    </aside>
  );
}
