import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { listProductsAdmin } from "@/server/services/admin-catalog";
import { saveProduct } from "@/server/services/catalog-admin";
import {
  deleteHomeSection,
  deletePage,
  getActiveHomeSections,
  getAllHomeSections,
  getPageForEdit,
  getPublishedPage,
  listPagesAdmin,
  moveHomeSection,
  movePage,
  nextPageSortOrder,
  saveHomeSection,
  savePage,
  setHomeSectionActive,
} from "@/server/services/content";
import { resetDatabase } from "@tests/support/db";

describe("home page builder (admin)", () => {
  beforeEach(resetDatabase);

  it("appends, reorders, hides and deletes sections", async () => {
    const text = await saveHomeSection(
      { type: "text", title: { ar: "من نحن" }, config: { body: { ar: "متجر عائلي" } } },
      null,
    );
    const products = await saveHomeSection(
      { type: "products", config: { source: "newest", limit: 4 } },
      null,
    );
    const features = await saveHomeSection(
      {
        type: "features",
        config: { items: [{ icon: "truck", title: { ar: "توصيل" }, text: {} }] },
      },
      null,
    );
    const order = async () => (await getAllHomeSections()).map((s) => s.id);
    expect(await order()).toEqual([text.id, products.id, features.id]);

    await moveHomeSection(features.id, "up", null);
    await moveHomeSection(text.id, "up", null); // already first
    expect(await order()).toEqual([text.id, features.id, products.id]);

    await setHomeSectionActive(text.id, false, null);
    expect((await getActiveHomeSections()).map((s) => s.id)).toEqual([features.id, products.id]);
    expect((await getAllHomeSections())[0]).toMatchObject({ id: text.id, isActive: false });

    await deleteHomeSection(products.id, null);
    expect(await order()).toEqual([text.id, features.id]);
    await expect(moveHomeSection(products.id, "up", null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects unsafe links and empty blocks", async () => {
    await expect(
      saveHomeSection(
        {
          type: "banner",
          config: { ctaLabel: { ar: "اضغط" }, ctaHref: "javascript:alert(1)" },
        },
        null,
      ),
    ).rejects.toBeInstanceOf(ZodError);
    await expect(
      saveHomeSection({ type: "hero", config: { slides: [] } }, null),
    ).rejects.toBeInstanceOf(ZodError);
    const ok = await saveHomeSection(
      { type: "banner", config: { ctaLabel: { ar: "تسوّق" }, ctaHref: "/c/sale" } },
      null,
    );
    expect(ok.config).toMatchObject({ ctaHref: "/c/sale", tone: "dark" });
  });

  it("finds hand-picked products by id for the picker", async () => {
    const a = await saveProduct(
      { name: { ar: "أ" }, status: "active", variants: [{ price: 1_000, stockQuantity: 1 }] },
      null,
    );
    await saveProduct(
      { name: { ar: "ب" }, status: "active", variants: [{ price: 2_000, stockQuantity: 1 }] },
      null,
    );
    expect((await listProductsAdmin({ ids: [a.id] })).items.map((p) => p.id)).toEqual([a.id]);
    expect((await listProductsAdmin({ ids: [] })).items).toEqual([]);
  });
});

describe("static pages (admin)", () => {
  beforeEach(resetDatabase);

  it("creates pages with readable slugs and sanitized content, in footer order", async () => {
    expect(await nextPageSortOrder()).toBe(0);
    const policy = await savePage(
      {
        title: { ar: "سياسة الشحن الدولي" },
        content: {
          ar: "<h2>المدة</h2><p>أسبوعان<script>alert(1)</script></p><img src=x onerror=alert(1)>",
        },
        sortOrder: await nextPageSortOrder(),
      },
      null,
    );
    expect(policy.slug).toBe("سياسة-الشحن-الدولي");
    expect(policy.content.ar).toBe("<h2>المدة</h2><p>أسبوعان</p>");

    const faq = await savePage(
      { title: { ar: "الأسئلة الشائعة" }, content: {}, sortOrder: await nextPageSortOrder() },
      null,
    );
    expect((await listPagesAdmin()).map((p) => p.id)).toEqual([policy.id, faq.id]);
    await movePage(faq.id, "up", null);
    expect((await listPagesAdmin()).map((p) => p.id)).toEqual([faq.id, policy.id]);

    await expect(
      savePage({ title: { ar: "أخرى" }, slug: "سياسة-الشحن-الدولي", content: {} }, null),
    ).rejects.toMatchObject({ code: "CONFLICT", details: { field: "slug" } });

    // Unpublished pages disappear from the storefront but stay editable.
    await savePage(
      { title: { ar: "الأسئلة الشائعة" }, content: {}, isPublished: false },
      null,
      faq.id,
    );
    expect(await getPublishedPage(faq.slug)).toBeNull();
    expect(await getPageForEdit(faq.id)).toMatchObject({ isPublished: false });
  });

  it("never deletes system pages", async () => {
    const terms = await savePage(
      { title: { ar: "الشروط" }, content: { ar: "<p>نص</p>" } },
      null,
      undefined,
      "terms",
    );
    await expect(deletePage(terms.id, null)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const extra = await savePage({ title: { ar: "عروض" }, content: {} }, null);
    await deletePage(extra.id, null);
    expect((await listPagesAdmin()).map((p) => p.systemKey)).toEqual(["terms"]);
  });
});
