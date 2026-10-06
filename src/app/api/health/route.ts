import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

/** Liveness + database check for Docker/uptime monitors. Reveals nothing beyond "ok". */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logger.error({ err: error }, "health check failed");
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
