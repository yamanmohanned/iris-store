/**
 * Order totals — one pure function used by the cart, the checkout page (live, in the browser) and
 * the order transaction (authoritative, on the server), so the customer always sees the same
 * numbers that are charged. All amounts are integers in the currency's minor unit.
 */

export type CouponKind = "percentage" | "fixed_amount" | "free_shipping";

export type CouponTerms = {
  code: string;
  type: CouponKind;
  /** percentage: 1..100 · fixed_amount: minor units · free_shipping: 0 */
  value: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
};

/** The delivery area's fee; `null` while the customer has not chosen an area yet. */
export type ShippingTerms = { fee: number; freeShippingThreshold: number | null } | null;

export type TaxTerms = { enabled: boolean; rateBps: number; pricesIncludeTax: boolean };

export type PricingInput = {
  lines: { unitPrice: number; quantity: number }[];
  coupon?: CouponTerms | null;
  shipping?: ShippingTerms;
  /** Store-wide free-shipping threshold (a zone's own threshold takes precedence). */
  freeShippingThreshold?: number | null;
  tax?: TaxTerms | null;
};

export type PricingResult = {
  subtotal: number;
  discount: number;
  /** null = depends on the delivery area (not chosen yet). */
  shipping: number | null;
  freeShipping: boolean;
  /** Tax amount: included in prices (informational) or added on top, per store settings. */
  tax: number;
  taxIncluded: boolean;
  total: number;
  couponApplied: boolean;
  /** Why an entered coupon does not apply to this cart right now. */
  couponIssue: "min_subtotal" | null;
  /** How much more (after discounts) unlocks free shipping; null when not applicable. */
  amountToFreeShipping: number | null;
};

export function computeTotals(input: PricingInput): PricingResult {
  const subtotal = input.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  let discount = 0;
  let couponApplied = false;
  let couponIssue: PricingResult["couponIssue"] = null;
  let couponFreeShipping = false;
  const coupon = input.coupon;
  if (coupon && subtotal > 0) {
    if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
      couponIssue = "min_subtotal";
    } else {
      couponApplied = true;
      if (coupon.type === "percentage")
        discount = Math.floor((subtotal * Math.min(100, Math.max(0, coupon.value))) / 100);
      else if (coupon.type === "fixed_amount") discount = Math.max(0, coupon.value);
      else couponFreeShipping = true;
      if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
      discount = Math.min(discount, subtotal);
    }
  }

  const merchandise = subtotal - discount;
  const threshold = input.shipping?.freeShippingThreshold ?? input.freeShippingThreshold ?? null;
  const freeShipping =
    couponFreeShipping || (threshold != null && subtotal > 0 && merchandise >= threshold);
  const shipping =
    input.shipping === undefined || input.shipping === null
      ? null
      : freeShipping
        ? 0
        : Math.max(0, input.shipping.fee);

  let tax = 0;
  const tx = input.tax;
  const taxIncluded = Boolean(tx?.enabled && tx.pricesIncludeTax);
  if (tx?.enabled && tx.rateBps > 0) {
    tax = tx.pricesIncludeTax
      ? Math.round((merchandise * tx.rateBps) / (10_000 + tx.rateBps))
      : Math.round((merchandise * tx.rateBps) / 10_000);
  }

  const total = merchandise + (shipping ?? 0) + (taxIncluded ? 0 : tax);
  const amountToFreeShipping =
    threshold != null && !freeShipping && subtotal > 0 ? threshold - merchandise : null;

  return {
    subtotal,
    discount,
    shipping,
    freeShipping,
    tax,
    taxIncluded,
    total,
    couponApplied,
    couponIssue,
    amountToFreeShipping,
  };
}
