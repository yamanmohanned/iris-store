import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";
import { db } from "@/server/db/client";
import {
  auditLogs,
  inventoryMovements,
  media,
  products,
  productVariants,
} from "@/server/db/schema";
import { getProductForEdit } from "@/server/services/admin-catalog";
import {
  newOptionValueId,
  saveCategory,
  saveProduct,
  type ProductInput,
} from "@/server/services/catalog-admin";
import {
  applyProductImport,
  exportProductsCsv,
  previewProductImport,
  productCsvTemplate,
} from "@/server/services/product-csv";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

const IQD = 0;
let actor: { id: string; label: string };

/** A sized shirt (S, M) with a photo, SEO and a category — everything a file must not lose. */
async function shirt() {
  const category = await saveCategory({ name: { ar: "ملابس رجالية", en: "Men" } }, null);
  const [photo] = await db
    .insert(media)
    .values({
      storageDriver: "local",
      key: "test/shirt.webp",
      mimeType: "image/webp",
      width: 800,
      height: 1000,
      bytes: 1000,
    })
    .returning();
  const s = newOptionValueId();
  const m = newOptionValueId();
  const input: ProductInput = {
    name: { ar: "قميص أكسفورد", en: "Oxford shirt" },
    slug: "oxford-shirt",
    status: "active",
    primaryCategoryId: category.id,
    brand: "Iris",
    tags: ["قطن"],
    imageIds: [photo!.id],
    seo: { title: { ar: "قميص أكسفورد رجالي" } },
    description: { ar: "<p>قطن ناعم.</p><ul><li>غسيل بارد</li></ul>" },
    options: [
      {
        name: { ar: "المقاس" },
        values: [
          { id: s, label: { ar: "S" } },
          { id: m, label: { ar: "M" } },
        ],
      },
    ],
    variants: [
      { optionValueIds: [s], sku: "OX-S", price: 30_000, stockQuantity: 10 },
      { optionValueIds: [m], sku: "OX-M", price: 30_000, stockQuantity: 4 },
    ],
  };
  const { id } = await saveProduct(input, null);
  return { id, categoryId: category.id, photoId: photo!.id };
}

/** Read an exported file as header → value objects (for editing cells in tests). */
function table(text: string) {
  const [header, ...rows] = parseCsv(text);
  return {
    header: header!,
    rows: rows.map((r) => Object.fromEntries(header!.map((h, i) => [h, r[i] ?? ""]))),
    write(rowsOut: Record<string, string>[]) {
      return toCsv([header!, ...rowsOut.map((r) => header!.map((h) => r[h] ?? ""))]);
    },
  };
}

const stripVolatile = (p: Awaited<ReturnType<typeof getProductForEdit>>) => {
  const { updatedAt: _u, ...rest } = p!;
  return rest;
};

