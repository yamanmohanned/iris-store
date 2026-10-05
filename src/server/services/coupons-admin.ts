import "server-only";
import { count, desc, eq, sum } from "drizzle-orm";
import { z } from "zod";
import { addDays, dayInZone, isDay, startOfDayInZone } from "@/lib/dates";
import { db } from "@/server/db/client";
import {
  COUPON_TYPES,
  couponRedemptions,
  coupons,
  orders,
  type CouponType,
} from "@/server/db/schema";
import { AppError, isUniqueViolation } from "@/server/errors";
import { audit } from "./audit";
import type { Actor } from "./catalog-admin";
import { couponStaticIssue, normalizeCouponCode, type Coupon } from "./coupons";
import { getSetting } from "./settings";

const MAX_MONEY = 1_000_000_000_000;
const day = z.string().refine(isDay, "day").nullish();

/**
 * Coupon form input. Dates are calendar days in the store's time zone: a coupon runs from the
 * start of `startsOn` through the end of `endsOn`.
 */
export const couponInputSchema = z
  .object({
    code: z
      .string()
      .max(60)
      .transform((value, ctx) => {
        const code = normalizeCouponCode(value);
        if (!code) {
          ctx.addIssue({ code: "custom", message: "code" });
          return z.NEVER;
        }
        return code;
      }),
    description: z.string().trim().max(200).nullish(),
    type: z.enum(COUPON_TYPES),
    value: z.number().int().min(0).max(MAX_MONEY).default(0),
    minSubtotal: z.number().int().min(0).max(MAX_MONEY).nullish(),
    maxDiscount: z.number().int().min(1).max(MAX_MONEY).nullish(),
    startsOn: day,
    endsOn: day,
    usageLimit: z.number().int().min(1).max(10_000_000).nullish(),
    usageLimitPerCustomer: z.number().int().min(1).max(1000).nullish(),
    isActive: z.boolean().default(true),
  })
  .superRefine((c, ctx) => {
    if (c.type === "percentage" && (c.value < 1 || c.value > 100))
      ctx.addIssue({ code: "custom", path: ["value"], message: "percentage" });
    if (c.type === "fixed_amount" && c.value < 1)
      ctx.addIssue({ code: "custom", path: ["value"], message: "amount" });
    if (c.startsOn && c.endsOn && c.endsOn < c.startsOn)
      ctx.addIssue({ code: "custom", path: ["endsOn"], message: "date_order" });
  });
export type CouponInput = z.input<typeof couponInputSchema>;

export type CouponStatus = "active" | "scheduled" | "expired" | "used_up" | "inactive";

export function couponStatus(c: Coupon, now = new Date()): CouponStatus {
  const issue = couponStaticIssue(c, now);
  if (issue === null) return "active";
  return issue === "not_started" ? "scheduled" : (issue as Exclude<CouponStatus, "active">);
}

export type AdminCouponRow = {
  id: string;
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  /** First and last day it can be used, in the store's time zone. */
  startsOn: string | null;
  endsOn: string | null;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  usedCount: number;
  isActive: boolean;
  status: CouponStatus;
  /** Orders that still carry the discount (cancelled orders give their use back). */
  redemptions: number;
  discountTotal: number;
};

export async function listCouponsAdmin(): Promise<AdminCouponRow[]> {
  const [{ timeZone }, rows, stats] = await Promise.all([
    getSetting("general"),
    db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(500),
    db
      .select({
        couponId: couponRedemptions.couponId,
        n: count(),
        total: sum(couponRedemptions.discountAmount).mapWith(Number),
      })
      .from(couponRedemptions)
      .groupBy(couponRedemptions.couponId),
  ]);
  const byCoupon = new Map(stats.map((s) => [s.couponId, s]));
  const now = new Date();
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    maxDiscount: c.maxDiscount,
    startsOn: c.startsAt ? dayInZone(c.startsAt, timeZone) : null,
    // endsAt is exclusive (the start of the following day).
    endsOn: c.endsAt ? dayInZone(new Date(c.endsAt.getTime() - 1), timeZone) : null,
    usageLimit: c.usageLimit,
    usageLimitPerCustomer: c.usageLimitPerCustomer,
    usedCount: c.usedCount,
    isActive: c.isActive,
    status: couponStatus(c, now),
    redemptions: byCoupon.get(c.id)?.n ?? 0,
    discountTotal: byCoupon.get(c.id)?.total ?? 0,
  }));
}

export async function saveCoupon(raw: CouponInput, actor: Actor | null, couponId?: string) {
  const input = couponInputSchema.parse(raw);
  const { timeZone } = await getSetting("general");
  const values = {
    code: input.code,
    description: input.description || null,
    type: input.type,
    value: input.type === "free_shipping" ? 0 : input.value,
    minSubtotal: input.minSubtotal || null,
    maxDiscount: input.type === "percentage" ? (input.maxDiscount ?? null) : null,
    startsAt: input.startsOn ? startOfDayInZone(input.startsOn, timeZone) : null,
    endsAt: input.endsOn ? startOfDayInZone(addDays(input.endsOn, 1), timeZone) : null,
    usageLimit: input.usageLimit ?? null,
    usageLimitPerCustomer: input.usageLimitPerCustomer ?? null,
    isActive: input.isActive,
  };
  try {
    return await db.transaction(async (tx) => {
      const [clash] = await tx
        .select({ id: coupons.id })
        .from(coupons)
        .where(eq(coupons.code, values.code));
      if (clash && clash.id !== couponId)
        throw new AppError("CONFLICT", "code taken", { field: "code" });
      let saved;
      if (couponId) {
        [saved] = await tx.update(coupons).set(values).where(eq(coupons.id, couponId)).returning();
        if (!saved) throw new AppError("NOT_FOUND", "coupon not found");
      } else {
        [saved] = await tx.insert(coupons).values(values).returning();
      }
      await audit(
        {
          action: couponId ? "coupon.update" : "coupon.create",
          actorId: actor?.id,
          actorLabel: actor?.label,
          entityType: "coupon",
          entityId: saved!.id,
          metadata: { code: values.code, type: values.type, value: values.value },
        },
        tx,
      );
      return saved!;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", "code taken", { field: "code" });
    throw error;
  }
}

/** Only never-used coupons can be deleted; used ones are switched off instead (orders keep the code). */
export async function deleteCoupon(couponId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [c] = await tx.select().from(coupons).where(eq(coupons.id, couponId)).for("update");
    if (!c) throw new AppError("NOT_FOUND", "coupon not found");
    const [used] = await tx
      .select({ n: count() })
      .from(orders)
      .where(eq(orders.couponId, couponId));
    if (c.usedCount > 0 || (used?.n ?? 0) > 0)
      throw new AppError("CONFLICT", "coupon has orders", { reason: "used" });
    await tx.delete(coupons).where(eq(coupons.id, couponId));
    await audit(
      {
        action: "coupon.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "coupon",
        entityId: couponId,
        metadata: { code: c.code },
      },
      tx,
    );
  });
}

export async function setCouponActive(couponId: string, isActive: boolean, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .update(coupons)
      .set({ isActive })
      .where(eq(coupons.id, couponId))
      .returning({ code: coupons.code });
    if (!row) throw new AppError("NOT_FOUND", "coupon not found");
    await audit(
      {
        action: isActive ? "coupon.activate" : "coupon.deactivate",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "coupon",
        entityId: couponId,
        metadata: { code: row.code },
      },
      tx,
    );
  });
}
