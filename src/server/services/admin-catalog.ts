import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { LocalizedText } from "@/lib/localized";
import { escapeLike, normalizeSearchText } from "@/lib/search";
import { CacheTags, invalidate } from "@/server/cache";
import { db } from "@/server/db/client";
import {
  categories,
  media,
  orderItems,
  PRODUCT_STATUSES,
  productCategories,
  productImages,
  productOptions,
  products,
  productVariants,
  type OptionValue,
  type ProductStatus,
} from "@/server/db/schema";
import { AppError } from "@/server/errors";
import { audit } from "./audit";
import { toImageDTO, type ImageDTO } from "./media";
import { getSettings } from "./settings";

// ── Products list ────────────────────────────────────────────────────────────

export type AdminProductRow = {
  id: string;
  slug: string;
  name: LocalizedText;
  status: ProductStatus;
  image: ImageDTO | null;
  minPrice: number;
  maxPrice: number;
  /** Units across tracked, active variants; null when nothing is tracked (unlimited). */
  stock: number | null;
  variantCount: number;
  inStock: boolean;
  isFeatured: boolean;
  updatedAt: string;
};

export type AdminProductFilter = {
  q?: string;
  status?: ProductStatus | "all";
  stock?: "low" | "out";
  page?: number;
  pageSize?: number;
};

export async function listProductsAdmin(filter: AdminProductFilter) {
  const page = Math.max(1, filter.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filter.pageSize ?? 24));
  const { notifications } = await getSettings();
  const where: SQL[] = [];
  if (filter.status && filter.status !== "all") where.push(eq(products.status, filter.status));
  if (filter.stock === "out") where.push(eq(products.inStock, false));
  if (filter.stock === "low")
    where.push(sql`exists (select 1 from product_variants v where v.product_id = ${products.id}
      and v.is_active and v.track_inventory
      and v.stock_quantity <= coalesce(v.low_stock_threshold, ${notifications.lowStockThreshold}))`);
  const q = filter.q?.trim().slice(0, 100);
  if (q) {
    const term = normalizeSearchText(q);
    const conditions: SQL[] = [
      sql`exists (select 1 from product_variants v where v.product_id = ${products.id} and lower(v.sku) = ${q.toLowerCase()})`,
    ];
    if (term) conditions.push(ilike(products.searchText, `%${escapeLike(term)}%`));
    where.push(or(...conditions)!);
  }
  const condition = where.length ? and(...where) : undefined;

  const [rows, totals, statusCounts] = await Promise.all([
    db
      .select({
        p: products,
        stock: sql<
          number | null
        >`(select sum(v.stock_quantity)::int from product_variants v where v.product_id = "products"."id" and v.is_active and v.track_inventory)`,
        variantCount: sql<number>`(select count(*)::int from product_variants v where v.product_id = "products"."id")`,
      })
      .from(products)
      .where(condition)
      .orderBy(desc(products.updatedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(products).where(condition),
    db.select({ status: products.status, n: count() }).from(products).groupBy(products.status),
  ]);

  const ids = rows.map((r) => r.p.id);
  const images = ids.length
    ? await db
        .selectDistinctOn([productImages.productId], {
          productId: productImages.productId,
          m: media,
        })
        .from(productImages)
        .innerJoin(media, eq(media.id, productImages.mediaId))
        .where(inArray(productImages.productId, ids))
        .orderBy(productImages.productId, asc(productImages.position))
    : [];
  const imageBy = new Map(images.map((i) => [i.productId, toImageDTO(i.m)]));
  const counts = Object.fromEntries(PRODUCT_STATUSES.map((s) => [s, 0])) as Record<
    ProductStatus,
    number
  >;
  for (const r of statusCounts) counts[r.status] = r.n;

  return {
    items: rows.map(({ p, stock, variantCount }): AdminProductRow => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      status: p.status,
      image: imageBy.get(p.id) ?? null,
      minPrice: p.minPrice ?? 0,
      maxPrice: p.maxPrice ?? 0,
      stock,
      variantCount,
      inStock: p.inStock,
      isFeatured: p.isFeatured,
      updatedAt: p.updatedAt.toISOString(),
    })),
    total: totals[0]?.n ?? 0,
    page,
    pageSize,
    counts,
  };
}

// ── Product editor ───────────────────────────────────────────────────────────

