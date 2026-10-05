import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { tl } from "@/lib/localized";
import { normalizeSearchText } from "@/lib/search";
import { isValidSlug, slugify } from "@/lib/slug";
import { hexColor, localizedText, requiredLocalizedText } from "@/lib/validation";
import { CacheTags, invalidate } from "@/server/cache";
import { db, type DbExecutor, type Transaction } from "@/server/db/client";
import {
  categories,
  inventoryMovements,
  media,
  PRODUCT_STATUSES,
  productCategories,
  productImages,
  productOptions,
  products,
  productVariants,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { sanitizeRichText } from "@/server/security/sanitize";
import { audit } from "./audit";

export type Actor = { id: string; label?: string | null };

// ── Validation ───────────────────────────────────────────────────────────────

export const optionValueIdSchema = z.string().regex(/^[A-Za-z0-9_-]{4,16}$/);
export const newOptionValueId = () => randomBytes(6).toString("base64url");

const seoSchema = z
  .object({ title: localizedText(70).optional(), description: localizedText(170).optional() })
  .optional();

const variantSchema = z.object({
  id: z.uuid().optional(),
  optionValueIds: z.array(optionValueIdSchema).max(3).default([]),
  sku: z.string().trim().max(64).nullish(),
  price: z.number().int().min(0).max(1_000_000_000_000),
  compareAtPrice: z.number().int().min(0).nullish(),
  costPrice: z.number().int().min(0).nullish(),
  stockQuantity: z.number().int().min(0).max(10_000_000),
  /** Stock value shown when the form loaded; when present the change is applied as a delta. */
  stockBaseline: z.number().int().min(0).optional(),
  trackInventory: z.boolean().default(true),
  imageId: z.uuid().nullish(),
  isActive: z.boolean().default(true),
});

export const productInputSchema = z
  .object({
    name: requiredLocalizedText(150),
    slug: z.string().trim().max(80).optional(),
    shortDescription: localizedText(300).optional(),
    description: localizedText(20_000).optional(),
    status: z.enum(PRODUCT_STATUSES).default("draft"),
    primaryCategoryId: z.uuid().nullish(),
    categoryIds: z.array(z.uuid()).max(20).default([]),
    brand: z.string().trim().max(80).nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(30).default([]),
    isFeatured: z.boolean().default(false),
    imageIds: z.array(z.uuid()).max(20).default([]),
    options: z
      .array(
        z.object({
          name: requiredLocalizedText(40),
          values: z
            .array(
              z.object({
                id: optionValueIdSchema,
                label: requiredLocalizedText(40),
                color: hexColor.optional(),
              }),
            )
            .min(1)
            .max(40),
        }),
      )
      .max(3)
      .default([]),
    variants: z.array(variantSchema).min(1).max(150),
    seo: seoSchema,
    /** Optimistic concurrency: the product's updatedAt when the editor loaded it. */
    expectedUpdatedAt: z.string().optional(),
  })
  .superRefine((p, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    if (p.options.length === 0) {
      if (p.variants.length !== 1) issue(["variants"], "single_variant_required");
      if (p.variants[0] && p.variants[0].optionValueIds.length > 0)
        issue(["variants", 0], "unexpected_options");
    } else {
      const seen = new Set<string>();
      p.variants.forEach((v, i) => {
        if (v.optionValueIds.length !== p.options.length)
          return issue(["variants", i], "option_mismatch");
        v.optionValueIds.forEach((valueId, oi) => {
          if (!p.options[oi]!.values.some((val) => val.id === valueId))
            issue(["variants", i], "unknown_option_value");
        });
        const combo = v.optionValueIds.join("|");
        if (seen.has(combo)) issue(["variants", i], "duplicate_combination");
        seen.add(combo);
      });
      p.options.forEach((o, oi) => {
        const ids = o.values.map((v) => v.id);
        if (new Set(ids).size !== ids.length) issue(["options", oi], "duplicate_value_id");
      });
    }
    p.variants.forEach((v, i) => {
      if (v.compareAtPrice != null && v.compareAtPrice <= v.price)
        issue(["variants", i, "compareAtPrice"], "must_exceed_price");
    });
    const skus = p.variants.map((v) => v.sku?.trim()).filter(Boolean);
    if (new Set(skus).size !== skus.length) issue(["variants"], "duplicate_sku");
    if (p.slug && !isValidSlug(p.slug)) issue(["slug"], "invalid_slug");
  });

export type ProductInput = z.input<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: requiredLocalizedText(80),
  slug: z.string().trim().max(80).optional(),
  description: localizedText(1000).optional(),
  parentId: z.uuid().nullish(),
  imageId: z.uuid().nullish(),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  seo: seoSchema,
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Choose a unique slug. Auto-generated slugs get a numeric suffix on collision; a slug typed by
 * the owner must be unique or the save fails with a field error.
 */
async function resolveSlug(
  tx: Transaction,
  table: typeof products | typeof categories,
  requested: string | undefined,
  name: { ar?: string; en?: string },
  selfId?: string,
): Promise<string> {
  const taken = async (slug: string) => {
    const rows = await tx
      .select({ id: table.id })
      .from(table)
      .where(selfId ? and(eq(table.slug, slug), ne(table.id, selfId)) : eq(table.slug, slug))
      .limit(1);
    return rows.length > 0;
  };
  if (requested) {
    if (await taken(requested)) throw new AppError("CONFLICT", "slug taken", { field: "slug" });
    return requested;
  }
  const base = slugify(name.ar || name.en || "") || `item-${randomBytes(3).toString("hex")}`;
  const existing = await tx
    .select({ slug: table.slug })
    .from(table)
    .where(
      and(
        or(eq(table.slug, base), like(table.slug, `${base}-%`)),
        selfId ? ne(table.id, selfId) : undefined,
      ),
    );
  const used = new Set(existing.map((r) => r.slug));
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) if (!used.has(`${base}-${n}`)) return `${base}-${n}`;
}

