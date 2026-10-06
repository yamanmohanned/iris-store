import "server-only";
import { asc, inArray } from "drizzle-orm";
import { parseCsv, toCsv, unguardCell } from "@/lib/csv";
import type { LocalizedText } from "@/lib/localized";
import { moneyInputValue, parseMoneyInput } from "@/lib/money";
import { toLatinDigits } from "@/lib/phone";
import { editableToHtml, htmlToEditable } from "@/lib/rich-text";
import { normalizeSearchText } from "@/lib/search";
import { isValidSlug } from "@/lib/slug";
import { CacheTags, invalidate } from "@/server/cache";
import { db } from "@/server/db/client";
import {
  categories,
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
import {
  newOptionValueId,
  productInputSchema,
  saveProductTx,
  type Actor,
  type ProductInput,
} from "./catalog-admin";

/**
 * Products as a spreadsheet (CSV): one row per variant, so a shirt in three sizes takes three
 * rows with the same handle. Exported files open in Excel or Google Sheets and import back.
 *
 * Import rules, chosen so a file can never quietly damage the catalog:
 *   - A handle that matches a product updates it; any other row creates a product (draft unless a
 *     status is given). Images, SEO and option colors are kept; the file never deletes a variant.
 *   - Columns missing from the file leave those values unchanged.
 *   - Stock: with the export's "stock at export" column the change is applied as a difference,
 *     so sales made after the download are not lost.
 *   - Everything is checked first (preview); the import then runs in one transaction: all rows
 *     or none.
 */

export type CsvLocale = "ar" | "en";

export const CSV_COLUMNS = [
  { key: "handle", ar: "رابط المنتج", en: "Handle" },
  { key: "name_ar", ar: "اسم المنتج", en: "Name (Arabic)" },
  { key: "name_en", ar: "الاسم بالإنجليزية", en: "Name (English)" },
  { key: "status", ar: "الحالة", en: "Status" },
  { key: "category", ar: "القسم", en: "Category" },
  { key: "option1_name", ar: "الخيار 1", en: "Option 1" },
  { key: "option1_value", ar: "قيمة الخيار 1", en: "Option 1 value" },
  { key: "option2_name", ar: "الخيار 2", en: "Option 2" },
  { key: "option2_value", ar: "قيمة الخيار 2", en: "Option 2 value" },
  { key: "option3_name", ar: "الخيار 3", en: "Option 3" },
  { key: "option3_value", ar: "قيمة الخيار 3", en: "Option 3 value" },
  { key: "price", ar: "السعر", en: "Price" },
  { key: "compare_at_price", ar: "السعر قبل الخصم", en: "Compare-at price" },
  { key: "cost", ar: "التكلفة", en: "Cost" },
  { key: "stock", ar: "الكمية", en: "Stock" },
  { key: "track_stock", ar: "تتبع الكمية", en: "Track stock" },
  { key: "sku", ar: "رمز المنتج (SKU)", en: "SKU" },
  { key: "featured", ar: "مميز", en: "Featured" },
  { key: "brand", ar: "العلامة التجارية", en: "Brand" },
  { key: "tags", ar: "كلمات مفتاحية", en: "Tags" },
  { key: "short_ar", ar: "وصف قصير", en: "Short description (Arabic)" },
  { key: "short_en", ar: "وصف قصير بالإنجليزية", en: "Short description (English)" },
  { key: "description_ar", ar: "الوصف الكامل", en: "Description (Arabic)" },
  { key: "description_en", ar: "الوصف الكامل بالإنجليزية", en: "Description (English)" },
  { key: "stock_baseline", ar: "الكمية عند التصدير", en: "Stock at export" },
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number]["key"];

export type ImportIssueCode =
  | "empty_file"
  | "too_many_rows"
  | "too_many_products"
  | "unknown_column"
  | "duplicate_column"
  | "required"
  | "invalid_number"
  | "invalid_money"
  | "invalid_yes_no"
  | "invalid_status"
  | "unknown_category"
  | "ambiguous_category"
  | "invalid_handle"
  | "conflicting_values"
  | "compare_at_not_above_price"
  | "duplicate_sku"
  | "sku_taken"
  | "duplicate_variant"
  | "single_row_product"
  | "options_changed"
  | "option_name_missing"
  | "option_value_missing"
  | "variant_not_found"
  | "too_many_variants"
  | "too_long"
  | "negative_stock"
  | "invalid_product";

/** A problem in the file. `row` is the spreadsheet row number (the header is row 1). */
export type ImportIssue = {
  code: ImportIssueCode;
  row?: number;
  column?: CsvColumn;
  /** The offending text, a limit, or the other row of a conflict. */
  value?: string;
};

export type ImportSummary = {
  rows: number;
  created: number;
  updated: number;
  variantsCreated: number;
  variantsUpdated: number;
};

export type ImportPreview = {
  errors: ImportIssue[];
  warnings: ImportIssue[];
  summary: ImportSummary;
  /** The first products in the file, for the person to check before importing. */
  items: { action: "create" | "update"; name: string; handle: string | null; variants: number }[];
};

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_PRODUCTS = 1000;
const MAX_ISSUES = 200;
const MAX_PREVIEW_ITEMS = 50;

const PRODUCT_LEVEL: readonly CsvColumn[] = [
  "name_ar",
  "name_en",
  "status",
  "category",
  "option1_name",
  "option2_name",
  "option3_name",
  "featured",
  "brand",
  "tags",
  "short_ar",
  "short_en",
  "description_ar",
  "description_en",
];
const OPTION_NAMES = ["option1_name", "option2_name", "option3_name"] as const;
const OPTION_VALUES = ["option1_value", "option2_value", "option3_value"] as const;

const STATUS_LABELS: Record<ProductStatus, Record<CsvLocale, string>> = {
  active: { ar: "منشور", en: "active" },
  draft: { ar: "مسودة", en: "draft" },
  archived: { ar: "مؤرشف", en: "archived" },
};
const STATUS_WORDS = new Map<string, ProductStatus>([
  ["active", "active"],
  ["published", "active"],
  ["منشور", "active"],
  ["draft", "draft"],
  ["مسوده", "draft"],
  ["archived", "archived"],
  ["مورشف", "archived"],
]);
const YES_WORDS = new Set(["yes", "y", "true", "1", "نعم", "صح"]);
const NO_WORDS = new Set(["no", "n", "false", "0", "لا", "خطا"]);
const yesNo = (value: boolean, locale: CsvLocale) =>
  locale === "ar" ? (value ? "نعم" : "لا") : value ? "yes" : "no";

const normalizeHeader = (text: string) =>
  unguardCell(text.trim())
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s_\-()[\]:]+/g, " ")
    .trim();