describe("product spreadsheet import and export", () => {
  beforeEach(async () => {
    await resetDatabase();
    const owner = await createVerifiedUser({
      email: "owner@example.com",
      password: "Calm-River-Stone-2026",
      role: "owner",
    });
    actor = { id: owner.id, label: "Owner" };
  });

  it("imports the template: a sized product and a simple draft", async () => {
    const preview = await previewProductImport(productCsvTemplate("ar"), IQD);
    expect(preview.errors).toEqual([]);
    expect(preview.summary).toMatchObject({ created: 2, updated: 0, variantsCreated: 3 });

    await applyProductImport(productCsvTemplate("ar"), IQD, actor);
    const [shirtRow] = await db.select().from(products).where(eq(products.slug, "cotton-shirt"));
    const edit = await getProductForEdit(shirtRow!.id);
    expect(edit).toMatchObject({
      name: { ar: "قميص قطني", en: "Cotton shirt" },
      status: "active",
      tags: ["قطن", "صيفي"],
      options: [
        { name: { ar: "المقاس" }, values: [{ label: { ar: "M" } }, { label: { ar: "L" } }] },
      ],
    });
    expect(edit!.variants.map((v) => [v.sku, v.price, v.stockQuantity])).toEqual([
      ["SHIRT-M", 15_000, 10],
      ["SHIRT-L", 15_000, 5],
    ]);
    expect(edit!.description?.ar).toBe(
      "<p>قميص من القطن الناعم.</p><ul><li>غسيل بماء بارد</li></ul>",
    );

    const [bag] = await db
      .select()
      .from(products)
      .where(eq(products.name, { ar: "حقيبة جلدية" }));
    expect(bag).toMatchObject({ status: "draft", hasVariants: false, minPrice: 45_000 });
  });

  it("round-trips: importing an untouched export changes nothing", async () => {
    const { id } = await shirt();
    const before = await getProductForEdit(id);
    const movesBefore = await db.select().from(inventoryMovements);

    const file = await exportProductsCsv("ar", IQD);
    const preview = await previewProductImport(file, IQD);
    expect(preview.errors).toEqual([]);
    expect(preview.summary).toMatchObject({ created: 0, updated: 1, variantsUpdated: 2 });
    await applyProductImport(file, IQD, actor);

    expect(stripVolatile(await getProductForEdit(id))).toEqual(stripVolatile(before));
    expect(await db.select().from(inventoryMovements)).toHaveLength(movesBefore.length);
  });

  it("applies stock as a difference from the export, keeping sales made after the download", async () => {
    const { id } = await shirt();
    const sheet = table(await exportProductsCsv("ar", IQD));
    // Two S shirts sell after the file was downloaded…
    await db
      .update(productVariants)
      .set({ stockQuantity: sql`${productVariants.stockQuantity} - 2` })
      .where(eq(productVariants.sku, "OX-S"));
    // …while the owner adds 5 to the S row (10 → 15) and leaves M alone.
    sheet.rows[0]!["الكمية"] = "15";
    await applyProductImport(sheet.write(sheet.rows), IQD, actor);

    const variants = (await getProductForEdit(id))!.variants;
    expect(variants.map((v) => [v.sku, v.stockQuantity])).toEqual([
      ["OX-S", 13],
      ["OX-M", 4],
    ]);
  });

  it("changes only the columns in the file and keeps photos, SEO and variant ids", async () => {
    const { id, photoId } = await shirt();
    const before = (await getProductForEdit(id))!;
    const file = toCsv([
      ["Handle", "SKU", "Price"],
      ["oxford-shirt", "OX-M", "32,500"],
    ]);
    await applyProductImport(file, IQD, actor);

    const after = (await getProductForEdit(id))!;
    expect(after.variants.map((v) => [v.id, v.price, v.stockQuantity])).toEqual([
      [before.variants[0]!.id, 30_000, 10],
      [before.variants[1]!.id, 32_500, 4],
    ]);
    expect(after.images.map((i) => i.id)).toEqual([photoId]);
    expect(after.seo).toEqual(before.seo);
    expect(after.description).toEqual(before.description);
    expect(after.brand).toBe("Iris");
  });

  it("adds a new size to an existing product without touching the others", async () => {
    const { id } = await shirt();
    const before = (await getProductForEdit(id))!;
    const file = toCsv([
      ["رابط المنتج", "قيمة الخيار 1", "السعر", "الكمية"],
      ["oxford-shirt", "XL", "33000", "٧"],
    ]);
    const preview = await previewProductImport(file, IQD);
    expect(preview.summary).toMatchObject({ updated: 1, variantsCreated: 1, variantsUpdated: 0 });
    await applyProductImport(file, IQD, actor);

    const after = (await getProductForEdit(id))!;
    expect(after.options[0]!.values.map((v) => v.label.ar)).toEqual(["S", "M", "XL"]);
    expect(after.variants).toHaveLength(3);
    expect(after.variants.slice(0, 2)).toEqual(before.variants);
    expect(after.variants[2]).toMatchObject({ price: 33_000, stockQuantity: 7 });
  });

  it("reports every problem with its row and writes nothing", async () => {
    const { categoryId } = await shirt();
    await saveCategory({ name: { ar: "ملابس رجالية" }, slug: "men-2" }, null); // a second "ملابس رجالية"
    expect(categoryId).toBeTruthy();
    const file = toCsv([
      [
        "رابط المنتج",
        "اسم المنتج",
        "الحالة",
        "القسم",
        "السعر",
        "السعر قبل الخصم",
        "رمز المنتج (SKU)",
      ],
      ["", "منتج 1", "منشور", "", "abc", "", ""], // row 2: bad price
      ["", "منتج 2", "معروض", "", "1000", "", ""], // row 3: unknown status
      ["", "منتج 3", "", "قسم غير موجود", "1000", "", ""], // row 4
      ["", "منتج 4", "", "ملابس رجالية", "1000", "", ""], // row 5: two categories share the name
      ["", "منتج 5", "", "", "1000", "900", ""], // row 6: compare-at below price
      ["", "منتج 6", "", "", "1000", "", "OX-S"], // row 7: SKU of another product
      ["", "", "", "", "1000", "", ""], // row 8: no name
      ["two", "منتج 7", "", "", "1000", "", "DUP"], // row 9
      ["two", "منتج آخر", "", "", "1000", "", "DUP"], // row 10: conflicting name, duplicate SKU
      ["oxford-shirt", "", "", "", "1000", "", "NEW-SKU"], // row 11: existing product, name emptied
    ]);
    const countBefore = (await db.select().from(products)).length;
    const { errors } = await previewProductImport(file, IQD);
    const found = errors.map((e) => [e.row, e.code]);
    expect(found).toEqual(
      expect.arrayContaining([
        [2, "invalid_money"],
        [3, "invalid_status"],
        [4, "unknown_category"],
        [5, "ambiguous_category"],
        [6, "compare_at_not_above_price"],
        [7, "sku_taken"],
        [8, "required"],
        [10, "conflicting_values"],
        [10, "duplicate_sku"],
        [11, "required"],
        [11, "variant_not_found"],
      ]),
    );
    await expect(applyProductImport(file, IQD, actor)).rejects.toMatchObject({
      code: "VALIDATION",
    });
    expect(await db.select().from(products)).toHaveLength(countBefore);
  });

  it("refuses to restructure options from a file and rejects negative stock", async () => {
    await shirt();
    const restructure = toCsv([
      ["Handle", "Option 1", "Option 1 value", "Option 2", "Option 2 value", "Price"],
      ["oxford-shirt", "Size", "S", "Color", "Blue", "1000"],
    ]);
    expect((await previewProductImport(restructure, IQD)).errors).toEqual([
      expect.objectContaining({ code: "options_changed", row: 2 }),
    ]);

    // Stock 0 against an export baseline of 20 would take the current 10 below zero.
    const negative = toCsv([
      ["Handle", "SKU", "Stock", "Stock at export"],
      ["oxford-shirt", "OX-S", "0", "20"],
    ]);
    expect((await previewProductImport(negative, IQD)).errors).toEqual([
      expect.objectContaining({ code: "negative_stock", row: 2 }),
    ]);
  });

  it("reads semicolon files, Arabic digits and English headers, and ignores unknown columns", async () => {
    const file = ["Name (Arabic);Price;Stock;Notes", "شال صوف;١٢٬٥٠٠;٣;for winter"].join("\n");
    const preview = await previewProductImport(file, IQD);
    expect(preview.errors).toEqual([]);
    expect(preview.warnings).toEqual([{ code: "unknown_column", value: "Notes" }]);
    await applyProductImport(file, IQD, actor);
    const [row] = await db.select().from(products);
    expect(row).toMatchObject({ name: { ar: "شال صوف" }, status: "draft", minPrice: 12_500 });
  });

  it("protects spreadsheet users from formulas and still round-trips the text", async () => {
    await saveProduct(
      {
        name: { ar: '=HYPERLINK("x")' },
        status: "draft",
        variants: [{ price: 1, stockQuantity: 0 }],
      },
      null,
    );
    const file = await exportProductsCsv("en", IQD);
    expect(file).toContain(`"'=HYPERLINK(""x"")"`);
    const preview = await previewProductImport(file, IQD);
    expect(preview.errors).toEqual([]);
    expect(preview.items[0]).toMatchObject({ action: "update", name: '=HYPERLINK("x")' });
  });

  it("records one audit entry for the import", async () => {
    await applyProductImport(productCsvTemplate("en"), IQD, actor);
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, "product.import"));
    expect(logs).toMatchObject([
      { actorId: actor.id, metadata: expect.objectContaining({ created: 2, rows: 3 }) },
    ]);
  });
});
