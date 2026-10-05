import { expect, test, type Page } from "@playwright/test";
import { register, uniqueEmail } from "./helpers";

function visible(page: Page, name: RegExp | string) {
  return page.getByRole("button", { name }).filter({ visible: true }).first();
}

const uniquePhone = () => `0772${String(Date.now()).slice(-7)}`;

test.describe("customer account", () => {
  test("a guest cart follows the customer into a new account; orders and addresses are kept", async ({
    page,
  }) => {
    // Shopping as a guest first.
    await page.goto("/c/accessories");
    await page
      .getByRole("link", { name: /ساعة يد كلاسيكية/ })
      .first()
      .click();
    await page
      .locator("button")
      .filter({ hasText: "أضف إلى السلة" })
      .filter({ visible: true })
      .click();
    await expect(page.getByText("أُضيف إلى السلة").first()).toBeVisible();

    const email = uniqueEmail("member");
    await register(page, email, "سارة محمد");

    // The guest cart was merged into the new account.
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: /ساعة يد كلاسيكية/ }).first()).toBeVisible();

    // Signed-in checkout: name and email are prefilled; the address is saved for next time.
    await page
      .getByRole("link", { name: /إتمام الطلب/ })
      .filter({ visible: true })
      .first()
      .click();
    await expect(page.getByLabel("الاسم الكامل")).toHaveValue("سارة محمد");
    await expect(page.getByLabel(/البريد الإلكتروني/)).toHaveValue(email);
    await page.getByLabel("رقم الهاتف").fill(uniquePhone());
    await page.getByLabel("المحافظة").selectOption({ index: 2 });
    await page.getByLabel("المدينة / القضاء").fill("المنصور");
    await expect(page.getByRole("checkbox", { name: "احفظ هذا العنوان في حسابي" })).toBeChecked();
    await visible(page, /تأكيد الطلب/).click();
    await expect(page).toHaveURL(/\/order\//);
    const number = (await page
      .getByText(/^#\d+$/)
      .first()
      .textContent())!;

    // My orders → order details.
    await page.goto("/account");
    await page.getByRole("link", { name: /طلباتي/ }).click();
    await expect(page).toHaveURL(/\/account\/orders$/);
    await page.getByRole("link", { name: new RegExp(number) }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(number.slice(1));
    await expect(page.getByText("بانتظار التأكيد").first()).toBeVisible();

    // Address book: the checkout address is the default; add another, make it default, delete it.
    await page.goto("/account/addresses");
    await expect(page.getByText("المنصور", { exact: false })).toBeVisible();
    await expect(page.getByText("الافتراضي")).toBeVisible();
    await page.getByRole("button", { name: "إضافة عنوان" }).click();
    const sheet = page.getByRole("dialog", { name: "عنوان جديد" });
    await sheet.getByLabel("اسم العنوان").fill("العمل");
    await sheet.getByLabel("الاسم الكامل").fill("سارة محمد");
    await sheet.getByLabel("رقم الهاتف").fill(uniquePhone());
    await sheet.getByLabel("المحافظة").selectOption({ index: 1 });
    await sheet.getByLabel("المدينة / القضاء").fill("الكرخ");
    await sheet.getByRole("checkbox", { name: "اجعله العنوان الافتراضي" }).uncheck();
    await sheet.getByRole("button", { name: "حفظ" }).click();
    await expect(sheet).toBeHidden();
    const work = page.getByRole("listitem").filter({ hasText: "العمل" });
    await expect(work).toBeVisible();
    await work.getByRole("button", { name: "تعيين كافتراضي" }).click();
    await expect(work.getByText("الافتراضي")).toBeVisible();
    await work.getByRole("button", { name: "حذف" }).click();
    await work.getByRole("button", { name: "حذف هذا العنوان؟" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: "العمل" })).toHaveCount(0);
    await expect(page.getByText("الافتراضي")).toBeVisible(); // the remaining address took over
  });

  test("saves products to the wishlist, and asks guests to sign in first", async ({ page }) => {
    await page.goto("/c/beauty");
    await page
      .getByRole("link", { name: /سيروم للعناية بالبشرة/ })
      .first()
      .click();
    await page.getByRole("button", { name: "أضف إلى المفضلة" }).click();
    await expect(page.getByText("سجّل الدخول لحفظ المنتجات في المفضلة")).toBeVisible();

    await register(page, uniqueEmail("fan"));
    await page.goto("/c/beauty");
    await page
      .getByRole("link", { name: /سيروم للعناية بالبشرة/ })
      .first()
      .click();
    await page.getByRole("button", { name: "أضف إلى المفضلة" }).click();
    await expect(page.getByRole("button", { name: "إزالة من المفضلة" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.goto("/account/wishlist");
    await expect(page.getByRole("link", { name: /سيروم للعناية بالبشرة/ })).toBeVisible();
    await page.getByRole("button", { name: "إزالة من المفضلة" }).click();
    await expect(page.getByText("أُزيل من المفضلة")).toBeVisible();
    await page.reload();
    await expect(page.getByText("قائمة المفضلة فارغة")).toBeVisible();
  });
});
