import { expect, test } from "@playwright/test";
import { PASSWORD, register, signInAsOwner, signInAsStaff, uniqueEmail } from "./helpers";

// Runs after auth.spec, whose setup test creates the owner this spec signs in as.
test.describe("admin: people", () => {
  test("the owner gives a customer a staff role, then removes it", async ({
    page,
    browser,
  }, info) => {
    const email = uniqueEmail(`clerk-${info.project.name}`);
    const theirs = await (await browser.newContext()).newPage();
    await register(theirs, email, "سارة الموظفة");

    test.skip(!(await signInAsOwner(page)), "needs the owner from auth.spec");
    await page.goto("/admin/staff");
    // Someone without an account gets a clear explanation.
    await page.getByLabel("بريد الموظف").fill("nobody@example.com");
    await page.getByRole("button", { name: "إضافة", exact: true }).click();
    await expect(page.getByText(/لا يوجد حساب بهذا البريد/)).toBeVisible();

    await page.getByLabel("بريد الموظف").fill(email);
    await page.getByLabel("الصلاحية", { exact: true }).selectOption({ label: "مدير المنتجات" });
    await page.getByRole("button", { name: "إضافة", exact: true }).click();
    const row = page.getByRole("listitem").filter({ hasText: email });
    await expect(row).toContainText("لم يفعّل التحقق بخطوتين");

    // Their customer session ended: staff must sign in again with password and 2FA.
    await theirs.goto("/account");
    await expect(theirs).toHaveURL(/\/login/);

    await row.getByRole("button", { name: "إزالة من الفريق" }).click();
    await row.getByRole("button", { name: "اضغط مرة أخرى للإزالة" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: email })).toHaveCount(0);

    await page.goto("/admin/audit?category=people");
    await expect(page.getByText("تغيير صلاحية موظف").first()).toBeVisible();
    await expect(page.getByText("إزالة موظف").first()).toBeVisible();
  });

  test("a suspended customer is signed out and cannot sign back in until reactivated", async ({
    page,
    browser,
  }, info) => {
    const email = uniqueEmail(`blocked-${info.project.name}`);
    const name = `زبون موقوف ${info.project.name}`;
    const theirs = await (await browser.newContext()).newPage();
    await register(theirs, email, name);

    await signInAsStaff(page);
    await page.goto(`/admin/customers?q=${encodeURIComponent(email)}`);
    await page.getByRole("link", { name }).first().click();
    await expect(page).toHaveURL(/\/admin\/customers\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "إيقاف الحساب" }).click();
    await page.getByLabel("السبب").fill("طلبات وهمية متكررة");
    await page.getByRole("button", { name: "تأكيد الإيقاف" }).click();
    await expect(page.getByText("الحساب موقوف: لا يستطيع الزبون تسجيل الدخول.")).toBeVisible();
    await expect(page.getByText("السبب: طلبات وهمية متكررة")).toBeVisible();

    const signIn = async () => {
      await theirs.goto("/login");
      await theirs.getByLabel("البريد الإلكتروني").fill(email);
      await theirs.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
      await theirs.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    };
    await theirs.goto("/account");
    await expect(theirs).toHaveURL(/\/login/);
    await signIn();
    await expect(theirs.getByText("تم إيقاف هذا الحساب. تواصل مع المتجر للمساعدة.")).toBeVisible();

    await page.getByRole("button", { name: "إعادة تفعيل الحساب" }).click();
    await expect(page.getByText("الحساب موقوف: لا يستطيع الزبون تسجيل الدخول.")).toBeHidden();
    await signIn();
    await expect(theirs).toHaveURL(/\/account$/);
  });
});
