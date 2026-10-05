import { z } from "zod";
import { LISTING_PAGE_SIZE, parseListingParams, priceFilterMinor } from "@/lib/listing";
import { clientIpFrom } from "@/server/security/client-ip";
import { memoryRateLimit } from "@/server/security/memory-rate-limit";
import { listProducts } from "@/server/services/catalog";
import { getSettings } from "@/server/services/settings";

/** Next page of a product listing for "Show more" (same filters as the page that rendered it). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ip = clientIpFrom(request.headers) ?? "unknown";
  if (!memoryRateLimit(`products:${ip}`, 120, 60_000))
    return Response.json({ error: "rate_limited" }, { status: 429 });
  const params = parseListingParams(Object.fromEntries(url.searchParams));
  const category = z.uuid().safeParse(url.searchParams.get("category"));
  const settings = await getSettings();
  const result = await listProducts({
    q: params.q,
    sort: params.sort,
    categoryId: category.success ? category.data : undefined,
    inStock: params.stock === "1",
    onSale: params.sale === "1",
    featured: params.featured === "1",
    ...priceFilterMinor(params, settings.general.currencyDecimals),
    page: params.page ?? 1,
    pageSize: LISTING_PAGE_SIZE,
  });
  return Response.json(
    { items: result.items, total: result.total, page: result.page },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } },
  );
}
