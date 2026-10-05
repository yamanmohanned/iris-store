import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { productVariants } from "@/server/db/schema";
import {
  categoryOptions,
  getProductForEdit,
  listCategoriesAdmin,
  listProductsAdmin,
  moveCategory,
} from "@/server/services/admin-catalog";
import { newOptionValueId, saveCategory, saveProduct } from "@/server/services/catalog-admin";
import { createVerifiedUser } from "@tests/support/auth";
import { resetDatabase } from "@tests/support/db";

describe("catalog administration", () => {
  beforeEach(resetDatabase);

  it("lists products with status counts, stock filters and search by name or SKU", async () => {
    const s = newOptionValueId();
    const m = newOptionValueId();
    const shirt = await saveProduct(
      {
        name: { ar: "قميص قطني", en: "Cotton shirt" },
        status: "active",
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
          { optionValueIds: [s], price: 10_000, stockQuantity: 2, sku: "SH-S" },
          { optionValueIds: [m], price: 12_000, stockQuantity: 9, sku: "SH-M" },
        ],
      },
      null,
    );
    const mug = await saveProduct(
      {
        name: { ar: "كوب" },
        status: "draft",
        variants: [{ price: 3_000, stockQuantity: 0, trackInventory: false }],
      },
      null,
    );
    const gone = await saveProduct(
      { name: { ar: "حزام" }, status: "active", variants: [{ price: 5_000, stockQuantity: 0 }] },
      null,
    );

    const all = await listProductsAdmin({});
    expect(all.counts).toMatchObject({ active: 2, draft: 1, archived: 0 });
    const row = all.items.find((p) => p.id === shirt.id)!;
    expect(row).toMatchObject({
      minPrice: 10_000,
      maxPrice: 12_000,
      stock: 11,
      variantCount: 2,
      inStock: true,
    });
    expect(all.items.find((p) => p.id === mug.id)).toMatchObject({ stock: null, inStock: true });

    expect((await listProductsAdmin({ status: "draft" })).items.map((p) => p.id)).toEqual([mug.id]);
    expect((await listProductsAdmin({ stock: "out" })).items.map((p) => p.id)).toEqual([gone.id]);
    expect((await listProductsAdmin({ stock: "low" })).items.map((p) => p.id).sort()).toEqual(
      [gone.id, shirt.id].sort(),
    );
    expect((await listProductsAdmin({ q: "قطنى" })).items.map((p) => p.id)).toEqual([shirt.id]);
    expect((await listProductsAdmin({ q: "sh-m" })).items.map((p) => p.id)).toEqual([shirt.id]);
    expect((await listProductsAdmin({ q: "cotton" })).items.map((p) => p.id)).toEqual([shirt.id]);
  });

  it("loads a product for editing with its variants, stock and concurrency stamp", async () => {
    const saved = await saveProduct(
      {
        name: { ar: "حقيبة" },
        status: "active",
        tags: ["جلد"],
        variants: [{ price: 20_000, stockQuantity: 4, sku: "BAG-1" }],
      },
      null,
    );
    const edit = await getProductForEdit(saved.id);
    expect(edit).toMatchObject({ slug: saved.slug, tags: ["جلد"], orderCount: 0, options: [] });
    expect(edit!.variants[0]).toMatchObject({
      price: 20_000,
      stockQuantity: 4,
      sku: "BAG-1",
      trackInventory: true,
    });

    // A stale editor (old updatedAt) cannot overwrite a newer save.
    await saveProduct(
      {
        name: { ar: "حقيبة جديدة" },
        status: "active",
        variants: [{ id: edit!.variants[0]!.id, price: 21_000, stockQuantity: 4 }],
        expectedUpdatedAt: edit!.updatedAt,
      },
      null,
      saved.id,
    );
    await expect(
      saveProduct(
        {
          name: { ar: "قديمة" },
          status: "active",
          variants: [{ id: edit!.variants[0]!.id, price: 1, stockQuantity: 4 }],
          expectedUpdatedAt: edit!.updatedAt,
        },
        null,
        saved.id,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    // Stock edits are deltas against what the editor saw: a sale made meanwhile is kept.
    const fresh = (await getProductForEdit(saved.id))!;
    await db
      .update(productVariants)
      .set({ stockQuantity: 3 })
      .where(eq(productVariants.id, fresh.variants[0]!.id)); // one sold
    await saveProduct(
      {
        name: { ar: "حقيبة جديدة" },
        status: "active",
        variants: [
          { id: fresh.variants[0]!.id, price: 21_000, stockQuantity: 10, stockBaseline: 4 },
        ],
        expectedUpdatedAt: fresh.updatedAt,
      },
      null,
      saved.id,
    );
    expect((await getProductForEdit(saved.id))!.variants[0]!.stockQuantity).toBe(9);
  });

  it("reorders sibling categories and builds labelled options in tree order", async () => {
    const staff = await createVerifiedUser({
      email: "cat@example.com",
      password: "Calm-River-Stone-2026",
      role: "catalog_manager",
    });
    const women = await saveCategory({ name: { ar: "نسائي" }, sortOrder: 0 }, null);
    const men = await saveCategory({ name: { ar: "رجالي" }, sortOrder: 1 }, null);
    await saveCategory({ name: { ar: "فساتين" }, parentId: women.id }, null);

    await moveCategory(men.id, "up", { id: staff.id });
    const rows = await listCategoriesAdmin();
    expect(categoryOptions(rows, "ar").map((o) => o.label)).toEqual([
      "رجالي",
      "نسائي",
      "نسائي › فساتين",
    ]);
    await moveCategory(men.id, "up", { id: staff.id }); // already first: no change
    expect(categoryOptions(await listCategoriesAdmin(), "ar")[0]!.label).toBe("رجالي");
  });
});
