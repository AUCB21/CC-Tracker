import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";

const HEARTBEAT_FILE = join(process.cwd(), ".heartbeat");

export async function POST() {
  await writeFile(HEARTBEAT_FILE, String(Date.now()));
  return new Response(null, { status: 204 });
}
