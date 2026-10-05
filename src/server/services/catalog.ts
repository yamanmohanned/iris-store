import "server-only";
import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { tl, type LocalizedText } from "@/lib/localized";
import { discountPercent } from "@/lib/money";
import { escapeLike, normalizeSearchText } from "@/lib/search";
import { CacheTags, cached } from "@/server/cache";
import { db } from "@/server/db/client";
import {
  categories,
  media,
  productCategories,
  productImages,
  productOptions,
  products,
  productVariants,
  type OptionValue,
} from "@/server/db/schema";
import { toImageDTO, type ImageDTO } from "./media";

// ── DTOs (plain JSON: safe to cache and to pass to client components) ────────

export type CategoryDTO = {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText | null;
  image: ImageDTO | null;
  parentId: string | null;
  sortOrder: number;
};

export type CategoryNode = CategoryDTO & { children: CategoryNode[] };

export type ProductCardDTO = {
  id: string;
  slug: string;
  name: LocalizedText;
  image: ImageDTO | null;
  secondImage: ImageDTO | null;
  price: number;
  maxPrice: number;
  compareAtPrice: number | null;
  discountPercent: number | null;
  inStock: boolean;
  hasVariants: boolean;
  isNew: boolean;
  /** For one-tap "add to cart" on products without options. */
  defaultVariantId: string | null;
};

export type ProductSort =
  "newest" | "price_asc" | "price_desc" | "best_selling" | "discount" | "relevance";

export type ListProductsInput = {
  categoryId?: string;
  q?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  ids?: string[];
  excludeIds?: string[];
  page?: number;
  pageSize?: number;
};

export const NEW_PRODUCT_DAYS = 21;
const MAX_PAGE_SIZE = 96;

// ── Categories ───────────────────────────────────────────────────────────────

async function loadCategories(): Promise<CategoryDTO[]> {
  const rows = await db
    .select({ c: categories, m: media })
    .from(categories)
    .leftJoin(media, eq(media.id, categories.imageId))
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt));
  return rows.map(({ c, m }) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description ?? null,
    image: m ? toImageDTO(m) : null,
    parentId: c.parentId,
    sortOrder: c.sortOrder,
  }));
}

export const getActiveCategories = cached(
  loadCategories,
  ["catalog:categories"],
  [CacheTags.catalog],
);

export function buildCategoryTree(list: CategoryDTO[]): CategoryNode[] {
  const nodes = new Map<string, CategoryNode>(list.map((c) => [c.id, { ...c, children: [] }]));
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.parentId) roots.push(node);
  }
  return roots;
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return buildCategoryTree(await getActiveCategories());
}

/** The category plus its ancestors (for breadcrumbs) and direct children (for sub-navigation). */
export async function getCategoryBySlug(slug: string) {
  const all = await getActiveCategories();
  const category = all.find((c) => c.slug === slug);
  if (!category) return null;
  const byId = new Map(all.map((c) => [c.id, c]));
  const trail: CategoryDTO[] = [];
  let cursor: CategoryDTO | undefined = category;
  while (cursor && trail.length < 5) {
    trail.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return { category, trail, children: all.filter((c) => c.parentId === category.id) };
}

export async function descendantCategoryIds(categoryId: string): Promise<string[]> {
  const all = await getActiveCategories();
  const result = [categoryId];
  for (let i = 0; i < result.length; i++) {
    for (const c of all) if (c.parentId === result[i]) result.push(c.id);
  }
  return result;
}

// ── Product listing ──────────────────────────────────────────────────────────

async function cardsFor(rows: (typeof products.$inferSelect)[]): Promise<ProductCardDTO[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const images = await db
    .select({ productId: productImages.productId, position: productImages.position, m: media })
    .from(productImages)
    .innerJoin(media, eq(media.id, productImages.mediaId))
    .where(inArray(productImages.productId, ids))
    .orderBy(asc(productImages.productId), asc(productImages.position));
  const imagesByProduct = new Map<string, ImageDTO[]>();
  for (const img of images) {
    const list = imagesByProduct.get(img.productId) ?? [];
    if (list.length < 2) list.push(toImageDTO(img.m));
    imagesByProduct.set(img.productId, list);
  }

  // Cheapest active variant per product: its compare-at price drives the "was" price & badge.
  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      price: productVariants.price,
      compareAtPrice: productVariants.compareAtPrice,
      position: productVariants.position,
    })
    .from(productVariants)
    .where(and(inArray(productVariants.productId, ids), eq(productVariants.isActive, true)))
    .orderBy(asc(productVariants.price), asc(productVariants.position));
  const cheapest = new Map<string, (typeof variants)[number]>();
  for (const v of variants) if (!cheapest.has(v.productId)) cheapest.set(v.productId, v);

  const newSince = Date.now() - NEW_PRODUCT_DAYS * 86_400_000;
  return rows.map((p) => {
    const v = cheapest.get(p.id);
    const imgs = imagesByProduct.get(p.id) ?? [];
    const price = v?.price ?? p.minPrice ?? 0;
    const compareAt = v?.compareAtPrice && v.compareAtPrice > price ? v.compareAtPrice : null;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      image: imgs[0] ?? null,
      secondImage: imgs[1] ?? null,
      price,
      maxPrice: p.maxPrice ?? price,
      compareAtPrice: compareAt,
      discountPercent: discountPercent(price, compareAt),
      inStock: p.inStock,
      hasVariants: p.hasVariants,
      isNew: Boolean(p.publishedAt && p.publishedAt.getTime() > newSince),
      defaultVariantId: !p.hasVariants && v ? v.id : null,
    };
  });
}

