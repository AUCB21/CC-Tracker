import type { Metadata } from "next";
import { PageHeader, SetupBanner } from "@/components/ui";
import { getRecentTaskRuns, getRecentActiveEvents, getProjects } from "@/lib/queries";
import { isDbConfigured } from "@/lib/supabase";
import { LiveFeed } from "./live-feed";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Live" };

type Search = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function LivePage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const projectId = typeof sp.project === "string" ? sp.project : undefined;
  const sessionId = typeof sp.session === "string" ? sp.session : undefined;

  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Live" />
        <SetupBanner />
      </>
    );
  }

  const [runs, events, projects] = await Promise.all([
    getRecentTaskRuns({ projectId, limit: 50 }),
    getRecentActiveEvents({ sessionId, limit: 200 }),
    getProjects(),
  ]);

  return (
    <>
      <PageHeader
        title="Live"
        sub="Remote task runs and session events in real time."
      />
      <LiveFeed
        initialRuns={(runs ?? []).toReversed()}
        initialEvents={(events ?? []).toReversed()}
        projects={projects ?? []}
        filterProject={projectId}
        filterSession={sessionId}
      />
    </>
  );
}