function sanitizeLocalizedHtml(value: { ar?: string; en?: string } | undefined) {
  if (!value) return null;
  const out: { ar?: string; en?: string } = {};
  if (value.ar?.trim()) out.ar = sanitizeRichText(value.ar);
  if (value.en?.trim()) out.en = sanitizeRichText(value.en);
  return Object.keys(out).length ? out : null;
}

/**
 * Recompute denormalized listing fields (price range, in-stock flag) from active variants.
 * Call after any change to variants or stock (orders, cancellations, admin edits).
 */
export async function refreshProductAggregates(executor: DbExecutor, productIds: string[]) {
  if (productIds.length === 0) return;
  await executor.execute(sql`
    update products p set
      min_price = agg.min_price,
      max_price = agg.max_price,
      in_stock = agg.in_stock
    from (
      select pr.id,
        min(v.price) filter (where v.is_active) as min_price,
        max(v.price) filter (where v.is_active) as max_price,
        coalesce(bool_or(v.is_active and (not v.track_inventory or v.stock_quantity > 0)), false) as in_stock
      from products pr
      left join product_variants v on v.product_id = pr.id
      where pr.id in ${productIds}
      group by pr.id
    ) agg
    where p.id = agg.id
  `);
}

async function buildSearchText(
  tx: Transaction,
  p: { name: { ar?: string; en?: string }; brand?: string | null; tags: string[] },
  skus: string[],
  categoryIds: string[],
) {
  const cats = categoryIds.length
    ? await tx
        .select({ name: categories.name })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
    : [];
  return normalizeSearchText(
    [
      p.name.ar,
      p.name.en,
      p.brand,
      p.tags.join(" "),
      skus.join(" "),
      ...cats.flatMap((c) => [c.name.ar, c.name.en]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

// ── Products ─────────────────────────────────────────────────────────────────

/** Create or update a product with its categories, images, options and variants atomically. */
export async function saveProduct(
  rawInput: ProductInput,
  actor: Actor | null,
  productId?: string,
): Promise<{ id: string; slug: string }> {
  const input = productInputSchema.parse(rawInput);
  const categoryIds = [
    ...new Set([
      ...(input.primaryCategoryId ? [input.primaryCategoryId] : []),
      ...input.categoryIds,
    ]),
  ];

  const result = await db.transaction(async (tx) => {
    let existing: typeof products.$inferSelect | undefined;
    if (productId) {
      [existing] = await tx.select().from(products).where(eq(products.id, productId)).for("update");
      if (!existing) throw new AppError("NOT_FOUND", "product not found");
      if (input.expectedUpdatedAt && existing.updatedAt.toISOString() !== input.expectedUpdatedAt) {
        throw new AppError("CONFLICT", "product changed since it was loaded");
      }
    }

    if (categoryIds.length) {
      const found = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(inArray(categories.id, categoryIds));
      if (found.length !== categoryIds.length)
        throw new AppError("VALIDATION", "unknown category", { field: "categoryIds" });
    }
    const imageIds = [...new Set(input.imageIds)];
    const variantImageIds = input.variants
      .map((v) => v.imageId)
      .filter((x): x is string => Boolean(x));
    const allMediaIds = [...new Set([...imageIds, ...variantImageIds])];
    if (allMediaIds.length) {
      const found = await tx
        .select({ id: media.id })
        .from(media)
        .where(inArray(media.id, allMediaIds));
      if (found.length !== allMediaIds.length)
        throw new AppError("VALIDATION", "unknown image", { field: "imageIds" });
    }

    const slug = await resolveSlug(tx, products, input.slug, input.name, productId);
    const skus = input.variants.map((v) => v.sku?.trim()).filter((s): s is string => Boolean(s));
    const searchText = await buildSearchText(
      tx,
      { ...input, brand: input.brand ?? null },
      skus,
      categoryIds,
    );
    const values = {
      slug,
      name: input.name,
      shortDescription: input.shortDescription ?? null,
      description: sanitizeLocalizedHtml(input.description),
      status: input.status,
      primaryCategoryId: input.primaryCategoryId ?? categoryIds[0] ?? null,
      brand: input.brand ?? null,
      tags: input.tags,
      isFeatured: input.isFeatured,
      hasVariants: input.options.length > 0,
      searchText,
      seo: input.seo ?? null,
      publishedAt:
        input.status === "active"
          ? (existing?.publishedAt ?? new Date())
          : (existing?.publishedAt ?? null),
    };

    const [row] = existing
      ? await tx.update(products).set(values).where(eq(products.id, existing.id)).returning()
      : await tx.insert(products).values(values).returning();
    const id = row!.id;

    await tx.delete(productCategories).where(eq(productCategories.productId, id));
    if (categoryIds.length) {
      await tx
        .insert(productCategories)
        .values(categoryIds.map((categoryId) => ({ productId: id, categoryId })));
    }

    await tx.delete(productImages).where(eq(productImages.productId, id));
    if (imageIds.length) {
      await tx
        .insert(productImages)
        .values(imageIds.map((mediaId, position) => ({ productId: id, mediaId, position })));
    }

    await tx.delete(productOptions).where(eq(productOptions.productId, id));
    if (input.options.length) {
      await tx
        .insert(productOptions)
        .values(
          input.options.map((o, position) => ({
            productId: id,
            name: o.name,
            position,
            values: o.values,
          })),
        );
    }

    // Variants: update in place (keeps ids referenced by carts/orders), insert new, delete removed.
    const current = existing
      ? await tx
          .select()
          .from(productVariants)
          .where(eq(productVariants.productId, id))
          .for("update")
      : [];
    const currentById = new Map(current.map((v) => [v.id, v]));
    const keep = new Set<string>();
    const movements: (typeof inventoryMovements.$inferInsert)[] = [];

    for (const [position, v] of input.variants.entries()) {
      const fields = {
        optionValueIds: v.optionValueIds,
        sku: v.sku?.trim() || null,
        price: v.price,
        compareAtPrice: v.compareAtPrice ?? null,
        costPrice: v.costPrice ?? null,
        trackInventory: v.trackInventory,
        imageId: v.imageId ?? null,
        isActive: v.isActive,
        position,
      };
      const before = v.id ? currentById.get(v.id) : undefined;
      if (v.id && !before)
        throw new AppError("VALIDATION", "variant does not belong to product", {
          field: "variants",
        });

      if (before) {
        keep.add(before.id);
        // Apply stock edits as a delta against what the editor saw, so concurrent sales are not lost.
        const delta =
          v.stockBaseline !== undefined
            ? v.stockQuantity - v.stockBaseline
            : v.stockQuantity - before.stockQuantity;
        const [updated] = await tx
          .update(productVariants)
          .set({ ...fields, stockQuantity: sql`${productVariants.stockQuantity} + ${delta}` })
          .where(eq(productVariants.id, before.id))
          .returning({ stock: productVariants.stockQuantity });
        if (delta !== 0) {
          movements.push({
            variantId: before.id,
            delta,
            stockAfter: updated!.stock,
            reason: "manual_adjustment",
            actorId: actor?.id ?? null,
          });
        }
      } else {
        const [inserted] = await tx
          .insert(productVariants)
          .values({ ...fields, productId: id, stockQuantity: v.stockQuantity })
          .returning({ id: productVariants.id });
        keep.add(inserted!.id);
        if (v.stockQuantity > 0) {
          movements.push({
            variantId: inserted!.id,
            delta: v.stockQuantity,
            stockAfter: v.stockQuantity,
            reason: "initial",
            actorId: actor?.id ?? null,
          });
        }
      }
    }
    const removed = current.filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (removed.length)
      await tx.delete(productVariants).where(inArray(productVariants.id, removed));
    if (movements.length) await tx.insert(inventoryMovements).values(movements);

    await refreshProductAggregates(tx, [id]);
    await audit(
      {
        action: existing ? "product.update" : "product.create",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "product",
        entityId: id,
        metadata: { slug, status: input.status, variants: input.variants.length },
      },
      tx,
    );
    return { id, slug };
  });

  invalidate(CacheTags.catalog, CacheTags.product(result.id));
  return result;
}

/** Products referenced by orders are archived instead of deleted to keep order history intact. */
export async function deleteProduct(productId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .delete(products)
      .where(eq(products.id, productId))
      .returning({ slug: products.slug });
    if (!row) throw new AppError("NOT_FOUND", "product not found");
    await audit(
      {
        action: "product.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "product",
        entityId: productId,
        metadata: { slug: row.slug },
      },
      tx,
    );
  });
  invalidate(CacheTags.catalog, CacheTags.product(productId));
}

// ── Categories ───────────────────────────────────────────────────────────────

const MAX_CATEGORY_DEPTH = 3;

async function categoryDepthAndCycle(tx: Transaction, parentId: string, selfId?: string) {
  let depth = 1;
  let cursor: string | null = parentId;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === selfId)
      throw new AppError("VALIDATION", "category cannot be its own ancestor", {
        field: "parentId",
      });
    if (visited.has(cursor)) break;
    visited.add(cursor);
    const [row]: { parentId: string | null }[] = await tx
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, cursor));
    if (!row) throw new AppError("VALIDATION", "unknown parent", { field: "parentId" });
    cursor = row.parentId;
    depth++;
  }
  return depth;
}

