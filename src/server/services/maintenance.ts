import "server-only";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { outboxMessages, rateLimitBuckets, sessions, verifications } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { deleteExpiredCarts } from "./cart";
import { processOutbox } from "./outbox";

/** Sent emails keep customer details: drop them once they are no longer useful for support. */
const SENT_RETENTION_DAYS = 30;
const FAILED_RETENTION_DAYS = 90;

/**
 * Deliver due notifications in batches until none are left or the time budget is spent (a cron
 * request should finish well before proxies time out). Safe to run in parallel: rows are claimed
 * with SKIP LOCKED.
 */
export async function runOutboxJob(opts: { budgetMs?: number; batch?: number } = {}) {
  const budgetMs = opts.budgetMs ?? 20_000;
  const batch = opts.batch ?? 20;
  const started = Date.now();
  let sent = 0;
  let failed = 0;
  let rounds = 0;
  while (Date.now() - started < budgetMs) {
    const r = await processOutbox(batch);
    sent += r.sent;
    failed += r.failed;
    rounds++;
    if (r.sent + r.failed < batch) break;
  }
  const result = { sent, failed, rounds, ms: Date.now() - started };
  if (sent || failed) logger.info(result, "outbox job");
  return result;
}

/** Daily housekeeping: expired carts, sessions, codes, rate-limit counters and old emails. */
export async function runCleanupJob() {
  const [carts, buckets, expiredSessions, codes, sent, failed] = await Promise.all([
    deleteExpiredCarts(),
    db
      .delete(rateLimitBuckets)
      .where(lt(rateLimitBuckets.resetAt, sql`now()`))
      .returning({ key: rateLimitBuckets.key }),
    db
      .delete(sessions)
      .where(lt(sessions.expiresAt, sql`now()`))
      .returning({ id: sessions.id }),
    db
      .delete(verifications)
      .where(lt(verifications.expiresAt, sql`now() - interval '1 day'`))
      .returning({ id: verifications.id }),
    db
      .delete(outboxMessages)
      .where(
        and(
          eq(outboxMessages.status, "sent"),
          lt(outboxMessages.sentAt, sql`now() - make_interval(days => ${SENT_RETENTION_DAYS})`),
        ),
      )
      .returning({ id: outboxMessages.id }),
    db
      .delete(outboxMessages)
      .where(
        and(
          eq(outboxMessages.status, "failed"),
          lt(
            outboxMessages.createdAt,
            sql`now() - make_interval(days => ${FAILED_RETENTION_DAYS})`,
          ),
        ),
      )
      .returning({ id: outboxMessages.id }),
  ]);
  const result = {
    carts,
    rateLimitBuckets: buckets.length,
    sessions: expiredSessions.length,
    verifications: codes.length,
    emails: sent.length + failed.length,
  };
  logger.info(result, "cleanup job");
  return result;
}

export const CRON_JOBS = {
  outbox: () => runOutboxJob(),
  cleanup: () => runCleanupJob(),
} as const;
export type CronJob = keyof typeof CRON_JOBS;
