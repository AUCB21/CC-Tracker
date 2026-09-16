import type { SupabaseClient } from "@supabase/supabase-js";
import { checkApiKey, getSupabase } from "./supabase";

export type ApiRouteHandler<TBody> = (ctx: {
  db: SupabaseClient;
  body: TBody;
  req: Request;
  params: any;
}) => Promise<Response>;

/**
 * Wraps an API route handler with the auth + db-config + JSON-parse boilerplate
 * that every ingest/write endpoint currently repeats. The `fn` callback
 * receives the parsed body and a live `db`; it returns a Response directly, so
 * each route still owns its own response shape (no forced ApiOk/ApiErr
 * envelope — see RFC 05 for the deferred standardization).
 *
 * For dynamic-segment routes ([id], [approvalId]), the returned handler still
 * accepts Next.js's `context.params` and awaits it before calling `fn`, so
 * `ctx.params` is available inside the callback for routes that need it.
 */
export function handlerWithDb<TBody>(
  parseBody: (raw: unknown) => TBody | null,
  fn: ApiRouteHandler<TBody>,
): (req: Request, context?: { params: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req, context) => {
    const authErr = checkApiKey(req);
    if (authErr) return authErr;
    const db = getSupabase();
    if (!db) return Response.json({ error: "Supabase is not configured" }, { status: 503 });
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return Response.json({ error: "invalid JSON body" }, { status: 400 });
    }
    const body = parseBody(raw);
    if (body === null) return Response.json({ error: "invalid body shape" }, { status: 400 });
    const params = context ? await context.params : undefined;
    try {
      return await fn({ db, body, req, params });
    } catch (e) {
      const path = (() => {
        try { return new URL(req.url).pathname; } catch { return req.url; }
      })();
      console.error(`[${path}]`, e);
      return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
    }
  };
}
