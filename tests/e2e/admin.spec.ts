import { expect, test } from "@playwright/test";
import { placeGuestOrder, signInAsStaff } from "./helpers";

test.describe("admin: orders", () => {
  test("staff confirm, ship and deliver an order; a cancelled order shows the reason to the customer", async ({
    page,
    browser,
  }) => {
    // Two guest orders from a separate browser.
    const guestContext = await browser.newContext();
    const guest = await guestContext.newPage();
    const delivered = await placeGuestOrder(guest);
    const cancelled = await placeGuestOrder(guest);
    const cancelledUrl = guest.url();

    await signInAsStaff(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("أهلاً");
    await expect(page.getByText("بانتظار التأكيد").first()).toBeVisible();

    // Find the order by number from the list's search box.
    await page.goto("/admin/orders");
    await page.getByPlaceholder("رقم الطلب أو الهاتف أو الاسم").fill(`#${delivered}`);
    await page.getByRole("button", { name: "بحث" }).click();
    await page
      .locator(`a[href$="/admin/orders/${delivered}"]`)
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(delivered);

    const steps: [action: string, status: string][] = [
      ["تأكيد الطلب", "مؤكد"],
      ["بدء التجهيز", "قيد التجهيز"],
      ["تم الشحن", "تم الشحن"],
      ["تم التوصيل", "تم التوصيل"],
    ];
    for (const [action, status] of steps) {
      await page.getByRole("button", { name: action, exact: true }).click();
      await expect(
        page.getByRole("heading", { level: 1 }).getByText(status, { exact: true }),
      ).toBeVisible();
    }
    // Cash on delivery is recorded as paid on delivery.
    await expect(
      page.getByRole("heading", { level: 1 }).getByText("مدفوع", { exact: true }),
    ).toBeVisible();

    // Cancel the other order with a reason.
    await page.goto(`/admin/orders/${cancelled}`);
    await page.getByRole("button", { name: "إلغاء الطلب" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").fill("طلب الزبون الإلغاء");
    await dialog.getByRole("button", { name: "تأكيد الإلغاء" }).click();
    await expect(
      page.getByRole("heading", { level: 1 }).getByText("ملغي", { exact: true }),
    ).toBeVisible();

    // The customer sees it on their order page.
    await guest.goto(cancelledUrl.split("?")[0]!);
    await expect(guest.getByText("تم إلغاء هذا الطلب.")).toBeVisible();
    await guestContext.close();
  });

  test("the admin is not reachable for signed-out visitors", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin/);
  });
});