export type ProductEditDTO = {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText | null;
  description: LocalizedText | null;
  status: ProductStatus;
  primaryCategoryId: string | null;
  categoryIds: string[];
  brand: string | null;
  tags: string[];
  isFeatured: boolean;
  images: ImageDTO[];
  options: { name: LocalizedText; values: OptionValue[] }[];
  variants: {
    id: string;
    optionValueIds: string[];
    sku: string | null;
    price: number;
    compareAtPrice: number | null;
    costPrice: number | null;
    stockQuantity: number;
    trackInventory: boolean;
    imageId: string | null;
    isActive: boolean;
  }[];
  seo: { title?: LocalizedText; description?: LocalizedText } | null;
  updatedAt: string;
  /** Units sold in orders (deleting is discouraged once a product has sold). */
  orderCount: number;
};

export async function getProductForEdit(id: string): Promise<ProductEditDTO | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!p) return null;
  const [cats, imgs, opts, vars, sold] = await Promise.all([
    db
      .select({ id: productCategories.categoryId })
      .from(productCategories)
      .where(eq(productCategories.productId, id)),
    db
      .select({ m: media })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, id))
      .orderBy(asc(productOptions.position)),
    db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.position)),
    db.select({ n: count() }).from(orderItems).where(eq(orderItems.productId, id)),
  ]);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription ?? null,
    description: p.description ?? null,
    status: p.status,
    primaryCategoryId: p.primaryCategoryId,
    categoryIds: cats.map((c) => c.id),
    brand: p.brand,
    tags: p.tags,
    isFeatured: p.isFeatured,
    images: imgs.map((i) => toImageDTO(i.m)),
    options: opts.map((o) => ({ name: o.name, values: o.values })),
    variants: vars.map((v) => ({
      id: v.id,
      optionValueIds: v.optionValueIds,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: v.costPrice,
      stockQuantity: v.stockQuantity,
      trackInventory: v.trackInventory,
      imageId: v.imageId,
      isActive: v.isActive,
    })),
    seo: p.seo ?? null,
    updatedAt: p.updatedAt.toISOString(),
    orderCount: sold[0]?.n ?? 0,
  };
}

// ── Categories ───────────────────────────────────────────────────────────────

export type AdminCategoryRow = {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  parentId: string | null;
  imageId: string | null;
  image: ImageDTO | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

/** Every category (hidden ones too), with how many products are filed under it. */
export async function listCategoriesAdmin(): Promise<AdminCategoryRow[]> {
  const rows = await db
    .select({
      c: categories,
      m: media,
      productCount: sql<number>`(select count(*)::int from product_categories pc where pc.category_id = "categories"."id")`,
    })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  return rows.map(({ c, m, productCount }) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    parentId: c.parentId,
    imageId: c.imageId,
    image: m ? toImageDTO(m) : null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    productCount,
  }));
}

/** Category options for selects, in tree order with the depth shown ("الملابس › فساتين"). */
export function categoryOptions(rows: AdminCategoryRow[], locale: string) {
  const byParent = new Map<string | null, AdminCategoryRow[]>();
  for (const r of rows) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r]);
  const out: { id: string; label: string; depth: number }[] = [];
  const walk = (parentId: string | null, trail: string[], depth: number) => {
    for (const r of byParent.get(parentId) ?? []) {
      const name = (locale === "en" ? r.name.en : r.name.ar) || r.name.ar || r.name.en || r.slug;
      const label = [...trail, name].join(" › ");
      out.push({ id: r.id, label, depth });
      walk(r.id, [...trail, name], depth + 1);
    }
  };
  walk(null, [], 0);
  return out;
}

/** Move a category one place up or down among its siblings (positions are renumbered 0..n). */
export async function moveCategory(
  categoryId: string,
  direction: "up" | "down",
  actor: { id: string; label?: string | null },
) {
  await db.transaction(async (tx) => {
    const [target] = await tx
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, categoryId));
    if (!target) throw new AppError("NOT_FOUND", "category");
    const siblings = await tx
      .select({ id: categories.id })
      .from(categories)
      .where(
        target.parentId === null
          ? sql`${categories.parentId} is null`
          : eq(categories.parentId, target.parentId),
      )
      .orderBy(asc(categories.sortOrder), asc(categories.createdAt))
      .for("update");
    const index = siblings.findIndex((c) => c.id === categoryId);
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= siblings.length) return;
    [siblings[index], siblings[swap]] = [siblings[swap]!, siblings[index]!];
    for (const [position, c] of siblings.entries())
      await tx.update(categories).set({ sortOrder: position }).where(eq(categories.id, c.id));
    await audit(
      {
        action: "category.reorder",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "category",
        entityId: categoryId,
        metadata: { direction },
      },
      tx,
    );
  });
  invalidate(CacheTags.catalog);
}
