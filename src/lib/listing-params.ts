import "server-only";
import { z } from "zod";
import { SORTS, type ListingParams } from "./listing";

/** Validation for the listing URL params (see `ListingParams`). */
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
