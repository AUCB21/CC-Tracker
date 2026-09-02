import { checkApiKey, getSupabase } from "@/lib/supabase";
import { processHook, type HookPayload } from "@/lib/ingest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const authErr = checkApiKey(req);
  if (authErr) return authErr;

  const db = getSupabase();
  if (!db) {
    return Response.json(
      { error: "Supabase is not configured (set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 }
    );
  }

  let payload: HookPayload;
  try {
    payload = (await req.json()) as HookPayload;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!payload.session_id) {
    return Response.json({ error: "missing session_id" }, { status: 400 });
  }

  try {
    const result = await processHook(db, payload);
    return Response.json(result);
  } catch (e) {
    console.error("[ingest/hook]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "ingest failed" },
      { status: 500 }
    );
  }
}