const HEADER_ALIASES = new Map<string, CsvColumn>(
  CSV_COLUMNS.flatMap((c) => [c.key, c.ar, c.en].map((alias) => [normalizeHeader(alias), c.key])),
);

const labelOf = (text: LocalizedText | null | undefined) => text?.ar || text?.en || "";

// ── Export ───────────────────────────────────────────────────────────────────

type CategoryRow = { id: string; slug: string; name: LocalizedText };

/** Category names read better than links, unless two categories share a name. */
function categoryLabeler(rows: CategoryRow[], locale: CsvLocale) {
  const nameOf = (c: CategoryRow) =>
    (locale === "en" ? c.name.en || c.name.ar : c.name.ar || c.name.en) ?? "";
  const counts = new Map<string, number>();
  for (const c of rows) {
    const key = normalizeSearchText(nameOf(c));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const byId = new Map(rows.map((c) => [c.id, c]));
  return (id: string) => {
    const c = byId.get(id);
    if (!c) return "";
    const name = nameOf(c);
    return name && counts.get(normalizeSearchText(name)) === 1 ? name : c.slug;
  };
}

/** Every product with all its variants, in the order they were created. */
export async function exportProductsCsv(locale: CsvLocale, decimals: number): Promise<string> {
  const [productRows, optionRows, variantRows, links, categoryRows] = await Promise.all([
    db.select().from(products).orderBy(asc(products.createdAt), asc(products.id)),
    db
      .select()
      .from(productOptions)
      .orderBy(asc(productOptions.productId), asc(productOptions.position)),
    db
      .select()
      .from(productVariants)
      .orderBy(asc(productVariants.productId), asc(productVariants.position)),
    db.select().from(productCategories),
    db.select({ id: categories.id, slug: categories.slug, name: categories.name }).from(categories),
  ]);
  const group = <T extends { productId: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const r of rows) {
      const list = map.get(r.productId);
      if (list) list.push(r);
      else map.set(r.productId, [r]);
    }
    return map;
  };
  const optionsOf = group(optionRows);
  const variantsOf = group(variantRows);
  const linksOf = group(links);
  const categoryLabel = categoryLabeler(categoryRows, locale);
  const money = (minor: number | null) => moneyInputValue(minor, decimals);

  const lines: (string | number)[][] = [CSV_COLUMNS.map((c) => c[locale])];
  for (const p of productRows) {
    const options = optionsOf.get(p.id) ?? [];
    const categoryIds = [
      ...new Set([
        ...(p.primaryCategoryId ? [p.primaryCategoryId] : []),
        ...(linksOf.get(p.id) ?? []).map((l) => l.categoryId),
      ]),
    ];
    (variantsOf.get(p.id) ?? []).forEach((v, i) => {
      const cells: Partial<Record<CsvColumn, string | number>> = {
        handle: p.slug,
        price: money(v.price),
        compare_at_price: money(v.compareAtPrice),
        cost: money(v.costPrice),
        stock: v.stockQuantity,
        stock_baseline: v.stockQuantity,
        track_stock: yesNo(v.trackInventory, locale),
        sku: v.sku ?? "",
      };
      v.optionValueIds.forEach((valueId, oi) => {
        const value = options[oi]?.values.find((x) => x.id === valueId);
        cells[OPTION_VALUES[oi]!] = labelOf(value?.label);
      });
      // Product details on its first row only, so they are edited in one place.
      if (i === 0) {
        Object.assign(cells, {
          name_ar: p.name.ar ?? "",
          name_en: p.name.en ?? "",
          status: STATUS_LABELS[p.status][locale],
          category: categoryIds.map(categoryLabel).filter(Boolean).join(" | "),
          featured: yesNo(p.isFeatured, locale),
          brand: p.brand ?? "",
          tags: p.tags.join(", "),
          short_ar: p.shortDescription?.ar ?? "",
          short_en: p.shortDescription?.en ?? "",
          description_ar: htmlToEditable(p.description?.ar),
          description_en: htmlToEditable(p.description?.en),
        });
        options.forEach((o, oi) => (cells[OPTION_NAMES[oi]!] = labelOf(o.name)));
      }
      lines.push(CSV_COLUMNS.map((c) => cells[c.key] ?? ""));
    });
  }
  return toCsv(lines);
}

