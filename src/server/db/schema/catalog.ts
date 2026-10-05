import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import {
  createdAt,
  localized,
  money,
  tsNullable,
  updatedAt,
  type LocalizedText,
  type SeoFields,
} from "./_shared";
import { media } from "./media";

export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const categories = pgTable(
  "categories",
  {
    id: uuid().primaryKey().defaultRandom(),
    parentId: uuid().references((): AnyPgColumn => categories.id, { onDelete: "restrict" }),
    slug: text().notNull().unique(),
    name: localized().notNull(),
    description: localized(),
    imageId: uuid().references(() => media.id, { onDelete: "set null" }),
    sortOrder: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    seo: jsonb().$type<SeoFields>(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("categories_parent_sort_idx").on(t.parentId, t.sortOrder)],
);

export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: localized().notNull(),
    shortDescription: localized(),
    /** Sanitized HTML per locale. */
    description: localized(),
    status: text().$type<ProductStatus>().notNull().default("draft"),
    primaryCategoryId: uuid().references(() => categories.id, { onDelete: "set null" }),
    brand: text(),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isFeatured: boolean().notNull().default(false),
    hasVariants: boolean().notNull().default(false),
    // Denormalized from variants (maintained by the catalog service) for listing/sorting/filtering.
    minPrice: money(),
    maxPrice: money(),
    inStock: boolean().notNull().default(false),
    /** Normalized (Arabic-folded, lowercased) text for trigram search. */
    searchText: text().notNull().default(""),
    seo: jsonb().$type<SeoFields>(),
    salesCount: integer().notNull().default(0),
    ratingAvg: numeric({ precision: 3, scale: 2 }),
    ratingCount: integer().notNull().default(0),
    publishedAt: tsNullable(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("products_status_published_idx").on(t.status, t.publishedAt),
    index("products_category_idx").on(t.primaryCategoryId),
    index("products_featured_idx")
      .on(t.isFeatured)
      .where(sql`${t.status} = 'active'`),
    index("products_min_price_idx").on(t.minPrice),
    index("products_search_trgm_idx").using("gin", sql`${t.searchText} gin_trgm_ops`),
    check("products_status_valid", sql`${t.status} in ('draft','active','archived')`),
  ],
);

export const productCategories = pgTable(
  "product_categories",
  {
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.categoryId] }),
    index("product_categories_category_idx").on(t.categoryId),
  ],
);

export type OptionValue = { id: string; label: LocalizedText; color?: string };

/** e.g. "Size" with values S/M/L. Variants reference option value ids. */
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: localized().notNull(),
    position: integer().notNull(),
    values: jsonb().$type<OptionValue[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("product_options_position_unique").on(t.productId, t.position)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Option value ids ordered by option position; empty for the single default variant. */
    optionValueIds: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sku: text(),
    price: money().notNull(),
    compareAtPrice: money(),
    costPrice: money(),
    stockQuantity: integer().notNull().default(0),
    trackInventory: boolean().notNull().default(true),
    lowStockThreshold: integer(),
    weightGrams: integer(),
    barcode: text(),
    imageId: uuid().references(() => media.id, { onDelete: "set null" }),
    position: integer().notNull().default(0),
    isActive: boolean().notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_sku_unique").on(t.sku),
    uniqueIndex("product_variants_options_unique").on(t.productId, t.optionValueIds),
    check("product_variants_price_nonnegative", sql`${t.price} >= 0`),
    check(
      "product_variants_compare_at_valid",
      sql`${t.compareAtPrice} is null or ${t.compareAtPrice} > ${t.price}`,
    ),
    check("product_variants_stock_nonnegative", sql`${t.stockQuantity} >= 0`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    mediaId: uuid()
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    position: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.mediaId] }),
    index("product_images_order_idx").on(t.productId, t.position),
  ],
);
