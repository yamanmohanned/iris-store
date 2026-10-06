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

describe("admin editing helpers", async () => {
  const { editableToHtml, htmlToEditable } = await import("@/lib/rich-text");
  const { moneyInputValue, parseMoneyInput } = await import("@/lib/money");

  it("round-trips descriptions between stored HTML and editable text", () => {
    const html =
      "<p>قطن ناعم<br>مريح جداً</p><ul><li>غسيل يدوي</li><li>لا يُكوى</li></ul><p>A &amp; B</p>";
    const text = htmlToEditable(html);
    expect(text).toBe("قطن ناعم\nمريح جداً\n\n• غسيل يدوي\n• لا يُكوى\n\nA & B");
    expect(editableToHtml(text)).toBe(html);
    expect(editableToHtml("<script>x</script>")).toBe("<p>&lt;script&gt;x&lt;/script&gt;</p>");
    expect(editableToHtml("   ")).toBe("");
  });

  it("supports headings, numbered lists and bold for pages", () => {
    const html =
      "<p>مرحباً بك في <strong>{{storeName}}</strong>.</p><h2>لماذا نحن؟</h2>" +
      "<ul><li>توصيل سريع</li><li><strong>دفع</strong> عند الاستلام</li></ul>" +
      "<h3>خطوات الإرجاع</h3><ol><li>تواصل معنا</li><li>أرسل المنتج</li></ol><p>شكراً لك</p>";
    const text = htmlToEditable(html);
    expect(text).toBe(
      "مرحباً بك في **{{storeName}}**.\n\n## لماذا نحن؟\n\n• توصيل سريع\n• **دفع** عند الاستلام\n\n" +
        "### خطوات الإرجاع\n\n1. تواصل معنا\n2. أرسل المنتج\n\nشكراً لك",
    );
    expect(editableToHtml(text)).toBe(html);
    // Seeded HTML has newlines between tags: they must not split lists.
    const seeded =
      "<p>مرحباً</p>\n<ul>\n  <li>أ</li>\n  <li>ب</li>\n</ul>\n<p>شكراً <strong>لك</strong> جداً</p>";
    expect(htmlToEditable(seeded)).toBe("مرحباً\n\n• أ\n• ب\n\nشكراً **لك** جداً");
    expect(editableToHtml(htmlToEditable(seeded))).toBe(
      "<p>مرحباً</p><ul><li>أ</li><li>ب</li></ul><p>شكراً <strong>لك</strong> جداً</p>",
    );
    // A paragraph line followed by bullets in the same block becomes a paragraph and a list.
    expect(editableToHtml("المميزات:\n- خفيف\n- متين")).toBe(
      "<p>المميزات:</p><ul><li>خفيف</li><li>متين</li></ul>",
    );
    // "**" never becomes a bullet, and stray markup stays text.
    expect(editableToHtml("**مهم** <b>x</b>")).toBe(
      "<p><strong>مهم</strong> &lt;b&gt;x&lt;/b&gt;</p>",
    );
  });

  it("parses prices typed with Arabic digits, separators and decimals", () => {
    expect(parseMoneyInput("25,000", 0)).toBe(25_000);
    expect(parseMoneyInput("٢٥٠٠٠", 0)).toBe(25_000);
    expect(parseMoneyInput("12.5", 2)).toBe(1_250);
    expect(parseMoneyInput("12.555", 2)).toBeNull();
    expect(parseMoneyInput("12.5", 0)).toBeNull();
    expect(parseMoneyInput("abc", 0)).toBeNull();
    expect(parseMoneyInput("-5", 0)).toBeNull();
    expect(moneyInputValue(1_250, 2)).toBe("12.50");
    expect(moneyInputValue(25_000, 0)).toBe("25000");
  });
});
