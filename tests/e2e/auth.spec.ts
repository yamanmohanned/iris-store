import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, SETUP_TOKEN, totp, uniqueEmail, waitForCode } from "./helpers";

async function register(page: Page, email: string, name = "علي حسن") {
  await page.goto("/register");
  await page.getByLabel("الاسم الكامل").fill(name);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await expect(page).toHaveURL(/\/verify-email/);
  await page.getByLabel("رمز التحقق").fill(await waitForCode(email)); // auto-submits at 6 digits
  await expect(page).toHaveURL(/\/account$/);
}

test.describe("customer authentication", () => {
  test("registers, verifies by emailed code, signs out and signs back in", async ({ page }) => {
    const email = uniqueEmail("buyer");
    await register(page, email);
    await expect(page.getByTestId("account-greeting")).toContainText(email);

    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
  });

  test("shows a clear error for a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(uniqueEmail("nobody"));
    await page.getByLabel("كلمة المرور", { exact: true }).fill("not-the-right-password");
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }),
    ).toBeVisible();
    await expect(page.getByLabel("البريد الإلكتروني")).not.toHaveValue(""); // input kept after the error
  });

  test("signs in without a password using an emailed code", async ({ page }) => {
    const email = uniqueEmail("otp");
    await register(page, email);
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();

    await page.goto("/login/code");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByRole("button", { name: "أرسل الرمز" }).click();
    await expect(page).toHaveURL(/step=verify/);
    // Wait for the *new* code (the sign-up code was already consumed).
    await page.waitForTimeout(300);
    await page.getByLabel("رمز التحقق").fill(await waitForCode(email));
    await expect(page).toHaveURL(/\/account$/);
  });

  test("hides the admin area from customers (404)", async ({ page }) => {
    await register(page, uniqueEmail("curious"));
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
  });

  test("protects account pages behind sign-in", async ({ page }) => {
    await page.goto("/account/security");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fsecurity/);
  });
});

test.describe("store owner", () => {
  // Stateful (creates the single owner): run once, on the mobile project.
  test.skip(({ isMobile }) => !isMobile, "runs once");

  test("sets up the store, is forced to enable 2FA, then reaches the admin", async ({ page }) => {
    const email = uniqueEmail("owner");
    await page.goto(`/setup?token=${SETUP_TOKEN}`);
    await page.getByLabel("اسم المتجر بالعربية").fill("متجر الاختبار");
    await page.getByLabel("الدولة").selectOption("IQ");
    await page.getByLabel("اسمك").fill("مالك المتجر");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "إنشاء المتجر" }).click();
    await expect(page).toHaveURL(/\/account\/security\?setup2fa=1/);

    // The admin refuses entry until two-step verification is on.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account\/security\?setup2fa=1/);
    await expect(page.getByText("التحقق بخطوتين إلزامي لحسابات الإدارة")).toBeVisible();

    await page.getByLabel("كلمة المرور الحالية").first().fill(PASSWORD);
    await page.getByRole("button", { name: "تفعيل التحقق بخطوتين" }).click();
    const secret = (await page.locator("code").first().textContent())!.trim();
    const backupCode = (await page.locator("ul[dir=ltr] li").first().textContent())!.trim();
    await page.getByLabel("رمز التحقق").fill(totp(secret));
    await page.getByRole("button", { name: "تأكيد وتفعيل" }).click();
    await expect(page.getByText("تم تفعيل التحقق بخطوتين بنجاح.")).toBeVisible();

    await page.getByRole("link", { name: "الذهاب إلى لوحة التحكم" }).click();
    await expect(page.getByRole("heading", { name: "لوحة التحكم" })).toBeVisible();

    // A new sign-in now requires the second factor (use a one-time backup code).
    await page.goto("/account");
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(email);
    await page.getByLabel("كلمة المرور", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
    await expect(page).toHaveURL(/\/two-factor/);
    await page.getByRole("button", { name: "استخدام رمز احتياطي" }).click();
    await page.getByLabel("الرمز الاحتياطي").fill(backupCode);
    await page.getByRole("button", { name: "تأكيد" }).click();
    await expect(page).toHaveURL(/\/admin$/);

    // Setup can never be repeated.
    await page.goto(`/setup?token=${SETUP_TOKEN}`);
    await expect(page.getByText("تم إعداد هذا المتجر مسبقاً")).toBeVisible();
  });
});
