import "server-only";
import { and, count, eq, or, sql, type SQL } from "drizzle-orm";
import { toLatinDigits } from "@/lib/phone";
import type { CouponTerms } from "@/lib/pricing";
import { db, type DbExecutor } from "@/server/db/client";
import { couponRedemptions, coupons } from "@/server/db/schema";

export type Coupon = typeof coupons.$inferSelect;

export type CouponIssue =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "used_up"
  | "already_used"
  | "min_subtotal";

/** Codes are case-insensitive and typed loosely on phones: "welcome 10" → "WELCOME10". */
export function normalizeCouponCode(input: string): string | null {
  const code = toLatinDigits(input).replace(/\s+/g, "").toUpperCase();
  return /^[\p{L}\p{N}_-]{2,40}$/u.test(code) ? code : null;
}

export async function findCoupon(code: string, executor: DbExecutor = db): Promise<Coupon | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const [row] = await executor.select().from(coupons).where(eq(coupons.code, normalized)).limit(1);
  return row ?? null;
}

export function couponTerms(c: Coupon): CouponTerms {
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
  };
}

/** Rules that do not depend on who is buying. The minimum subtotal is reported by the pricing step. */
export function couponStaticIssue(c: Coupon, now = new Date()): CouponIssue | null {
  if (!c.isActive) return "inactive";
  if (c.startsAt && c.startsAt > now) return "not_started";
  if (c.endsAt && c.endsAt <= now) return "expired";
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return "used_up";
  return null;
}

/** Has this customer (account or phone number) used up their redemptions of the coupon? */
export async function couponCustomerIssue(
  c: Coupon,
  who: { userId?: string | null; phone?: string | null },
  executor: DbExecutor = db,
): Promise<CouponIssue | null> {
  if (c.usageLimitPerCustomer == null) return null;
  const conditions: SQL[] = [];
  if (who.userId) conditions.push(eq(couponRedemptions.userId, who.userId));
  if (who.phone) conditions.push(eq(couponRedemptions.customerPhone, who.phone));
  if (conditions.length === 0) return null;
  const [row] = await executor
    .select({ n: count() })
    .from(couponRedemptions)
    .where(and(eq(couponRedemptions.couponId, c.id), or(...conditions)));
  return (row?.n ?? 0) >= c.usageLimitPerCustomer ? "already_used" : null;
}

/**
 * Inside the order transaction: serialize redemptions per customer (advisory lock), re-check the
 * per-customer limit and take one use atomically — two simultaneous orders can never both pass a
 * limit. Returns null on success, or why the coupon can no longer be used.
 */
export async function claimCouponUse(
  tx: DbExecutor,
  c: Coupon,
  who: { userId?: string | null; phone: string },
): Promise<CouponIssue | null> {
  // One lock per identity (sorted, so concurrent transactions never deadlock).
  const keys = [`coupon:${c.id}:phone:${who.phone}`];
  if (who.userId) keys.push(`coupon:${c.id}:user:${who.userId}`);
  for (const key of keys.sort())
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`);
  const customerIssue = await couponCustomerIssue(c, who, tx);
  if (customerIssue) return customerIssue;
  const claimed = await tx
    .update(coupons)
    .set({ usedCount: sql`${coupons.usedCount} + 1` })
    .where(
      and(
        eq(coupons.id, c.id),
        eq(coupons.isActive, true),
        sql`(${coupons.usageLimit} is null or ${coupons.usedCount} < ${coupons.usageLimit})`,
        sql`(${coupons.startsAt} is null or ${coupons.startsAt} <= now())`,
        sql`(${coupons.endsAt} is null or ${coupons.endsAt} > now())`,
      ),
    )
    .returning({ id: coupons.id });
  return claimed.length === 1 ? null : "used_up";
}
