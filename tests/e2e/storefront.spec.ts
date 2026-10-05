import { expect, test, type Page } from "@playwright/test";

/** The purchase button exists twice (desktop panel + phone bar); only one is visible per viewport. */
function buyButton(page: Page) {
  return page
    .locator("button")
    .filter({ hasText: /أضف إلى السلة|اختر|نفدت الكمية/ })
    .filter({ visible: true });
}

test.describe("storefront browsing", () => {
  test("home → category → product, choosing a size", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "تشكيلة الموسم الجديد" }).filter({ visible: true }).first(),
    ).toBeVisible();

    await page.getByRole("main").getByRole("link", { name: "أحذية", exact: true }).first().click();
    await expect(page).toHaveURL(/\/c\/shoes$/);
    await expect(page.getByRole("heading", { level: 1, name: "أحذية" })).toBeVisible();

    await page
      .getByRole("link", { name: /حذاء رياضي خفيف/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/p\//);
    await expect(page.getByRole("heading", { level: 1, name: "حذاء رياضي خفيف" })).toBeVisible();

    // A size must be chosen before buying; the button says which option is missing.
    await expect(buyButton(page)).toHaveText(/اختر المقاس/);
    const sizes = page.getByRole("radiogroup", { name: "المقاس" });
    await sizes.getByRole("radio", { name: "41", exact: true }).click();
    await expect(sizes.getByRole("radio", { name: "41", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(buyButton(page)).toHaveText(/أضف إلى السلة/);
    await expect(page.getByText(/^(متوفر|بقي \d+ فقط — اطلب الآن)$/)).toBeVisible();
  });

  test("product pages carry structured data and unknown products return 404", async ({ page }) => {
    await page.goto("/c/accessories");
    await page
      .getByRole("link", { name: /ساعة يد كلاسيكية/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/p\//);
    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
    type Thing = { "@type": string; offers?: { availability?: string } };
    const product = jsonLd
      .flatMap((s) => JSON.parse(s) as Thing | Thing[])
      .find((d) => d["@type"] === "Product");
    expect(product?.offers?.availability).toBe("https://schema.org/InStock");

    const missing = await page.goto("/p/this-product-does-not-exist");
    expect(missing?.status()).toBe(404);
  });

  test("search tolerates Arabic spelling variants and shows suggestions while typing", async ({
    page,
  }) => {
    await page.goto("/search");
    const box = page.getByPlaceholder("ابحث عن منتج أو قسم…");

    // "ى" instead of "ي" and no hamza: still finds "حذاء رياضي خفيف".
    await box.fill("حذاء رياضى");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("نتائج");
    await expect(page.getByRole("link", { name: /حذاء رياضي خفيف/ }).first()).toBeVisible();

    await box.fill("عباي");
    const suggestion = page.getByRole("link", { name: /عباية كلاسيكية سوداء/ }).first();
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await expect(page).toHaveURL(/\/p\//);
    await expect(
      page.getByRole("heading", { level: 1, name: "عباية كلاسيكية سوداء" }),
    ).toBeVisible();

    await page.goto("/search?q=zzzqqq");
    await expect(page.getByText("لا توجد منتجات مطابقة")).toBeVisible();
  });

  test("filters and sorting live in the URL", async ({ page }) => {
    await page.goto("/c/women");
    await page.getByRole("button", { name: "تصفية" }).click();
    await page.getByRole("switch", { name: "العروض فقط" }).click();
    await page
      .getByRole("button", { name: "عرض النتائج" })
      .filter({ visible: true })
      .last()
      .click();
    await expect(page).toHaveURL(/sale=1/);
    await expect(page.getByRole("button", { name: "1 فلتر" })).toBeVisible();
    await expect(page.getByRole("link", { name: /فستان صيفي بأكمام قصيرة/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /عباية كلاسيكية سوداء/ })).toHaveCount(0);

    await page.locator("select").selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);
    await expect(page).toHaveURL(/sale=1/);
  });

  test("English storefront", async ({ page }) => {
    await page.goto("/en/c/shoes");
    await expect(page.getByRole("heading", { level: 1, name: "Shoes" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Lightweight sneakers/ }).first()).toBeVisible();
  });

  test("phones get a bottom tab bar that leads to all categories", async ({ page, isMobile }) => {
    test.skip(!isMobile, "bottom tab bar is phone-only");
    await page.goto("/");
    const tabs = page.getByRole("navigation", { name: "التنقل السريع" });
    await expect(tabs).toBeVisible();
    await tabs.getByRole("link", { name: "الأقسام" }).click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(tabs.getByRole("link", { name: "الأقسام" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
