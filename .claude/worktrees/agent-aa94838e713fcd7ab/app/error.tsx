"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[deck error]", error);
  }, [error]);

  return (
    <>
      <PageHeader
        title="Something broke on the deck."
        sub="The page failed to render. This is either the tracker itself or the Supabase connection."
      />
      <Card title="What happened" className="mb-6">
        <div className="space-y-3 text-sm text-muted">
          <p className="text-foreground">{error.message || "Unknown error."}</p>
          {error.digest && (
            <p className="font-mono text-[0.75rem]">digest: {error.digest}</p>
          )}
          <p>
            Check the server logs (<code className="font-mono text-foreground">npm run dev</code>{" "}
            terminal). If Supabase is unreachable, verify the values in{" "}
            <code className="font-mono text-foreground">.env.local</code>.
          </p>
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/setup"
          className="rounded-md border border-line bg-panel px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:bg-panel2"
        >
          Go to setup
        </Link>
        <Link
          href="/api/health"
          className="text-[0.75rem] text-accent hover:underline underline-offset-4"
        >
          Check /api/health
        </Link>
      </div>
    </>
  );
}
