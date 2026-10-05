import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { categories, inventoryMovements, products, productVariants } from "@/server/db/schema";
import {
  deleteCategory,
  newOptionValueId,
  saveCategory,
  saveProduct,
  type ProductInput,
} from "@/server/services/catalog-admin";
import { resetDatabase } from "@tests/support/db";

const simpleProduct = (overrides: Partial<ProductInput> = {}): ProductInput => ({
  name: { ar: "قميص قطني", en: "Cotton Shirt" },
  status: "active",
  variants: [{ price: 25_000, stockQuantity: 10 }],
  ...overrides,
});

async function getProduct(id: string) {
  const [p] = await db.select().from(products).where(eq(products.id, id));
  return p!;
}

describe("catalog admin service", () => {
  beforeEach(resetDatabase);

  it("creates a simple product with a default variant and computed listing fields", async () => {
    const { id, slug } = await saveProduct(simpleProduct({ brand: "Iris", tags: ["صيفي"] }), null);
    expect(slug).toBe("قميص-قطني");
    const p = await getProduct(id);
    expect(p.minPrice).toBe(25_000);
    expect(p.maxPrice).toBe(25_000);
    expect(p.inStock).toBe(true);
    expect(p.hasVariants).toBe(false);
    expect(p.publishedAt).not.toBeNull();
    expect(p.searchText).toContain("قميص قطني");
    expect(p.searchText).toContain("cotton shirt");
    const moves = await db.select().from(inventoryMovements);
    expect(moves).toMatchObject([{ delta: 10, reason: "initial" }]);
  });

  it("adds a numeric suffix to auto slugs but rejects a taken manual slug", async () => {
    await saveProduct(simpleProduct(), null);
    const second = await saveProduct(simpleProduct(), null);
    expect(second.slug).toBe("قميص-قطني-2");
    await expect(saveProduct(simpleProduct({ slug: "قميص-قطني" }), null)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("validates option/variant consistency", async () => {
    const red = newOptionValueId();
    const blue = newOptionValueId();
    const options = [
      {
        name: { ar: "اللون" },
        values: [
          { id: red, label: { ar: "أحمر" } },
          { id: blue, label: { ar: "أزرق" } },
        ],
      },
    ];
    // duplicate combination
    await expect(
      saveProduct(
        simpleProduct({
          options,
          variants: [
            { optionValueIds: [red], price: 1, stockQuantity: 1 },
            { optionValueIds: [red], price: 1, stockQuantity: 1 },
          ],
        }),
        null,
      ),
    ).rejects.toThrow(/duplicate_combination/);
    // unknown value id
    await expect(
      saveProduct(
        simpleProduct({
          options,
          variants: [{ optionValueIds: ["zzzzzz"], price: 1, stockQuantity: 1 }],
        }),
        null,
      ),
    ).rejects.toThrow(/unknown_option_value/);
    // compare-at must exceed price
    await expect(
      saveProduct(
        simpleProduct({ variants: [{ price: 100, compareAtPrice: 90, stockQuantity: 1 }] }),
        null,
      ),
    ).rejects.toThrow(/must_exceed_price/);
  });

  it("computes price range and stock flag across variants", async () => {
    const s = newOptionValueId();
    const m = newOptionValueId();
    const { id } = await saveProduct(
      simpleProduct({
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
          { optionValueIds: [s], price: 20_000, stockQuantity: 0 },
          { optionValueIds: [m], price: 30_000, stockQuantity: 0 },
        ],
      }),
      null,
    );
    const p = await getProduct(id);
    expect([p.minPrice, p.maxPrice, p.inStock, p.hasVariants]).toEqual([
      20_000,
      30_000,
      false,
      true,
    ]);
  });

  it("applies admin stock edits as a delta so concurrent sales are not overwritten", async () => {
    const { id } = await saveProduct(simpleProduct(), null);
    const [variant] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id));
    // The editor loaded stock=10. Meanwhile a customer buys 3.
    await db
      .update(productVariants)
      .set({ stockQuantity: sql`${productVariants.stockQuantity} - 3` })
      .where(eq(productVariants.id, variant!.id));
    // Owner restocks +5 from what they saw (10 → 15). Expected result: 7 + 5 = 12, not 15.
    await saveProduct(
      simpleProduct({
        variants: [{ id: variant!.id, price: 25_000, stockQuantity: 15, stockBaseline: 10 }],
      }),
      null,
      id,
    );
    const [after] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.id, variant!.id));
    expect(after!.stockQuantity).toBe(12);
  });

  it("refuses to touch a variant that belongs to another product", async () => {
    const a = await saveProduct(simpleProduct(), null);
    const b = await saveProduct(simpleProduct({ name: { ar: "حذاء" } }), null);
    const [variantOfA] = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, a.id));
    await expect(
      saveProduct(
        simpleProduct({ variants: [{ id: variantOfA!.id, price: 1, stockQuantity: 0 }] }),
        null,
        b.id,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("sanitizes rich text descriptions", async () => {
    const { id } = await saveProduct(
      simpleProduct({
        description: { ar: '<p>ناعم<script>alert(1)</script></p><img src=x onerror="x()">' },
      }),
      null,
    );
    expect((await getProduct(id)).description?.ar).toBe("<p>ناعم</p>");
  });

  it("detects stale edits (optimistic concurrency)", async () => {
    const { id } = await saveProduct(simpleProduct(), null);
    await expect(
      saveProduct(simpleProduct({ expectedUpdatedAt: "2000-01-01T00:00:00.000Z" }), null, id),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("indexes category names for search and prevents category cycles / deep trees", async () => {
    const root = await saveCategory({ name: { ar: "ملابس نسائية", en: "Women" } }, null);
    const child = await saveCategory({ name: { ar: "فساتين" }, parentId: root.id }, null);
    const grand = await saveCategory({ name: { ar: "سهرة" }, parentId: child.id }, null);
    await expect(
      saveCategory({ name: { ar: "عميق" }, parentId: grand.id }, null),
    ).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await expect(
      saveCategory({ name: { ar: "ملابس نسائية" }, parentId: child.id }, null, root.id),
    ).rejects.toMatchObject({
      code: "VALIDATION",
    });

    const { id } = await saveProduct(simpleProduct({ primaryCategoryId: child.id }), null);
    expect((await getProduct(id)).searchText).toContain("فساتين");

    await expect(deleteCategory(root.id, null)).rejects.toMatchObject({ code: "CONFLICT" });
    await deleteCategory(grand.id, null);
    expect(await db.select().from(categories)).toHaveLength(2);
  });
});
