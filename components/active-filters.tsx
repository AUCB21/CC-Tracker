"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { Facet } from "./filter-rail";

export function ActiveFilterBar({ facets }: { facets: Facet[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const removeFilter = useCallback(
    (key: string, valueToRemove?: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");

      if (!valueToRemove) {
        params.delete(key);
      } else {
        const current = params.get(key)?.split(",").filter(Boolean) ?? [];
        const next = current.filter((v) => v !== valueToRemove);
        if (next.length === 0) {
          params.delete(key);
        } else {
          params.set(key, next.join(","));
        }
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const activeChips: { key: string; label: string; value: string }[] = [];

  for (const facet of facets) {
    const rawVal = searchParams.get(facet.key);
    if (!rawVal) continue;

    if (facet.kind === "checkbox") {
      const selected = rawVal.split(",").filter(Boolean);
      for (const val of selected) {
        const match = facet.options.find((o) => o.value === val);
        activeChips.push({
          key: facet.key,
          value: val,
          label: `${facet.label}: ${match?.label ?? val}`,
        });
      }
    } else if (facet.kind === "radio") {
      if (rawVal !== (facet.default ?? "")) {
        const match = facet.options.find((o) => o.value === rawVal);
        activeChips.push({
          key: facet.key,
          value: rawVal,
          label: `${facet.label}: ${match?.label ?? rawVal}`,
        });
      }
    }
  }

  if (activeChips.length === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel/70 px-4 py-2.5 backdrop-blur-sm">
      <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
        Active Filters:
      </span>
      {activeChips.map((chip) => (
        <span
          key={`${chip.key}-${chip.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[0.75rem] font-medium leading-none text-foreground transition-colors hover:border-accent"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => removeFilter(chip.key, chip.value)}
            aria-label={`Remove ${chip.label}`}
            title={`Remove ${chip.label}`}
            className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[0.6875rem] font-bold leading-none text-muted transition-all hover:bg-accent/30 hover:text-foreground active:scale-90 before:absolute before:-inset-[0.9375rem] before:content-['']"
          >
            <span aria-hidden>✕</span>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clearAll}
        className="ml-auto text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-accent transition-all hover:underline underline-offset-4 active:scale-95"
      >
        Clear all
      </button>
    </div>
  );
}