/** An empty file with the headers and a few example rows. */
export function productCsvTemplate(locale: CsvLocale): string {
  const yes = yesNo(true, locale);
  const examples: Partial<Record<CsvColumn, string>>[] = [
    {
      handle: "cotton-shirt",
      name_ar: "قميص قطني",
      name_en: "Cotton shirt",
      status: STATUS_LABELS.active[locale],
      option1_name: locale === "ar" ? "المقاس" : "Size",
      option1_value: "M",
      price: "15000",
      stock: "10",
      track_stock: yes,
      sku: "SHIRT-M",
      tags: locale === "ar" ? "قطن، صيفي" : "cotton, summer",
      description_ar: "قميص من القطن الناعم.\n\n• غسيل بماء بارد",
    },
    { handle: "cotton-shirt", option1_value: "L", price: "15000", stock: "5", sku: "SHIRT-L" },
    {
      name_ar: "حقيبة جلدية",
      status: STATUS_LABELS.draft[locale],
      price: "45000",
      compare_at_price: "55000",
      stock: "3",
      track_stock: yes,
    },
  ];
  return toCsv([
    CSV_COLUMNS.map((c) => c[locale]),
    ...examples.map((e) => CSV_COLUMNS.map((c) => e[c.key] ?? "")),
  ]);
}

// ── Import ───────────────────────────────────────────────────────────────────

type SheetRow = { line: number; cells: Partial<Record<CsvColumn, string>> };

type Existing = {
  id: string;
  slug: string;
  updatedAt: string;
  name: LocalizedText;
  shortDescription: LocalizedText | null;
  description: LocalizedText | null;
  status: ProductStatus;
  primaryCategoryId: string | null;
  categoryIds: string[];
  brand: string | null;
  tags: string[];
  isFeatured: boolean;
  imageIds: string[];
  seo: ProductInput["seo"] | null;
  options: { name: LocalizedText; values: OptionValue[] }[];
  variants: (typeof productVariants.$inferSelect)[];
};