async function listProductsImpl(
  input: ListProductsInput,
): Promise<{ items: ProductCardDTO[]; total: number; page: number; pageSize: number }> {
  const pageSize = Math.min(Math.max(input.pageSize ?? 24, 1), MAX_PAGE_SIZE);
  const page = Math.min(Math.max(input.page ?? 1, 1), 1000);
  const where: SQL[] = [eq(products.status, "active")];

  if (input.categoryId) {
    const ids = await descendantCategoryIds(input.categoryId);
    where.push(
      sql`exists (select 1 from ${productCategories} pc where pc.product_id = ${products.id} and pc.category_id in ${ids})`,
    );
  }
  const terms = input.q ? normalizeSearchText(input.q).split(" ").filter(Boolean).slice(0, 6) : [];
  // A query made only of symbols has nothing searchable: no results rather than "everything".
  if (input.q?.trim() && terms.length === 0) return { items: [], total: 0, page, pageSize };
  for (const term of terms)
    where.push(sql`${products.searchText} ilike ${`%${escapeLike(term)}%`}`);
  if (input.minPrice != null) where.push(sql`${products.minPrice} >= ${input.minPrice}`);
  if (input.maxPrice != null) where.push(sql`${products.minPrice} <= ${input.maxPrice}`);
  if (input.inStock) where.push(eq(products.inStock, true));
  if (input.featured) where.push(eq(products.isFeatured, true));
  if (input.ids) {
    if (input.ids.length === 0) return { items: [], total: 0, page, pageSize };
    where.push(inArray(products.id, input.ids));
  }
  if (input.excludeIds?.length) where.push(sql`${products.id} not in ${input.excludeIds}`);
  const saleExpr = sql`exists (select 1 from ${productVariants} v where v.product_id = ${products.id} and v.is_active and v.compare_at_price > v.price)`;
  if (input.onSale) where.push(saleExpr);

  const sort = input.sort ?? (terms.length ? "relevance" : "newest");
  const byPrimary: Record<ProductSort, SQL | null> = {
    newest: null,
    price_asc: sql`${products.minPrice} asc nulls last`,
    price_desc: sql`${products.minPrice} desc nulls last`,
    best_selling: desc(products.salesCount),
    discount: sql`(select max((v.compare_at_price - v.price)::float / v.compare_at_price) from ${productVariants} v where v.product_id = ${products.id} and v.is_active and v.compare_at_price > v.price) desc nulls last`,
    relevance: terms.length
      ? sql`similarity(${products.searchText}, ${terms.join(" ")}) desc`
      : null,
  };
  // Sold-out products always sink to the end; ties break by newest, then id (stable paging).
  const order: SQL[] = [desc(products.inStock)];
  const primary = byPrimary[sort];
  if (primary) order.push(primary);
  order.push(sql`${products.publishedAt} desc nulls last`, asc(products.id));

  const rows = await db
    .select({ p: products, total: sql<number>`count(*) over()`.mapWith(Number) })
    .from(products)
    .where(and(...where))
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const items = await cardsFor(rows.map((r) => r.p));
  if (input.ids) {
    // Keep the owner's manual order for curated lists.
    const rank = new Map(input.ids.map((id, i) => [id, i]));
    items.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return { items, total: rows[0]?.total ?? 0, page, pageSize };
}

const listProductsCached = cached(
  (key: string) => listProductsImpl(JSON.parse(key) as ListProductsInput),
  ["catalog:list"],
  [CacheTags.catalog],
);

/** Product listing with filters. Free-text searches skip the cache (unbounded keys). */
export function listProducts(input: ListProductsInput) {
  if (input.q) return listProductsImpl(input);
  return listProductsCached(JSON.stringify(input));
}

// ── Product detail ───────────────────────────────────────────────────────────

export type VariantDTO = {
  id: string;
  optionValueIds: string[];
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  /** null = not tracked (always available). Exact numbers only when stock is low. */
  available: boolean;
  lowStock: number | null;
  imageId: string | null;
};

export type ProductDetailDTO = {
  id: string;
  slug: string;
  name: LocalizedText;
  shortDescription: LocalizedText | null;
  description: LocalizedText | null;
  brand: string | null;
  tags: string[];
  images: ImageDTO[];
  options: { id: string; name: LocalizedText; values: OptionValue[] }[];
  variants: VariantDTO[];
  primaryCategoryId: string | null;
  inStock: boolean;
  minPrice: number;
  maxPrice: number;
  seo: { title?: LocalizedText; description?: LocalizedText } | null;
  updatedAt: string;
};

const LOW_STOCK_DEFAULT = 5;

async function loadProduct(slug: string): Promise<ProductDetailDTO | null> {
  const [p] = await db
    .select()
    .from(products)
    .where(and(eq(products.slug, slug), eq(products.status, "active")))
    .limit(1);
  if (!p) return null;

  const [images, options, variants] = await Promise.all([
    db
      .select({ m: media })
      .from(productImages)
      .innerJoin(media, eq(media.id, productImages.mediaId))
      .where(eq(productImages.productId, p.id))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productOptions)
      .where(eq(productOptions.productId, p.id))
      .orderBy(asc(productOptions.position)),
    db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true)))
      .orderBy(asc(productVariants.position)),
  ]);

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription ?? null,
    description: p.description ?? null,
    brand: p.brand,
    tags: p.tags,
    images: images.map((i) => toImageDTO(i.m)),
    options: options.map((o) => ({ id: o.id, name: o.name, values: o.values })),
    variants: variants.map((v) => {
      const available = !v.trackInventory || v.stockQuantity > 0;
      const threshold = v.lowStockThreshold ?? LOW_STOCK_DEFAULT;
      return {
        id: v.id,
        optionValueIds: v.optionValueIds,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice && v.compareAtPrice > v.price ? v.compareAtPrice : null,
        available,
        lowStock:
          v.trackInventory && v.stockQuantity > 0 && v.stockQuantity <= threshold
            ? v.stockQuantity
            : null,
        imageId: v.imageId,
      };
    }),
    primaryCategoryId: p.primaryCategoryId,
    inStock: p.inStock,
    minPrice: p.minPrice ?? 0,
    maxPrice: p.maxPrice ?? 0,
    seo: p.seo ?? null,
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const getProductBySlug = cached(loadProduct, ["catalog:product"], [CacheTags.catalog]);

