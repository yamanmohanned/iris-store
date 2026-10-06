import { env } from "@/server/env";
import { logger } from "@/server/logger";
import { secretMatches } from "@/server/security/secrets";
import { CRON_JOBS, type CronJob } from "@/server/services/maintenance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Scheduled jobs, called by a cron service with `Authorization: Bearer $CRON_SECRET`:
 *   POST /api/cron/outbox   every minute  — deliver due emails (retries after failures)
 *   POST /api/cron/cleanup  once a day    — expired carts, sessions, codes, counters, old emails
 * Disabled (404) until CRON_SECRET is set. GET is accepted too for cron services that only GET.
 */
async function handle(request: Request, { params }: RouteContext<"/api/cron/[job]">) {
  const secret = env().CRON_SECRET;
  const { job } = await params;
  if (!secret || !Object.hasOwn(CRON_JOBS, job)) return json({ error: "not_found" }, 404);
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secretMatches(provided, secret)) return json({ error: "unauthorized" }, 401);
  try {
    const result = await CRON_JOBS[job as CronJob]();
    return json({ ok: true, job, result });
  } catch (error) {
    logger.error({ err: error, job }, "cron job failed");
    return json({ ok: false, job, error: "internal" }, 500);
  }
}

export const GET = handle;
export const POST = handle;
