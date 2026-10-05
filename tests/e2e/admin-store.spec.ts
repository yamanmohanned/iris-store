import { expect, test } from "@playwright/test";
import { signInAsStaff } from "./helpers";

test.describe("admin: store setup", () => {
  test("a coupon and a delivery area created by staff work at checkout", async ({
    page,
    browser,
  }, info) => {
    const suffix = `${info.project.name === "mobile" ? "M" : "D"}${Date.now() % 100000}`;
    const code = `E2E${suffix}`;
    const area = `منطقة ${suffix}`;
    await signInAsStaff(page);

    await page.goto("/admin/shipping");
    await page.getByRole("button", { name: "منطقة جديدة" }).click();
    const zoneSheet = page.getByRole("dialog", { name: "منطقة جديدة" });
    await zoneSheet.getByLabel("اسم المنطقة").fill(area);
    await zoneSheet.getByLabel("أجرة التوصيل").fill("3000");
    await zoneSheet.getByRole("button", { name: "حفظ" }).click();
    await expect(zoneSheet).toBeHidden();
    await expect(page.getByRole("listitem").filter({ hasText: area })).toContainText("3,000 د.ع");

    await page.goto("/admin/coupons");
    await page.getByRole("button", { name: "كوبون جديد" }).click();
    const couponSheet = page.getByRole("dialog", { name: "كوبون جديد" });
    await couponSheet.getByLabel("الكود").fill(code.toLowerCase());
    await couponSheet.getByLabel("نسبة الخصم").fill("20");
    await expect(couponSheet.getByText("خصم 20%")).toBeVisible();
    await couponSheet.getByRole("button", { name: "حفظ" }).click();
    await expect(couponSheet).toBeHidden();
    const ticket = page.getByRole("listitem").filter({ hasText: code });
    await expect(ticket).toContainText("فعّال");
    await expect(ticket).toContainText("لم يُستخدم بعد");

    // A guest uses both: 27,000 − 20% + 3,000 delivery.
    const shopper = await (await browser.newContext()).newPage();
    await shopper.goto(`/search?q=${encodeURIComponent("سيروم")}`);
    await shopper
      .getByRole("link", { name: /سيروم للعناية بالبشرة/ })
      .first()
      .click();
    await shopper
      .locator("button")
      .filter({ hasText: "أضف إلى السلة" })
      .filter({ visible: true })
      .click();
    await expect(shopper.getByText("أُضيف إلى السلة").first()).toBeVisible();
    await shopper.goto("/cart");
    await shopper.getByLabel("كود الخصم").fill(code.toLowerCase());
    await shopper.getByRole("button", { name: "تطبيق" }).click();
    await expect(shopper.getByText(code, { exact: true })).toBeVisible();
    await shopper.goto("/checkout");
    await shopper.getByLabel("الاسم الكامل").fill("زبون الكوبون");
    await shopper.getByLabel("رقم الهاتف").fill(`0773${String(Date.now()).slice(-7)}`);
    await shopper.getByLabel("المحافظة").selectOption({ label: `${area} — 3,000 د.ع` });
    await shopper.getByLabel("المدينة / القضاء").fill("المركز");
    await expect(shopper.getByText("24,600 د.ع").first()).toBeVisible();
    await shopper
      .getByRole("button", { name: /تأكيد الطلب/ })
      .filter({ visible: true })
      .click();
    await expect(shopper).toHaveURL(/\/order\//);
    await expect(shopper.getByText("24,600 د.ع").first()).toBeVisible();

    // Back in the dashboard the coupon shows its use and can no longer be deleted.
    await page.reload();
    await expect(ticket).toContainText("استُخدم مرة واحدة");
    await expect(ticket.getByRole("button", { name: "حذف" })).toHaveCount(0);
    await ticket.getByRole("button", { name: "إيقاف" }).click();
    await expect(ticket).toContainText("موقوف");
  });

  test("brand color and announcement bar reach the storefront", async ({ page, browser }, info) => {
    // Store-wide settings: one project is enough (and the two would race each other).
    test.skip(info.project.name !== "mobile", "runs once");
    await signInAsStaff(page);
    await page.goto("/admin/settings");
    await page.getByRole("link", { name: /الهوية والألوان/ }).click();
    await expect(page).toHaveURL(/\/admin\/settings\/branding$/);

    await page.getByRole("radio", { name: "#0f766e" }).click();
    await page.getByRole("switch", { name: "إظهار شريط الإعلان" }).click();
    // Turning the bar on without a text is caught before saving.
    await page.getByRole("button", { name: "حفظ التغييرات" }).click();
    await expect(page.getByText("اكتب نص الإعلان أو أوقف الشريط.")).toBeVisible();
    await page.getByLabel("نص الإعلان", { exact: true }).fill("خصم الجمعة البيضاء");
    await page.getByRole("button", { name: "حفظ التغييرات" }).click();
    await expect(page.getByText("تم حفظ الإعدادات")).toBeVisible();
    await expect(page.getByText("لديك تغييرات غير محفوظة")).toBeHidden();

    const shopper = await (await browser.newContext()).newPage();
    await shopper.goto("/");
    await expect(shopper.getByText("خصم الجمعة البيضاء")).toBeVisible();
    const primary = () =>
      shopper.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
      );
    expect(await primary()).toBe("#0f766e");

    // Put things back for the other specs.
    await page.getByRole("radio", { name: "#3d2c8d" }).click();
    await page.getByRole("switch", { name: "إظهار شريط الإعلان" }).click();
    await page.getByRole("button", { name: "حفظ التغييرات" }).click();
    await expect(page.getByText("لديك تغييرات غير محفوظة")).toBeHidden();
    await shopper.reload();
    await expect(shopper.getByText("خصم الجمعة البيضاء")).toBeHidden();
    expect(await primary()).toBe("#3d2c8d");
  });
});
