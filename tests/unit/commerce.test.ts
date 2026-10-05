import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone, toLatinDigits } from "@/lib/phone";
import { computeTotals, type CouponTerms } from "@/lib/pricing";

describe("normalizePhone", () => {
  const iq = "+964";

  it("accepts the ways Iraqi customers type their mobile number", () => {
    for (const input of [
      "07701234567",
      "0770 123 4567",
      "770-123-4567",
      "٠٧٧٠١٢٣٤٥٦٧",
      "+964 770 123 4567",
      "+964 0770 123 4567",
      "00964 7701234567",
      "9647701234567",
      "‎+964 770 123 4567‎",
    ]) {
      expect(normalizePhone(input, iq), input).toBe("+9647701234567");
    }
  });

  it("rejects numbers that cannot be a mobile number of the store's country", () => {
    for (const input of [
      "",
      "123",
      "0770123456",
      "077012345678",
      "06701234567",
      "abc",
      "+964 1 234",
    ]) {
      expect(normalizePhone(input, iq), input).toBeNull();
    }
  });

  it("applies each country's rules and accepts foreign numbers in international format", () => {
    expect(normalizePhone("0501234567", "+966")).toBe("+966501234567");
    expect(normalizePhone("96512345", "+965")).toBe("+96596512345"); // Kuwaiti local number starting with 965
    expect(normalizePhone("+44 7911 123456", iq)).toBe("+447911123456");
    expect(normalizePhone("+1", iq)).toBeNull();
  });

  it("converts digits and formats for display", () => {
    expect(toLatinDigits("۰۱٢٣")).toBe("0123");
    expect(formatPhone("+9647701234567", iq)).toBe("+964 770 123 4567");
  });
});

describe("computeTotals", () => {
  const lines = [
    { unitPrice: 30_000, quantity: 2 },
    { unitPrice: 15_000, quantity: 1 },
  ];
  const coupon = (c: Partial<CouponTerms>): CouponTerms => ({
    code: "X",
    type: "percentage",
    value: 10,
    minSubtotal: null,
    maxDiscount: null,
    ...c,
  });

  it("sums lines and leaves shipping open until an area is chosen", () => {
    const r = computeTotals({ lines });
    expect(r).toMatchObject({ subtotal: 75_000, discount: 0, shipping: null, total: 75_000 });
  });

  it("adds the area's delivery fee", () => {
    const r = computeTotals({ lines, shipping: { fee: 5_000, freeShippingThreshold: null } });
    expect(r).toMatchObject({ shipping: 5_000, total: 80_000, freeShipping: false });
  });

  it("applies percentage coupons rounded down and capped by max discount", () => {
    expect(computeTotals({ lines, coupon: coupon({ value: 10 }) }).discount).toBe(7_500);
    expect(
      computeTotals({ lines: [{ unitPrice: 999, quantity: 1 }], coupon: coupon({ value: 15 }) })
        .discount,
    ).toBe(149);
    expect(
      computeTotals({ lines, coupon: coupon({ value: 50, maxDiscount: 20_000 }) }).discount,
    ).toBe(20_000);
  });

  it("never discounts more than the subtotal", () => {
    const r = computeTotals({ lines, coupon: coupon({ type: "fixed_amount", value: 1_000_000 }) });
    expect(r).toMatchObject({ discount: 75_000, total: 0 });
  });

  it("reports a coupon whose minimum is not reached instead of applying it", () => {
    const r = computeTotals({ lines, coupon: coupon({ minSubtotal: 100_000 }) });
    expect(r).toMatchObject({ discount: 0, couponApplied: false, couponIssue: "min_subtotal" });
  });

  it("gives free shipping by coupon or by threshold (after discounts)", () => {
    const zone = { fee: 5_000, freeShippingThreshold: null };
    const free = computeTotals({
      lines,
      shipping: zone,
      coupon: coupon({ type: "free_shipping", value: 0 }),
    });
    expect(free).toMatchObject({ shipping: 0, freeShipping: true, total: 75_000 });

    const near = computeTotals({ lines, shipping: zone, freeShippingThreshold: 100_000 });
    expect(near).toMatchObject({ shipping: 5_000, amountToFreeShipping: 25_000 });

    const reached = computeTotals({ lines, shipping: zone, freeShippingThreshold: 70_000 });
    expect(reached).toMatchObject({ shipping: 0, freeShipping: true, amountToFreeShipping: null });

    // 10% off brings 75,000 under the 70,000 threshold → delivery is charged again.
    const afterDiscount = computeTotals({
      lines,
      shipping: zone,
      freeShippingThreshold: 70_000,
      coupon: coupon({ value: 10 }),
    });
    expect(afterDiscount).toMatchObject({ shipping: 5_000, amountToFreeShipping: 2_500 });

    // A zone's own threshold wins over the store-wide one.
    const zoneThreshold = computeTotals({
      lines,
      shipping: { fee: 5_000, freeShippingThreshold: 50_000 },
      freeShippingThreshold: 1_000_000,
    });
    expect(zoneThreshold.shipping).toBe(0);
  });

  it("handles tax included in prices and tax added on top", () => {
    const included = computeTotals({
      lines,
      tax: { enabled: true, rateBps: 1_500, pricesIncludeTax: true },
    });
    expect(included).toMatchObject({ tax: 9_783, taxIncluded: true, total: 75_000 });
    const added = computeTotals({
      lines,
      tax: { enabled: true, rateBps: 1_500, pricesIncludeTax: false },
    });
    expect(added).toMatchObject({ tax: 11_250, taxIncluded: false, total: 86_250 });
  });

  it("treats an empty cart as zero everywhere", () => {
    const r = computeTotals({
      lines: [],
      coupon: coupon({}),
      shipping: { fee: 5_000, freeShippingThreshold: 0 },
    });
    expect(r).toMatchObject({
      subtotal: 0,
      discount: 0,
      couponApplied: false,
      freeShipping: false,
    });
  });
});
