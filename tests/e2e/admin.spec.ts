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

test.describe("admin: dashboard", () => {
  test("the sales chart reads out each day by keyboard and pointer", async ({ page }) => {
    await signInAsStaff(page);
    const chart = page.getByRole("slider", { name: "المبيعات اليومية — آخر 14 يوماً" });
    await chart.focus();
    await page.keyboard.press("End");
    await expect(chart).toHaveAttribute("aria-valuenow", "13");
    await expect(chart).toHaveAttribute("aria-valuetext", /^.+: .+ · .+$/);
    // Arabic reads right to left: the right arrow goes back a day, the left arrow forward.
    await page.keyboard.press("ArrowRight");
    await expect(chart).toHaveAttribute("aria-valuenow", "12");
    await page.keyboard.press("Home");
    await expect(chart).toHaveAttribute("aria-valuenow", "0");
    await page.keyboard.press("ArrowLeft");
    await expect(chart).toHaveAttribute("aria-valuenow", "1");

    // Pointing anywhere over a day's slot selects it: the first day is at the right edge.
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
    await expect(chart).toHaveAttribute("aria-valuenow", "0");
    await page.mouse.move(box.x + 2, box.y + box.height / 2);
    await expect(chart).toHaveAttribute("aria-valuenow", "13");
  });
});
