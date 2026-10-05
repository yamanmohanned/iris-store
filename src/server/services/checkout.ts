import "server-only";
import { asc, eq } from "drizzle-orm";
import type { LocalizedText } from "@/lib/localized";
import { computeTotals, type CouponTerms, type PricingResult } from "@/lib/pricing";
import { CacheTags, cached } from "@/server/cache";
import { db } from "@/server/db/client";
import { shippingZones } from "@/server/db/schema";
import { purchasableLines, type CartView } from "./cart";
import {
  couponCustomerIssue,
  couponStaticIssue,
  couponTerms,
  findCoupon,
  type CouponIssue,
} from "./coupons";
import { getSettings } from "./settings";

export type ShippingZoneDTO = {
  id: string;
  name: LocalizedText;
  fee: number;
  freeShippingThreshold: number | null;
  minDays: number | null;
  maxDays: number | null;
  codAvailable: boolean;
};

async function loadZones(): Promise<ShippingZoneDTO[]> {
  const rows = await db
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.isActive, true))
    .orderBy(asc(shippingZones.sortOrder), asc(shippingZones.createdAt));
  return rows.map((z) => ({
    id: z.id,
    name: z.name,
    fee: z.fee,
    freeShippingThreshold: z.freeShippingThreshold,
    minDays: z.minDays,
    maxDays: z.maxDays,
    codAvailable: z.codAvailable,
  }));
}

/** Active delivery areas, in the owner's order (cached; invalidated when zones change). */
export const getShippingZones = cached(loadZones, ["shipping:zones"], [CacheTags.shipping]);

export type CouponState = {
  code: string;
  /** Terms usable by `computeTotals`; null when the code cannot be used. */
  terms: CouponTerms | null;
  issue: CouponIssue | null;
};

/** Evaluate a code for a customer (who is optional: per-customer limits need an identity). */
export async function evaluateCoupon(
  code: string,
  who: { userId?: string | null; phone?: string | null } = {},
): Promise<CouponState> {
  const coupon = await findCoupon(code);
  if (!coupon) return { code, terms: null, issue: "not_found" };
  const issue = couponStaticIssue(coupon) ?? (await couponCustomerIssue(coupon, who));
  return { code: coupon.code, terms: issue ? null : couponTerms(coupon), issue };
}

export type CartPricing = {
  totals: PricingResult;
  coupon: CouponState | null;
  /** Checkout settings the UI needs to explain totals. */
  minOrderAmount: number;
};

/** Totals for the cart page (delivery is decided at checkout, once the area is known). */
export async function priceCart(
  view: CartView,
  who: { userId?: string | null } = {},
): Promise<CartPricing> {
  const { checkout } = await getSettings();
  const coupon = view.couponCode ? await evaluateCoupon(view.couponCode, who) : null;
  const totals = computeTotals({
    lines: purchasableLines(view),
    coupon: coupon?.terms ?? null,
    shipping: null,
    freeShippingThreshold: checkout.freeShippingThreshold,
    tax: checkout.tax,
  });
  if (coupon && !coupon.issue && totals.couponIssue) coupon.issue = totals.couponIssue;
  return { totals, coupon, minOrderAmount: checkout.minOrderAmount };
}