async function loadExisting(ids: string[]): Promise<Map<string, Existing>> {
  if (!ids.length) return new Map();
  const [rows, links, images, options, variants] = await Promise.all([
    db.select().from(products).where(inArray(products.id, ids)),
    db.select().from(productCategories).where(inArray(productCategories.productId, ids)),
    db
      .select()
      .from(productImages)
      .where(inArray(productImages.productId, ids))
      .orderBy(asc(productImages.position)),
    db
      .select()
      .from(productOptions)
      .where(inArray(productOptions.productId, ids))
      .orderBy(asc(productOptions.position)),
    db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, ids))
      .orderBy(asc(productVariants.position)),
  ]);
  const of = <T extends { productId: string }>(list: T[], id: string) =>
    list.filter((x) => x.productId === id);
  return new Map(
    rows.map((p) => [
      p.id,
      {
        id: p.id,
        slug: p.slug,
        updatedAt: p.updatedAt.toISOString(),
        name: p.name,
        shortDescription: p.shortDescription ?? null,
        description: p.description ?? null,
        status: p.status,
        primaryCategoryId: p.primaryCategoryId,
        categoryIds: of(links, p.id).map((l) => l.categoryId),
        brand: p.brand,
        tags: p.tags,
        isFeatured: p.isFeatured,
        imageIds: of(images, p.id).map((i) => i.mediaId),
        seo: p.seo ?? null,
        options: of(options, p.id).map((o) => ({ name: o.name, values: o.values })),
        variants: of(variants, p.id),
      },
    ]),
  );
}

type Planned = { productId?: string; input: ProductInput; firstRow: number };

const parseInteger = (text: string): number | null => {
  const clean = toLatinDigits(text).replace(/[\s,٬]/g, "");
  return /^\d{1,9}$/.test(clean) ? Number(clean) : null;
};
const parseYesNo = (text: string): boolean | null => {
  const word = normalizeSearchText(text);
  return YES_WORDS.has(word) ? true : NO_WORDS.has(word) ? false : null;
};
const splitList = (text: string, separator: RegExp) =>
  text
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean);
const sameLabel = (a: string, b: string) => normalizeSearchText(a) === normalizeSearchText(b);
const localized = (ar: string | undefined, en: string | undefined): LocalizedText | undefined => {
  const out: LocalizedText = {};
  if (ar) out.ar = ar;
  if (en) out.en = en;
  return Object.keys(out).length ? out : undefined;
};

