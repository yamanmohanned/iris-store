import { expect, test, type Page } from "@playwright/test";
import { uniqueEmail, waitForMail } from "./helpers";

function visible(page: Page, name: RegExp | string) {
  return page.getByRole("button", { name }).filter({ visible: true }).first();
}

async function addSneakersToCart(page: Page, size: string) {
  await page.goto("/c/shoes");
  await page
    .getByRole("link", { name: /حذاء رياضي خفيف/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/p\//);
  await page
    .getByRole("radiogroup", { name: "المقاس" })
    .getByRole("radio", { name: size, exact: true })
    .click();
  await page
    .locator("button")
    .filter({ hasText: "أضف إلى السلة" })
    .filter({ visible: true })
    .click();
  await expect(page.getByText("أُضيف إلى السلة").first()).toBeVisible();
}

test.describe("cart and checkout", () => {
  test("a guest buys with cash on delivery, gets the confirmation email and can track the order", async ({
    page,
  }) => {
    const email = uniqueEmail("buyer");
    // Unique per run: the demo coupon is limited to one use per phone number.
    const local = `0771${String(Date.now()).slice(-7)}`;
    const international = `+964 ${local.slice(1, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
    await addSneakersToCart(page, "42");

    // Cart: badge, quantity and the demo coupon.
    await page.goto("/cart");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("سلة التسوق");
    await visible(page, "زيادة الكمية").click();
    await expect(
      page.getByRole("group", { name: /كمية حذاء رياضي خفيف/ }).locator("output"),
    ).toHaveText("2");
    await page.getByLabel("كود الخصم").fill("welcome10");
    await page.getByRole("button", { name: "تطبيق" }).click();
    await expect(page.getByText("WELCOME10", { exact: true })).toBeVisible();
    await expect(page.getByText(/وفّرت/)).toBeVisible();

    await page
      .getByRole("link", { name: /إتمام الطلب/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/checkout$/);

    // Required fields are checked before anything is sent.
    await visible(page, /تأكيد الطلب/).click();
    await expect(page.getByText("مطلوب").first()).toBeVisible();

    await page.getByLabel("الاسم الكامل").fill("زينب علي");
    await page.getByLabel("رقم الهاتف").fill(local);
    await page.getByLabel(/البريد الإلكتروني/).fill(email);
    await page.getByLabel("المحافظة").selectOption({ label: "بغداد — 5,000 د.ع" });
    await page.getByLabel("المدينة / القضاء").fill("الكرادة");
    await page.getByLabel(/أقرب نقطة دالة/).fill("قرب جامع الرحمن");
    // Live total: 2 × 45,000 − 10% + 5,000 delivery.
    await expect(page.getByText("86,000 د.ع").first()).toBeVisible();
    await visible(page, /تأكيد الطلب/).click();

    await expect(page).toHaveURL(/\/order\/[A-Za-z0-9_-]{43}\?placed=1$/);
    await expect(page.getByRole("heading", { name: /تم استلام طلبك/ })).toBeVisible();
    await expect(page.getByText("86,000 د.ع").first()).toBeVisible();
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
    const number = (await page
      .getByText(/^#\d+$/)
      .first()
      .textContent())!.slice(1);
    const orderUrl = new URL(page.url());

    const mail = await waitForMail(email, new RegExp(number));
    expect(mail.html).toContain(orderUrl.pathname);

    // The cart is empty again.
    await page.goto("/cart");
    await expect(page.getByText("سلتك فارغة")).toBeVisible();

    // Tracking needs the matching phone (any format).
    await page.goto("/track");
    await page.getByLabel("رقم الطلب").fill(number);
    await page.getByLabel("رقم الهاتف").fill("07709999999");
    await page.getByRole("button", { name: "عرض الطلب" }).click();
    await expect(page.getByText(/لم نجد طلباً/)).toBeVisible();
    await page.getByLabel("رقم الهاتف").fill(international);
    await page.getByRole("button", { name: "عرض الطلب" }).click();
    await expect(page).toHaveURL(new RegExp(`${orderUrl.pathname}$`));
  });

  test("checkout is not reachable with an empty cart, and order links cannot be guessed", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/cart$/);
    const response = await page.goto(`/order/${"a".repeat(43)}`);
    expect(response?.status()).toBe(404);
  });
});
