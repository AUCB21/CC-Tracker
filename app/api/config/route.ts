import type { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * POST /api/config
 * Writes NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / CC_TRACKER_API_KEY to .env.local.
 * Refuses outside development or when the request host is not loopback.
 * Rate-limited to 5 writes per rolling minute.
 */

const rateLimit = { count: 0, resetAt: 0 };

function isLocalhost(req: NextRequest): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  return /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

function upsertEnv(current: string, updates: Record<string, string>): string {
  let out = current;
  for (const [k, v] of Object.entries(updates)) {
    const line = `${k}=${v}`;
    const re = new RegExp(`^${k}=.*$`, "m");
    if (re.test(out)) out = out.replace(re, line);
    else out = (out && !out.endsWith("\n") ? out + "\n" : out) + line + "\n";
  }
  return out;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "not available outside development" }, { status: 403 });
  }
  if (!isLocalhost(req)) {
    return Response.json({ error: "localhost only" }, { status: 403 });
  }

  const now = Date.now();
  if (now > rateLimit.resetAt) {
    rateLimit.count = 0;
    rateLimit.resetAt = now + 60_000;
  }
  if (rateLimit.count >= 5) {
    return Response.json({ error: "rate limit exceeded, wait a minute" }, { status: 429 });
  }
  rateLimit.count++;

  let body: { url?: string; serviceRoleKey?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, string> = {};

  if (body.url) {
    try {
      new URL(body.url);
    } catch {
      return Response.json({ error: "invalid URL for NEXT_PUBLIC_SUPABASE_URL" }, { status: 400 });
    }
    updates.NEXT_PUBLIC_SUPABASE_URL = body.url.trim();
  }
  if (body.serviceRoleKey) {
    if (body.serviceRoleKey.length < 20) {
      return Response.json({ error: "supabase secret looks too short" }, { status: 400 });
    }
    updates.SUPABASE_SECRET = body.serviceRoleKey.trim();
  }
  if (body.apiKey) {
    if (body.apiKey.length < 8) {
      return Response.json({ error: "API key must be at least 8 characters" }, { status: 400 });
    }
    updates.CC_TRACKER_API_KEY = body.apiKey.trim();
  }

  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "at least one value is required" }, { status: 400 });
  }

  const envPath = path.join(process.cwd(), ".env.local");
  const tmpPath = envPath + ".tmp";

  try {
    let current = "";
    try {
      current = await fs.readFile(envPath, "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    const next = upsertEnv(current, updates);
    await fs.writeFile(tmpPath, next, "utf8");
    await fs.rename(tmpPath, envPath);
    return Response.json({ ok: true, wrote: Object.keys(updates) });
  } catch (e) {
    console.error("[api/config]", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "write failed" },
      { status: 500 }
    );
  }
}
