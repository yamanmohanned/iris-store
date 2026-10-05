import "server-only";
import { createHash } from "node:crypto";
import { lt, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { rateLimitBuckets } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { logger } from "@/server/logger";

export type RateLimitResult = { allowed: boolean; count: number; retryAfter: number };

/** Hash identifiers that contain personal data (emails, phones) before using them as keys. */
export function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("base64url").slice(0, 32);
}

/**
 * Atomic fixed-window counter in PostgreSQL (one UPSERT, safe under concurrency and across
 * multiple app instances). Counts this attempt and reports whether it is within `limit`.
 */
export async function hitRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const result = await db.execute<{ count: number; ttl: number }>(sql`
    insert into rate_limit_buckets (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limit_buckets.reset_at <= now() then 1 else rate_limit_buckets.count + 1 end,
      reset_at = case when rate_limit_buckets.reset_at <= now()
        then now() + make_interval(secs => ${windowSeconds}) else rate_limit_buckets.reset_at end
    returning count, greatest(0, ceil(extract(epoch from (reset_at - now()))))::int as ttl
  `);
  const row = result.rows[0]!;
  if (Math.random() < 0.01) void purgeExpiredBuckets();
  return { allowed: row.count <= limit, count: row.count, retryAfter: row.ttl };
}

/** Current count without incrementing (e.g. "is this account locked?"). */
export async function peekRateLimit(key: string): Promise<number> {
  const result = await db.execute<{ count: number }>(
    sql`select count from rate_limit_buckets where key = ${key} and reset_at > now()`,
  );
  return result.rows[0]?.count ?? 0;
}

export async function resetRateLimit(key: string) {
  await db.execute(sql`delete from rate_limit_buckets where key = ${key}`);
}

/** Count the attempt and throw RATE_LIMITED (with retryAfter seconds) when over the limit. */
export async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const r = await hitRateLimit(key, limit, windowSeconds);
  if (!r.allowed) {
    logger.warn(
      { key: key.split(":").slice(0, 2).join(":"), count: r.count },
      "rate limit exceeded",
    );
    throw new AppError("RATE_LIMITED", "too many requests", { retryAfter: r.retryAfter });
  }
  return r;
}

export async function purgeExpiredBuckets() {
  try {
    await db
      .delete(rateLimitBuckets)
      .where(lt(rateLimitBuckets.resetAt, sql`now() - interval '1 hour'`));
  } catch (err) {
    logger.warn({ err }, "rate limit purge failed");
  }
}