export async function saveCategory(
  rawInput: CategoryInput,
  actor: Actor | null,
  categoryId?: string,
) {
  const input = categoryInputSchema.parse(rawInput);
  if (input.slug && !isValidSlug(input.slug))
    throw new AppError("VALIDATION", "invalid slug", { field: "slug" });

  const result = await db.transaction(async (tx) => {
    if (categoryId) {
      const [exists] = await tx
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId));
      if (!exists) throw new AppError("NOT_FOUND", "category not found");
    }
    if (input.parentId) {
      const depth = await categoryDepthAndCycle(tx, input.parentId, categoryId);
      if (depth > MAX_CATEGORY_DEPTH)
        throw new AppError("VALIDATION", "too deep", { field: "parentId" });
    }
    const slug = await resolveSlug(tx, categories, input.slug, input.name, categoryId);
    const values = {
      slug,
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      imageId: input.imageId ?? null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      seo: input.seo ?? null,
    };
    const [row] = categoryId
      ? await tx.update(categories).set(values).where(eq(categories.id, categoryId)).returning()
      : await tx.insert(categories).values(values).returning();
    await audit(
      {
        action: categoryId ? "category.update" : "category.create",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "category",
        entityId: row!.id,
        metadata: { slug, name: tl(input.name, "ar") },
      },
      tx,
    );
    return { id: row!.id, slug };
  });
  invalidate(CacheTags.catalog);
  return result;
}

export async function deleteCategory(categoryId: string, actor: Actor | null) {
  await db.transaction(async (tx) => {
    const children = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, categoryId))
      .limit(1);
    if (children.length) throw new AppError("CONFLICT", "category has subcategories");
    const [row] = await tx
      .delete(categories)
      .where(eq(categories.id, categoryId))
      .returning({ slug: categories.slug });
    if (!row) throw new AppError("NOT_FOUND", "category not found");
    await audit(
      {
        action: "category.delete",
        actorId: actor?.id,
        actorLabel: actor?.label,
        entityType: "category",
        entityId: categoryId,
        metadata: { slug: row.slug },
      },
      tx,
    );
  });
  invalidate(CacheTags.catalog);
}
