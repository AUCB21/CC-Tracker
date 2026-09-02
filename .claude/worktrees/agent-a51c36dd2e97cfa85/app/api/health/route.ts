import { isDbConfigured, ingestionKeyConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    db_configured: isDbConfigured(),
    ingestion_key_configured: ingestionKeyConfigured(),
  });
}
