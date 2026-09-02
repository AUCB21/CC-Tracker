import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Not on the deck."
        sub="This route does not exist, or the record it points to was removed."
      />
      <Card>
        <div className="flex flex-col items-start gap-4 py-4">
          <p className="text-sm text-muted">
            If you followed a link from an old session, the session or plan may have been deleted.
          </p>
          <Link
            href="/"
            className="rounded-md bg-accent px-4 py-2 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-background transition-opacity hover:opacity-90"
          >
            Back to overview
          </Link>
        </div>
      </Card>
    </>
  );
}
