import type { Metadata } from "next";
import { PageHeader, SetupBanner, Empty, Badge } from "@/components/ui";
import { getSupabase, isDbConfigured } from "@/lib/supabase";
import { fmtRelative } from "@/lib/format";
import { DecideButtons } from "./decide-buttons";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "HITL" };

type Approval = {
  id: string;
  task_run_id: string | null;
  session_id: string | null;
  tool_name: string | null;
  tool_input: unknown;
  status: "pending" | "approved" | "denied" | "timeout";
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

/** Turns a raw tool_input blob into a short "what am I approving" line, plus
 *  the exact command for Bash calls so the operator can still verify it. */
function summarizeToolInput(
  toolName: string | null,
  input: unknown,
): { headline: string; command?: string } {
  const fallback = `${toolName ?? "Tool"} call`;
  if (typeof input !== "object" || input === null) {
    return { headline: fallback };
  }
  const rec = input as Record<string, unknown>;
  const str = (key: string): string | undefined => (typeof rec[key] === "string" ? (rec[key] as string) : undefined);

  switch (toolName) {
    case "Bash": {
      const headline = str("description") || "Run a shell command";
      const command = str("command");
      return command ? { headline, command } : { headline };
    }
    case "Write": {
      const filePath = str("file_path");
      return { headline: filePath ? `Write file ${filePath}` : "Write a file" };
    }
    case "Edit":
    case "MultiEdit": {
      const filePath = str("file_path");
      return { headline: filePath ? `Edit file ${filePath}` : "Edit a file" };
    }
    case "WebFetch": {
      const url = str("url");
      return { headline: url ? `Fetch ${url}` : "Fetch a URL" };
    }
    default:
      return { headline: str("description") || fallback };
  }
}

async function getPendingApprovals(): Promise<Approval[]> {
  const db = getSupabase();
  if (!db) return [];
  const { data } = await db
    .from("hitl_approvals")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data as Approval[]) ?? [];
}

export default async function HitlPage() {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="HITL Approvals" />
        <SetupBanner />
      </>
    );
  }
  const rows = await getPendingApprovals();

  return (
    <>
      <AutoRefresh />
      <PageHeader
        title="HITL Approvals"
        sub={`${rows.length} pending tool call${rows.length === 1 ? "" : "s"} waiting on you.`}
      />

      {rows.length === 0 ? (
        <Empty>No pending approvals. When a Claude Code hook matches a HITL rule, it will queue here.</Empty>
      ) : (
        <div className="rounded-2xl border border-line bg-panel">
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const summary = summarizeToolInput(r.tool_name, r.tool_input);
              return (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="yellow">{r.tool_name ?? "unknown"}</Badge>
                      <span className="font-mono text-[0.6875rem] text-muted">{r.id.slice(0, 8)}</span>
                      <span className="text-[0.6875rem] text-muted">{fmtRelative(r.created_at)}</span>
                      {r.session_id && (
                        <span className="font-mono text-[0.6875rem] text-muted">
                          session {r.session_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 max-w-[52rem]">
                      <p className="text-[0.8125rem] text-foreground">{summary.headline}</p>
                      {summary.command && (
                        <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-line bg-panel2 p-2 font-mono text-[0.6875rem] leading-relaxed text-foreground">
                          {summary.command}
                        </pre>
                      )}
                      <details className="mt-1.5">
                        <summary className="cursor-pointer text-[0.6875rem] text-muted-2 hover:text-foreground">
                          Show full input
                        </summary>
                        <pre className="mt-1.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-line bg-panel2 p-2 text-[0.6875rem] leading-relaxed text-muted">
                          {JSON.stringify(r.tool_input, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                  <DecideButtons id={r.id} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
