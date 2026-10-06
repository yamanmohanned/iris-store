import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { placeGuestOrder, register, signInAsStaff, uniqueEmail } from "./helpers";

/**
 * Automated accessibility audit (axe-core, WCAG 2.2 A/AA rules) of the main pages, on the phone
 * and desktop layouts. Serious and critical violations fail the test; every finding is printed and
 * the full report is attached to the test results.
 */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await test.info().attach(`axe ${name}`, {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });
  const describe = (v: (typeof violations)[number]) =>
    `${v.impact} ${v.id}: ${v.help} → ${v.nodes
      .slice(0, 3)
      .map((n) => n.target.join(" "))
      .join(" | ")}`;
  if (violations.length)
    console.log(
      `[a11y ${test.info().project.name}] ${name}\n  ${violations.map(describe).join("\n  ")}`,
    );
  const blocking = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect.soft(blocking.map(describe), `accessibility of ${name}`).toEqual([]);
}

test.describe("accessibility", () => {
  // Each page is scanned in full: allow for it.
  test.slow();

  test("storefront pages", async ({ page }) => {
    await page.goto("/");
    await audit(page, "home");
    await page.goto("/categories");
    await audit(page, "categories");
    await page.goto("/c/accessories");
    await audit(page, "category listing");
    await page
      .getByRole("link", { name: /ساعة يد كلاسيكية/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/p\//);
    await audit(page, "product");
    await page
      .locator("button")
      .filter({ hasText: "أضف إلى السلة" })
      .filter({ visible: true })
      .click();
    await expect(page.getByText("أُضيف إلى السلة").first()).toBeVisible();
    await page.goto("/cart");
    await audit(page, "cart");
    await page.goto("/checkout");
    await audit(page, "checkout");
    await page.goto("/search?q=ساعة");
    await audit(page, "search");
    await page.goto("/track");
    await audit(page, "order tracking");
    await page.goto("/pages/about");
    await audit(page, "static page");
    await page.goto("/contact");
    await audit(page, "contact");
    await page.goto("/en");
    await audit(page, "home (English)");
  });

  test("sign-in pages and order confirmation", async ({ page }) => {
    await page.goto("/login");
    await audit(page, "login");
    await page.goto("/register");
    await audit(page, "register");
    await page.goto("/forgot-password");
    await audit(page, "forgot password");
    await placeGuestOrder(page, { category: "/c/beauty", name: /عطر زهري فاخر/ });
    await audit(page, "order confirmation");
  });

  test("customer account", async ({ page }) => {
    await register(page, uniqueEmail("a11y"));
    for (const [path, name] of [
      ["/account", "account"],
      ["/account/orders", "my orders"],
      ["/account/addresses", "addresses"],
      ["/account/wishlist", "wishlist"],
      ["/account/security", "security"],
    ]) {
      await page.goto(path!);
      await audit(page, name!);
    }
  });

  test("admin dashboard", async ({ page }) => {
    await signInAsStaff(page);
    await audit(page, "admin home");
    for (const [path, name] of [
      ["/admin/orders", "admin orders"],
      ["/admin/products", "admin products"],
      ["/admin/products/new", "admin product editor"],
      ["/admin/products/import", "admin product import"],
      ["/admin/categories", "admin categories"],
      ["/admin/coupons", "admin coupons"],
      ["/admin/shipping", "admin shipping"],
      ["/admin/storefront", "admin storefront"],
      ["/admin/pages", "admin pages"],
      ["/admin/settings", "admin settings"],
      ["/admin/settings/branding", "admin branding"],
      ["/admin/customers", "admin customers"],
      ["/admin/audit", "admin audit log"],
    ]) {
      await page.goto(path!);
      await audit(page, name!);
    }
    await page.goto("/admin/orders");
    await page.locator("main a[href*='/admin/orders/']").filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/orders\/[^/]+$/);
    await audit(page, "admin order");
  });
});
