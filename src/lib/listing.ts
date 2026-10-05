import { z } from "zod";
import { toMinor } from "./money";

export const LISTING_PAGE_SIZE = 24;

export const SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "best_selling",
  "discount",
  "relevance",
] as const;
export type ListingSort = (typeof SORTS)[number];

/** URL search params shared by category, search and "all products" pages (and /api/products). */
const paramsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  sort: z.enum(SORTS).optional(),
  min: z.coerce.number().min(0).max(1e9).optional(),
  max: z.coerce.number().min(0).max(1e9).optional(),
  stock: z.literal("1").optional(),
  sale: z.literal("1").optional(),
  featured: z.literal("1").optional(),
  page: z.coerce.number().int().min(1).max(200).optional(),
});

export type ListingParams = z.infer<typeof paramsSchema>;

/** Lenient parsing: invalid values are dropped instead of failing the page. */
export function parseListingParams(
  raw: Record<string, string | string[] | undefined>,
): ListingParams {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (typeof value === "string" && value !== "") flat[k] = value;
  }
  const result: ListingParams = {};
  for (const key of Object.keys(paramsSchema.shape) as (keyof ListingParams)[]) {
    if (!(key in flat)) continue;
    const parsed = paramsSchema.shape[key].safeParse(flat[key]);
    if (parsed.success) (result as Record<string, unknown>)[key] = parsed.data;
  }
  return result;
}

/** Convert price filters typed in the store currency (major units) to stored minor units. */
export function priceFilterMinor(params: ListingParams, decimals: number) {
  return {
    minPrice: params.min != null ? toMinor(params.min, decimals) : undefined,
    maxPrice: params.max != null ? toMinor(params.max, decimals) : undefined,
  };
}

export function activeFilterCount(p: ListingParams): number {
  return [p.min != null, p.max != null, p.stock, p.sale].filter(Boolean).length;
}

export function toQueryString(
  p: ListingParams,
  overrides: Partial<Record<keyof ListingParams, string | number | undefined>> = {},
) {
  const merged: Record<string, string | number | undefined> = { ...p, ...overrides };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged))
    if (v !== undefined && v !== "") qs.set(k, String(v));
  return qs.toString();
}
