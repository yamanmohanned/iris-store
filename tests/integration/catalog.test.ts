import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { products } from "@/server/db/schema";
import {
  getCategoryBySlug,
  getProductBySlug,
  listProducts,
  searchSuggestions,
} from "@/server/services/catalog";
import { newOptionValueId, saveCategory, saveProduct } from "@/server/services/catalog-admin";
import { resetDatabase } from "@tests/support/db";

async function fixtures() {
  const women = await saveCategory(
    { name: { ar: "ملابس نسائية", en: "Women" }, slug: "women" },
    null,
  );
  const dresses = await saveCategory(
    { name: { ar: "فساتين" }, slug: "dresses", parentId: women.id },
    null,
  );
  const shoes = await saveCategory({ name: { ar: "أحذية", en: "Shoes" }, slug: "shoes" }, null);

  const s = newOptionValueId();
  const m = newOptionValueId();
  const dress = await saveProduct(
    {
      name: { ar: "فستان صيفي أزرق", en: "Blue summer dress" },
      status: "active",
      primaryCategoryId: dresses.id,
      tags: ["صيفي"],
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
        { optionValueIds: [s], price: 30_000, compareAtPrice: 40_000, stockQuantity: 2 },
        { optionValueIds: [m], price: 32_000, stockQuantity: 0 },
      ],
    },
    null,
  );
  const sneakers = await saveProduct(
    {
      name: { ar: "حذاء رياضي", en: "Sneakers" },
      status: "active",
      primaryCategoryId: shoes.id,
      isFeatured: true,
      variants: [{ price: 45_000, stockQuantity: 10 }],
    },
    null,
  );
  const soldOut = await saveProduct(
    {
      name: { ar: "صندل جلدي" },
      status: "active",
      primaryCategoryId: shoes.id,
      variants: [{ price: 20_000, stockQuantity: 0 }],
    },
    null,
  );
  const draft = await saveProduct(
    { name: { ar: "مسودة" }, status: "draft", variants: [{ price: 1, stockQuantity: 1 }] },
    null,
  );
  return { women, dresses, shoes, dress, sneakers, soldOut, draft };
}

describe("storefront catalog queries", () => {
  beforeEach(resetDatabase);

  it("lists only active products, sold-out last", async () => {
    const f = await fixtures();
    const { items, total } = await listProducts({});
    expect(total).toBe(3);
    expect(items.map((p) => p.slug)).not.toContain(f.draft.slug);
    expect(items.at(-1)!.slug).toBe(f.soldOut.slug);
  });

  it("includes subcategory products when browsing a parent category", async () => {
    const f = await fixtures();
    const { items } = await listProducts({ categoryId: f.women.id });
    expect(items.map((p) => p.slug)).toEqual([f.dress.slug]);
  });

  it("finds products regardless of Arabic spelling variants and in English", async () => {
    const f = await fixtures();
    for (const q of ["فستان", "فستان ازرق", "صيفى", "blue dress", "DRESS"]) {
      const { items } = await listProducts({ q });
      expect(
        items.map((p) => p.slug),
        q,
      ).toContain(f.dress.slug);
    }
    expect((await listProducts({ q: "احذيه" })).items.map((p) => p.slug)).toContain(
      f.sneakers.slug,
    ); // matches category name
    expect((await listProducts({ q: "غير موجود" })).total).toBe(0);
    // LIKE wildcards are matched literally
    expect((await listProducts({ q: "%" })).total).toBe(0);
  });

  it("filters by price, stock, sale and featured, and sorts by price", async () => {
    const f = await fixtures();
    expect((await listProducts({ onSale: true })).items.map((p) => p.slug)).toEqual([f.dress.slug]);
    expect((await listProducts({ featured: true })).items.map((p) => p.slug)).toEqual([
      f.sneakers.slug,
    ]);
    expect((await listProducts({ inStock: true })).total).toBe(2);
    expect(
      (await listProducts({ minPrice: 25_000, maxPrice: 35_000 })).items.map((p) => p.slug),
    ).toEqual([f.dress.slug]);
    const asc = (await listProducts({ sort: "price_asc" })).items.map((p) => p.price);
    expect(asc.slice(0, 2)).toEqual([30_000, 45_000]); // in-stock first, cheapest first
  });

  it("builds card data: cheapest variant price, discount and new badge", async () => {
    const f = await fixtures();
    const { items } = await listProducts({ q: "فستان" });
    expect(items[0]).toMatchObject({
      slug: f.dress.slug,
      price: 30_000,
      maxPrice: 32_000,
      compareAtPrice: 40_000,
      discountPercent: 25,
      inStock: true,
      hasVariants: true,
      isNew: true,
      defaultVariantId: null,
    });
    const sneakers = (await listProducts({ featured: true })).items[0]!;
    expect(sneakers.defaultVariantId).toBeTruthy();
  });

  it("returns product details with per-variant availability (exact count only when low)", async () => {
    const f = await fixtures();
    const product = await getProductBySlug(f.dress.slug);
    expect(product?.options[0]?.values).toHaveLength(2);
    const [small, medium] = product!.variants;
    expect(small).toMatchObject({ available: true, lowStock: 2, compareAtPrice: 40_000 });
    expect(medium).toMatchObject({ available: false, lowStock: null });
    expect(await getProductBySlug(f.draft.slug)).toBeNull();
  });

  it("resolves category breadcrumbs and children", async () => {
    const f = await fixtures();
    const result = await getCategoryBySlug("dresses");
    expect(result?.trail.map((c) => c.slug)).toEqual(["women", "dresses"]);
    expect((await getCategoryBySlug("women"))?.children.map((c) => c.id)).toEqual([f.dresses.id]);
    expect(await getCategoryBySlug("missing")).toBeNull();
  });

  it("suggests products and categories while typing", async () => {
    await fixtures();
    const s = await searchSuggestions("احذ", "ar");
    expect(s.categories.map((c) => c.slug)).toContain("shoes");
    expect((await searchSuggestions("ف", "ar")).products).toEqual([]); // too short
  });

  it("hides products as soon as they are archived", async () => {
    const f = await fixtures();
    await db.update(products).set({ status: "archived" }).where(eq(products.id, f.sneakers.id));
    expect((await listProducts({})).items.map((p) => p.slug)).not.toContain(f.sneakers.slug);
  });
});