export async function getRelatedProducts(
  product: { id: string; primaryCategoryId: string | null },
  limit = 8,
) {
  if (!product.primaryCategoryId) return [];
  const { items } = await listProducts({
    categoryId: product.primaryCategoryId,
    excludeIds: [product.id],
    inStock: true,
    pageSize: limit,
    sort: "best_selling",
  });
  return items;
}

/** Lightweight type-ahead: a few matching products and categories. */
export async function searchSuggestions(q: string, locale: string) {
  const term = normalizeSearchText(q);
  if (term.length < 2) return { products: [], categories: [] };
  const [{ items }, cats] = await Promise.all([
    listProductsImpl({ q: term, pageSize: 6, sort: "relevance" }),
    getActiveCategories(),
  ]);
  const matchingCats = cats
    .filter((c) => normalizeSearchText(`${c.name.ar ?? ""} ${c.name.en ?? ""}`).includes(term))
    .slice(0, 4)
    .map((c) => ({ slug: c.slug, name: tl(c.name, locale) }));
  return {
    products: items.map((p) => ({
      slug: p.slug,
      name: tl(p.name, locale),
      image: p.image,
      price: p.price,
    })),
    categories: matchingCats,
  };
}

/** Every product slug + update time (sitemap). */
export async function allProductSlugs() {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.status, "active"));
}
