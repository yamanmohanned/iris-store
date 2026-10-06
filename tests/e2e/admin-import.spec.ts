import { expect, test } from "@playwright/test";
import { signInAsStaff } from "./helpers";

test.describe("admin: product spreadsheet", () => {
  test("exports the catalog, flags a bad file, then imports a sized product", async ({
    page,
    browser,
  }, info) => {
    await signInAsStaff(page);
    await page.goto("/admin/products");
    await page.getByRole("link", { name: "استيراد وتصدير" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/import$/);

    // The download is a spreadsheet of the whole catalog, for staff only.
    const exported = await page.request.get("/api/admin/products/export?lang=ar");
    expect(exported.status()).toBe(200);
    expect(exported.headers()["content-type"]).toContain("text/csv");
    expect(exported.headers()["content-disposition"]).toContain("attachment");
    const body = await exported.text();
    expect(body.startsWith("\uFEFF")).toBe(true);
    expect(body).toContain("رابط المنتج");
    expect(body).toContain("ساعة يد كلاسيكية");
    const visitor = await browser.newContext();
    expect((await visitor.request.get("/api/admin/products/export")).status()).toBe(401);
    await visitor.close();

    const fileInput = page.locator('input[type="file"]');
    const upload = (csv: string) =>
      fileInput.setInputFiles({
        name: "products.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv, "utf8"),
      });

    // A wrong price is reported with its row, and nothing can be imported.
    await upload("اسم المنتج,السعر\nكنزة,abc\n");
    await page.getByRole("button", { name: "فحص الملف" }).click();
    await expect(page.getByText("مشكلة واحدة يجب إصلاحها")).toBeVisible();
    await expect(page.getByText("السطر 2:")).toBeVisible();
    await expect(page.getByRole("button", { name: /^استيراد/ })).toHaveCount(0);

    // A sweater in two sizes.
    const handle = `e2e-sweater-${info.project.name}-${Date.now() % 100000}`;
    const name = `كنزة صوف ${info.project.name}`;
    await upload(
      [
        "رابط المنتج,اسم المنتج,الحالة,الخيار 1,قيمة الخيار 1,السعر,الكمية",
        `${handle},${name},منشور,المقاس,M,22000,4`,
        `${handle},,,,L,22000,2`,
      ].join("\n"),
    );
    await page.getByRole("button", { name: "فحص الملف" }).click();
    await expect(page.getByText("منتج جديد", { exact: true })).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
    await page.getByRole("button", { name: "استيراد منتج واحد" }).click();
    await expect(page.getByText("تم الاستيراد: 1 جديد، 0 محدّث.")).toBeVisible();

    await page.goto(`/p/${handle}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    const sizes = page.getByRole("radiogroup", { name: "المقاس" }).filter({ visible: true });
    await expect(sizes.getByRole("radio", { name: "M", exact: true })).toBeVisible();
    await expect(sizes.getByRole("radio", { name: "L", exact: true })).toBeVisible();
  });
});
