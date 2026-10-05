import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { signInAsStaff } from "./helpers";

test.describe("admin: catalog", () => {
  test("create a product with a photo, publish it, then turn it into sizes", async ({
    page,
  }, info) => {
    const name = `تيشيرت اختبار ${info.project.name} ${Date.now() % 100000}`;
    const photo = await sharp({
      create: { width: 900, height: 1100, channels: 3, background: "#c9b6f2" },
    })
      .jpeg()
      .toBuffer();

    await signInAsStaff(page);
    await page.goto("/admin/products");
    await page.getByRole("link", { name: "منتج جديد" }).click();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);

    await page.getByLabel("اسم المنتج", { exact: true }).fill(name);
    await page
      .getByLabel(/^الوصف الكامل/)
      .fill("قطن ناعم\n\n• غسيل يدوي\n• مقاسات مريحة");
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "shirt.jpg", mimeType: "image/jpeg", buffer: photo });
    // The uploaded photo lands in the gallery as the main one (the nav also says "الرئيسية").
    const gallery = page.getByRole("main");
    await expect(gallery.getByRole("button", { name: "إزالة" })).toHaveCount(1);
    await expect(gallery.getByText("الرئيسية", { exact: true })).toBeVisible();
    await page.getByLabel("السعر", { exact: true }).fill("15000");
    await page.getByLabel("الكمية المتوفرة").fill("7");
    await page.getByRole("radio", { name: /منشور/ }).check();
    await page.getByRole("button", { name: "حفظ" }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await expect(page.getByText("تم إنشاء المنتج")).toBeVisible();

    // The storefront shows it with its price, description and photo.
    const store = await page.context().newPage();
    await store.goto(`/search?q=${encodeURIComponent(name)}`);
    await store
      .getByRole("link", { name: new RegExp(name) })
      .first()
      .click();
    await expect(store.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(store.getByText("15,000 د.ع").first()).toBeVisible();
    await expect(store.getByText("غسيل يدوي")).toBeVisible();

    // Options: sizes S and M, each with its own price.
    await page.getByRole("switch", { name: /لهذا المنتج خيارات/ }).click();
    await page.getByPlaceholder("مثلاً: المقاس").fill("المقاس");
    const values = page.getByPlaceholder("مثلاً: M ثم Enter");
    await values.fill("S");
    await values.press("Enter");
    await values.fill("M");
    await values.press("Enter");
    await expect(page.getByText("النسخ (2)")).toBeVisible();
    await page.getByLabel("السعر — M").fill("17000");
    await page.getByLabel("الكمية المتوفرة — S").fill("3");
    await page.getByRole("button", { name: "حفظ" }).filter({ visible: true }).first().click();
    await expect(page.getByText("تم حفظ المنتج")).toBeVisible();

    await store.reload();
    const sizes = store.getByRole("radiogroup", { name: "المقاس" });
    await expect(sizes.getByRole("radio", { name: "S", exact: true })).toBeVisible();
    await sizes.getByRole("radio", { name: "M", exact: true }).click();
    await expect(store.getByText("17,000 د.ع").first()).toBeVisible();
  });

  test("create, rename and delete a category", async ({ page }, info) => {
    const label = `قسم ${info.project.name} ${Date.now() % 100000}`;
    await signInAsStaff(page);
    await page.goto("/admin/categories");
    await page.getByRole("button", { name: "قسم جديد" }).click();
    const sheet = page.getByRole("dialog", { name: "قسم جديد" });
    await sheet.getByLabel("اسم القسم").fill(label);
    await sheet.getByRole("button", { name: "حفظ" }).click();
    await expect(sheet).toBeHidden();
    const row = page.getByRole("listitem").filter({ hasText: label });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "تعديل" }).click();
    const edit = page.getByRole("dialog", { name: "تعديل القسم" });
    await edit.getByLabel("اسم القسم").fill(`${label} ✓`);
    await edit.getByRole("button", { name: "حفظ" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: `${label} ✓` })).toBeVisible();

    const renamed = page.getByRole("listitem").filter({ hasText: `${label} ✓` });
    await renamed.getByRole("button", { name: "حذف" }).click();
    await renamed.getByRole("button", { name: "اضغط مرة أخرى للحذف" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: label })).toHaveCount(0);
  });
});
