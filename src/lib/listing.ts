/**
 * Listing helpers shared by server pages and the (client) toolbar. Keep this module free of zod:
 * it ships to the browser, and the URL parser lives in `listing-params.ts` (server only).
 */
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
export type ListingParams = {
  q?: string;
  sort?: ListingSort;
  min?: number;
  max?: number;
  stock?: "1";
  sale?: "1";
  featured?: "1";
  page?: number;
};

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
