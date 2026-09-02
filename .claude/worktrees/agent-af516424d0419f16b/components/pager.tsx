import Link from "next/link";

type SearchParams = { [key: string]: string | string[] | undefined };

export function buildPageHref(pathname: string, searchParams: SearchParams, page: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "page" || value === undefined) continue;
    params.set(key, Array.isArray(value) ? value.join(",") : value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function Pager({
  pathname,
  searchParams,
  page,
  totalPages,
}: {
  pathname: string;
  searchParams: SearchParams;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const navClass =
    "font-mono text-[0.75rem] uppercase tracking-[0.06em] text-accent hover:underline underline-offset-4";
  const disabledClass = "font-mono text-[0.75rem] uppercase tracking-[0.06em] text-muted-2";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-4 pt-2 text-[0.75rem]"
    >
      {page > 1 ? (
        <Link href={buildPageHref(pathname, searchParams, page - 1)} className={navClass}>
          Prev
        </Link>
      ) : (
        <span className={disabledClass}>Prev</span>
      )}
      <span className="font-mono text-[0.6875rem] text-muted tabular-nums">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={buildPageHref(pathname, searchParams, page + 1)} className={navClass}>
          Next
        </Link>
      ) : (
        <span className={disabledClass}>Next</span>
      )}
    </nav>
  );
}
