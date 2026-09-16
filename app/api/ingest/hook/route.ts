import { handlerWithDb } from "@/lib/api";
import { processHook, type HookPayload } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export const POST = handlerWithDb(
  (raw): HookPayload | null => (raw && typeof raw === "object" ? (raw as HookPayload) : null),
  async ({ db, body }) => {
    if (!body.session_id) {
      return Response.json({ error: "missing session_id" }, { status: 400 });
    }
    const result = await processHook(db, body);
    return Response.json(result);
  },
);