/** Read and check the whole file; nothing is written. */
async function planImport(text: string, decimals: number) {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const fail = (issue: ImportIssue) => {
    if (errors.length < MAX_ISSUES) errors.push(issue);
  };
  const summary: ImportSummary = {
    rows: 0,
    created: 0,
    updated: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
  };
  const planned: Planned[] = [];
  const items: ImportPreview["items"] = [];
  const done = () => ({ preview: { errors, warnings, summary, items }, planned });

  const table = parseCsv(text);
  if (table.length < 2) {
    fail({ code: "empty_file" });
    return done();
  }
  if (table.length - 1 > MAX_IMPORT_ROWS) {
    fail({ code: "too_many_rows", value: String(MAX_IMPORT_ROWS) });
    return done();
  }

  // Headers in either language; unknown columns are reported and ignored.
  const columnAt = table[0]!.map((h) => HEADER_ALIASES.get(normalizeHeader(h)) ?? null);
  const present = new Set<CsvColumn>();
  table[0]!.forEach((header, i) => {
    const column = columnAt[i];
    if (!column) {
      if (header.trim()) warnings.push({ code: "unknown_column", value: header.trim() });
    } else if (present.has(column)) fail({ code: "duplicate_column", column });
    else present.add(column);
  });
  if (errors.length) return done();
  const has = (column: CsvColumn) => present.has(column);

  const rows: SheetRow[] = table.slice(1).map((cells, i) => {
    const values: SheetRow["cells"] = {};
    columnAt.forEach((column, ci) => {
      if (column) values[column] = unguardCell((cells[ci] ?? "").trim()).trim();
    });
    return { line: i + 2, cells: values };
  });
  summary.rows = rows.length;

  // Rows with the same handle are one product; a row without a handle is a new product.
  const groups = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const handle = (row.cells.handle ?? "").toLowerCase();
    const key = handle ? `h:${handle}` : `r:${row.line}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  if (groups.size > MAX_IMPORT_PRODUCTS) {
    fail({ code: "too_many_products", value: String(MAX_IMPORT_PRODUCTS) });
    return done();
  }

  const handles = [...groups.keys()].filter((k) => k.startsWith("h:")).map((k) => k.slice(2));
  const found = handles.length
    ? await db
        .select({ id: products.id, slug: products.slug })
        .from(products)
        .where(inArray(products.slug, handles))
    : [];
  const existingById = await loadExisting(found.map((f) => f.id));
  const existingBySlug = new Map(found.map((f) => [f.slug, existingById.get(f.id)!]));

  const categoryRows: CategoryRow[] = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories);
  const resolveCategory = (token: string, row: number): string | null => {
    const bySlug = categoryRows.find((c) => c.slug === token.toLowerCase());
    if (bySlug) return bySlug.id;
    const matches = categoryRows.filter(
      (c) => sameLabel(c.name.ar ?? "", token) || sameLabel(c.name.en ?? "", token),
    );
    if (matches.length === 1) return matches[0]!.id;
    fail({
      row,
      column: "category",
      code: matches.length ? "ambiguous_category" : "unknown_category",
      value: token,
    });
    return null;
  };

  // SKUs are unique across the store.
  const skuLines = new Map<string, number>();
  for (const row of rows) {
    const sku = row.cells.sku;
    if (!sku) continue;
    if (skuLines.has(sku))
      fail({ row: row.line, column: "sku", code: "duplicate_sku", value: sku });
    else skuLines.set(sku, row.line);
  }
  const skuOwners = skuLines.size
    ? await db
        .select({ sku: productVariants.sku, productId: productVariants.productId })
        .from(productVariants)
        .where(inArray(productVariants.sku, [...skuLines.keys()]))
    : [];
  const skuOwner = new Map(skuOwners.map((s) => [s.sku!, s.productId]));

  for (const [key, group] of groups) {
    const firstRow = group[0]!.line;
    const handle = key.startsWith("h:") ? key.slice(2) : null;
    const existing = handle ? existingBySlug.get(handle) : undefined;
    const errorsBefore = errors.length;

    if (handle && !existing && !isValidSlug(handle))
      fail({ row: firstRow, column: "handle", code: "invalid_handle", value: handle });

    // Product details: the first filled cell of each column; a different second value is a mistake.
    const detail = new Map<CsvColumn, string>();
    for (const column of PRODUCT_LEVEL) {
      if (!has(column)) continue;
      let value = "";
      let from = 0;
      for (const row of group) {
        const cell = row.cells[column] ?? "";
        if (!cell) continue;
        if (!value) {
          value = cell;
          from = row.line;
        } else if (cell !== value)
          fail({ row: row.line, column, code: "conflicting_values", value: String(from) });
      }
      detail.set(column, value);
    }
    const money = (row: SheetRow, column: CsvColumn): number | null | undefined => {
      const cell = row.cells[column];
      if (!cell) return null;
      const value = parseMoneyInput(cell, decimals);
      if (value === null) fail({ row: row.line, column, code: "invalid_money", value: cell });
      return value ?? undefined;
    };
    const yesNoCell = (column: CsvColumn, text: string | undefined, row: number) => {
      if (!text) return undefined;
      const value = parseYesNo(text);
      if (value === null) fail({ row, column, code: "invalid_yes_no", value: text });
      return value ?? undefined;
    };

    // Options: names in order, without gaps.
    const optionNames: string[] = [];
    OPTION_NAMES.forEach((column, i) => {
      const name = detail.get(column) ?? "";
      if (!name) return;
      if (optionNames.length !== i)
        fail({ row: firstRow, column: OPTION_NAMES[optionNames.length], code: "required" });
      optionNames.push(name);
    });

    let status: ProductStatus | undefined;
    const statusText = detail.get("status");
    if (statusText) {
      status = STATUS_WORDS.get(normalizeSearchText(statusText));
      if (!status)
        fail({ row: firstRow, column: "status", code: "invalid_status", value: statusText });
    }
    let categoryIds: string[] | undefined;
    if (has("category")) {
      categoryIds = [];
      for (const token of splitList(detail.get("category") ?? "", /\|/)) {
        const id = resolveCategory(token, firstRow);
        if (id && !categoryIds.includes(id)) categoryIds.push(id);
      }
    }
    const featured = yesNoCell("featured", detail.get("featured"), firstRow);
    const tags = has("tags") ? splitList(detail.get("tags") ?? "", /[,،]/) : undefined;
    const descriptionHtml = (column: "description_ar" | "description_en") =>
      editableToHtml(detail.get(column)) || undefined;

    let input: ProductInput;
    let variantRows: number[] = [];
    let created = 0;
    let updated = 0;

    if (!existing) {
      // ── New product ──
      const nameAr = detail.get("name_ar");
      if (!nameAr) fail({ row: firstRow, column: "name_ar", code: "required" });
      const options = optionNames.map((name) => ({
        name: { ar: name },
        values: [] as { id: string; label: LocalizedText }[],
      }));
      const combos = new Set<string>();
      const variants: ProductInput["variants"] = [];
      for (const [index, row] of group.entries()) {
        if (!optionNames.length && index > 0) {
          fail({ row: row.line, code: "single_row_product" });
          continue;
        }
        const optionValueIds: string[] = [];
        options.forEach((option, oi) => {
          const label = row.cells[OPTION_VALUES[oi]!];
          if (!label) {
            fail({ row: row.line, column: OPTION_VALUES[oi], code: "option_value_missing" });
            return;
          }
          let value = option.values.find((v) => sameLabel(labelOf(v.label), label));
          if (!value)
            option.values.push((value = { id: newOptionValueId(), label: { ar: label } }));
          optionValueIds.push(value.id);
        });
        if (!optionNames.length && OPTION_VALUES.some((c) => row.cells[c]))
          fail({ row: row.line, column: "option1_name", code: "option_name_missing" });
        const combo = optionValueIds.join("|");
        if (combos.has(combo)) fail({ row: row.line, code: "duplicate_variant" });
        combos.add(combo);

        const price = money(row, "price");
        if (price === null) fail({ row: row.line, column: "price", code: "required" });
        const stockText = row.cells.stock;
        const stock = stockText ? parseInteger(stockText) : 0;
        if (stock === null)
          fail({ row: row.line, column: "stock", code: "invalid_number", value: stockText });
        variants.push({
          optionValueIds,
          sku: row.cells.sku || null,
          price: price ?? 0,
          compareAtPrice: money(row, "compare_at_price") ?? null,
          costPrice: money(row, "cost") ?? null,
          stockQuantity: stock ?? 0,
          trackInventory: yesNoCell("track_stock", row.cells.track_stock, row.line) ?? true,
          isActive: true,
        });
        variantRows.push(row.line);
      }
      if (variants.length > 150) fail({ row: firstRow, code: "too_many_variants" });
      input = {
        name: { ar: nameAr ?? "", ...(detail.get("name_en") ? { en: detail.get("name_en") } : {}) },
        slug: handle ?? undefined,
        shortDescription: localized(detail.get("short_ar"), detail.get("short_en")),
        description: localized(
          descriptionHtml("description_ar"),
          descriptionHtml("description_en"),
        ),
        status: status ?? "draft",
        primaryCategoryId: categoryIds?.[0] ?? null,
        categoryIds: categoryIds ?? [],
        brand: detail.get("brand") || null,
        tags: tags ?? [],
        isFeatured: featured ?? false,
        imageIds: [],
        options,
        variants,
      };
      created = variants.length;
    } else {
      // ── Existing product: only the columns in the file change ──
      const name: LocalizedText = { ...existing.name };
      if (has("name_ar")) {
        if (detail.get("name_ar")) name.ar = detail.get("name_ar");
        else fail({ row: firstRow, column: "name_ar", code: "required" });
      }
      if (has("name_en")) name.en = detail.get("name_en") || undefined;
      const short = { ...existing.shortDescription };
      if (has("short_ar")) short.ar = detail.get("short_ar") || undefined;
      if (has("short_en")) short.en = detail.get("short_en") || undefined;
      const description = { ...existing.description };
      if (has("description_ar")) description.ar = descriptionHtml("description_ar");
      if (has("description_en")) description.en = descriptionHtml("description_en");

      const options = existing.options.map((o) => ({
        name: { ...o.name },
        values: o.values.map((v) => ({ ...v, label: { ...v.label } })),
      }));
      if (optionNames.length && optionNames.length !== options.length)
        fail({ row: firstRow, column: "option1_name", code: "options_changed" });
      optionNames.forEach((label, oi) => {
        if (options[oi] && !sameLabel(labelOf(options[oi]!.name), label))
          options[oi]!.name.ar = label;
      });
      const optionColumns = OPTION_VALUES.some((c) => has(c));

      const variants: NonNullable<ProductInput["variants"]> = existing.variants.map((v) => ({
        id: v.id,
        optionValueIds: v.optionValueIds,
        sku: v.sku,
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        costPrice: v.costPrice,
        stockQuantity: v.stockQuantity,
        // Unchanged stock is a zero difference, so sales during the import are kept.
        stockBaseline: v.stockQuantity,
        trackInventory: v.trackInventory,
        imageId: v.imageId,
        isActive: v.isActive,
      }));
      variantRows = existing.variants.map(() => firstRow);
      const matched = new Set<number>();

      for (const row of group) {
        let index = -1;
        const sku = row.cells.sku;
        if (sku) index = existing.variants.findIndex((v) => v.sku === sku);
        if (index < 0 && !options.length) index = 0;
        let optionValueIds: string[] | null = null;
        if (index < 0 && options.length) {
          if (!optionColumns) {
            fail({ row: row.line, column: "sku", code: "variant_not_found", value: sku });
            continue;
          }
          optionValueIds = [];
          for (const [oi, option] of options.entries()) {
            const label = row.cells[OPTION_VALUES[oi]!];
            if (!label) {
              fail({ row: row.line, column: OPTION_VALUES[oi], code: "option_value_missing" });
              optionValueIds = null;
              break;
            }
            let value = option.values.find((v) => sameLabel(labelOf(v.label), label));
            if (!value)
              option.values.push((value = { id: newOptionValueId(), label: { ar: label } }));
            optionValueIds.push(value.id);
          }
          if (!optionValueIds) continue;
          const combo = optionValueIds.join("|");
          index = variants.findIndex((v) => (v.optionValueIds ?? []).join("|") === combo);
        }
        if (index >= 0 && matched.has(index)) {
          fail({
            row: row.line,
            code: options.length ? "duplicate_variant" : "single_row_product",
          });
          continue;
        }

        if (index < 0) {
          // A new size or color of an existing product.
          const price = money(row, "price");
          if (price === null) fail({ row: row.line, column: "price", code: "required" });
          const stockText = row.cells.stock;
          const stock = stockText ? parseInteger(stockText) : 0;
          if (stock === null)
            fail({ row: row.line, column: "stock", code: "invalid_number", value: stockText });
          variants.push({
            optionValueIds: optionValueIds ?? [],
            sku: sku || null,
            price: price ?? 0,
            compareAtPrice: money(row, "compare_at_price") ?? null,
            costPrice: money(row, "cost") ?? null,
            stockQuantity: stock ?? 0,
            trackInventory: yesNoCell("track_stock", row.cells.track_stock, row.line) ?? true,
            isActive: true,
          });
          variantRows.push(row.line);
          matched.add(variants.length - 1);
          created++;
          continue;
        }

        matched.add(index);
        updated++;
        const v = variants[index]!;
        variantRows[index] = row.line;
        if (has("price")) {
          const price = money(row, "price");
          if (price === null) fail({ row: row.line, column: "price", code: "required" });
          else if (price !== undefined) v.price = price;
        }
        if (has("compare_at_price")) {
          const value = money(row, "compare_at_price");
          if (value !== undefined) v.compareAtPrice = value;
        }
        if (has("cost")) {
          const value = money(row, "cost");
          if (value !== undefined) v.costPrice = value;
        }
        if (has("sku")) v.sku = sku || null;
        const track = yesNoCell("track_stock", row.cells.track_stock, row.line);
        if (track !== undefined) v.trackInventory = track;
        const stockText = row.cells.stock;
        if (stockText) {
          const stock = parseInteger(stockText);
          const baselineText = row.cells.stock_baseline;
          const baseline = baselineText ? parseInteger(baselineText) : v.stockBaseline!;
          if (stock === null)
            fail({ row: row.line, column: "stock", code: "invalid_number", value: stockText });
          else if (baseline === null)
            fail({
              row: row.line,
              column: "stock_baseline",
              code: "invalid_number",
              value: baselineText,
            });
          else {
            const current = existing.variants[index]!.stockQuantity;
            if (current + stock - baseline < 0) fail({ row: row.line, code: "negative_stock" });
            v.stockQuantity = stock;
            v.stockBaseline = baseline;
          }
        }
      }
      if (variants.length > 150) fail({ row: firstRow, code: "too_many_variants" });

      input = {
        name,
        slug: existing.slug,
        shortDescription: localized(short.ar, short.en),
        description: localized(description.ar ?? undefined, description.en ?? undefined),
        status: status ?? existing.status,
        primaryCategoryId: categoryIds ? (categoryIds[0] ?? null) : existing.primaryCategoryId,
        categoryIds: categoryIds ?? existing.categoryIds,
        brand: has("brand") ? detail.get("brand") || null : existing.brand,
        tags: tags ?? existing.tags,
        isFeatured: featured ?? existing.isFeatured,
        imageIds: existing.imageIds,
        options,
        variants,
        seo: existing.seo ?? undefined,
        expectedUpdatedAt: existing.updatedAt,
      };
    }

    // SKUs already used by another product.
    for (const row of group) {
      const sku = row.cells.sku;
      const owner = sku ? skuOwner.get(sku) : undefined;
      if (owner && owner !== existing?.id)
        fail({ row: row.line, column: "sku", code: "sku_taken", value: sku });
    }

    // The catalog's own rules (lengths, prices, combinations) with row numbers attached.
    if (errors.length === errorsBefore) {
      const parsed = productInputSchema.safeParse(input);
      if (!parsed.success) {
        for (const issue of parsed.error.issues.slice(0, 5)) {
          const [first, index, field] = issue.path;
          const row =
            first === "variants" && typeof index === "number"
              ? (variantRows[index] ?? firstRow)
              : firstRow;
          const code: ImportIssueCode =
            issue.message === "must_exceed_price"
              ? "compare_at_not_above_price"
              : issue.message === "duplicate_sku"
                ? "duplicate_sku"
                : issue.message === "invalid_slug"
                  ? "invalid_handle"
                  : issue.code === "too_big" && first === "variants" && index === undefined
                    ? "too_many_variants"
                    : issue.code === "too_big"
                      ? "too_long"
                      : "invalid_product";
          const column: CsvColumn | undefined =
            field === "compareAtPrice"
              ? "compare_at_price"
              : first === "name"
                ? index === "en"
                  ? "name_en"
                  : "name_ar"
                : first === "shortDescription"
                  ? index === "en"
                    ? "short_en"
                    : "short_ar"
                  : first === "description"
                    ? index === "en"
                      ? "description_en"
                      : "description_ar"
                    : first === "brand" || first === "tags"
                      ? first
                      : undefined;
          fail({ row, code, column });
        }
      }
    }

    if (existing) {
      summary.updated++;
      summary.variantsUpdated += updated;
    } else summary.created++;
    summary.variantsCreated += created;
    planned.push({ productId: existing?.id, input, firstRow });
    if (items.length < MAX_PREVIEW_ITEMS)
      items.push({
        action: existing ? "update" : "create",
        name: input.name.ar || input.name.en || "",
        handle: existing?.slug ?? handle,
        variants: input.variants.length,
      });
  }

  return done();
}

/** Check a file and describe what importing it would do. */
export async function previewProductImport(text: string, decimals: number) {
  return (await planImport(text, decimals)).preview;
}

/** Import a file that passes the checks: every product in one transaction (all or nothing). */
export async function applyProductImport(
  text: string,
  decimals: number,
  actor: Actor,
): Promise<ImportSummary> {
  const { preview, planned } = await planImport(text, decimals);
  if (preview.errors.length) throw new AppError("VALIDATION", "the file has errors");
  if (!planned.length) throw new AppError("VALIDATION", "nothing to import");

  const ids = await db.transaction(async (tx) => {
    const saved: string[] = [];
    for (const p of planned) saved.push((await saveProductTx(tx, p.input, actor, p.productId)).id);
    await audit(
      {
        action: "product.import",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "product",
        metadata: { ...preview.summary },
      },
      tx,
    );
    return saved;
  });
  invalidate(CacheTags.catalog, ...ids.map((id) => CacheTags.product(id)));
  return preview.summary;
}
