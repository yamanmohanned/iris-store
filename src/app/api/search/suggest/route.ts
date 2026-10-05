import { clientIpFrom } from "@/server/security/client-ip";
import { memoryRateLimit } from "@/server/security/memory-rate-limit";
import { searchSuggestions } from "@/server/services/catalog";

/** Type-ahead suggestions for the search box. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ip = clientIpFrom(request.headers) ?? "unknown";
  if (!memoryRateLimit(`suggest:${ip}`, 90, 60_000))
    return Response.json({ products: [], categories: [] }, { status: 429 });
  const q = (url.searchParams.get("q") ?? "").slice(0, 80);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "ar";
  return Response.json(await searchSuggestions(q, locale));
}
