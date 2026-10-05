import { describe, expect, it } from "vitest";
import { hasText, tl } from "@/lib/localized";
import { discountPercent, formatMoney, toMajor, toMinor } from "@/lib/money";
import { escapeLike, normalizeSearchText } from "@/lib/search";
import { isValidSlug, slugify } from "@/lib/slug";

describe("normalizeSearchText", () => {
  it("folds Arabic letter variants, diacritics and tatweel", () => {
    expect(normalizeSearchText("أحذيةٌ")).toBe(normalizeSearchText("احذيه"));
    expect(normalizeSearchText("إكسسوارات")).toBe("اكسسوارات");
    expect(normalizeSearchText("مستشفى")).toBe("مستشفي");
    expect(normalizeSearchText("جـــميل")).toBe("جميل");
  });

  it("converts Arabic-Indic digits and lowercases Latin text", () => {
    expect(normalizeSearchText("موديل ٢٠٢٥ NEW")).toBe("موديل 2025 new");
    expect(normalizeSearchText("۱۲۳")).toBe("123");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeSearchText("  T-Shirt,   (Cotton)!! ")).toBe("t shirt cotton");
  });

  it("escapes LIKE wildcards", () => {
    expect(escapeLike("100%_off\\")).toBe("100\\%\\_off\\\\");
  });
});

describe("slugify", () => {
  it("keeps Arabic and Latin words joined by hyphens", () => {
    expect(slugify("فستان صيفي – أزرق!")).toBe("فستان-صيفي-أزرق");
    expect(slugify("  Summer Dress 2025 ")).toBe("summer-dress-2025");
    expect(slugify("قميص ـــ قطني")).toBe("قميص-قطني");
  });

  it("validates slugs", () => {
    expect(isValidSlug("فستان-صيفي")).toBe(true);
    expect(isValidSlug("summer-dress")).toBe(true);
    expect(isValidSlug("bad slug")).toBe(false);
    expect(isValidSlug("-start")).toBe(false);
    expect(isValidSlug("../etc/passwd")).toBe(false);
  });
});

describe("money", () => {
  it("converts between major and minor units", () => {
    expect(toMinor(12.5, 3)).toBe(12500);
    expect(toMajor(12500, 3)).toBe(12.5);
    expect(toMinor(25000, 0)).toBe(25000);
  });

  it("formats Arabic prices with Latin digits and a clean symbol", () => {
    expect(formatMoney(25000, { currency: "IQD", decimals: 0 }, "ar")).toBe("25,000 د.ع");
    expect(formatMoney(1999, { currency: "SAR", decimals: 2 }, "ar")).toBe("19.99 ر.س");
  });

  it("formats English prices with the currency code", () => {
    expect(formatMoney(25000, { currency: "IQD", decimals: 0 }, "en")).toBe("IQD\u00A025,000");
  });

  it("computes discount percentages only for real discounts", () => {
    expect(discountPercent(7500, 10000)).toBe(25);
    expect(discountPercent(10000, 10000)).toBeNull();
    expect(discountPercent(10000, null)).toBeNull();
  });
});

describe("localized text", () => {
  it("falls back to the other language when a translation is missing", () => {
    expect(tl({ ar: "فستان", en: "Dress" }, "en")).toBe("Dress");
    expect(tl({ ar: "فستان" }, "en")).toBe("فستان");
    expect(tl({ en: "Dress", ar: "  " }, "ar")).toBe("Dress");
    expect(tl(null, "ar")).toBe("");
    expect(hasText({ ar: " " })).toBe(false);
  });
});
