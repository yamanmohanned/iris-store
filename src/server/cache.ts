import "server-only";
import { createHash } from "node:crypto";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

/**
 * Data-cache wrapper around Next's `unstable_cache` (we do not enable Cache Components because the
 * nonce-based CSP requires dynamic rendering). Outside the Next runtime (tests, scripts) it is a
 * pass-through. Cached values are JSON-serialized: return plain data (ISO strings, not Dates).
 *
 * Note: the default cache is per server instance. For several instances behind a load balancer,
 * configure a shared cache handler or lower `DATA_CACHE_TTL_SECONDS`.
 */
export const CacheTags = {
  settings: "settings",
  catalog: "catalog",
  content: "content",
  shipping: "shipping",
  product: (id: string) => `product:${id}`,
} as const;

const inNextRuntime = () => Boolean(process.env.NEXT_RUNTIME);
const ttl = () => Number(process.env.DATA_CACHE_TTL_SECONDS ?? 3600);
/** DATA_CACHE=off bypasses caching (E2E runs, debugging). */
const cacheDisabled = () => process.env.DATA_CACHE === "off";

/**
 * Entries are namespaced per database, so two servers sharing one build directory (e.g. dev and
 * E2E) never read each other's cached data.
 */
function namespace(): string {
  return createHash("sha256")
    .update(process.env.DATABASE_URL ?? "")
    .digest("hex")
    .slice(0, 10);
}

export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  tags: string[],
): (...args: A) => Promise<R> {
  if (!inNextRuntime() || cacheDisabled()) return fn;
  return unstable_cache(fn, [namespace(), ...keyParts], { tags, revalidate: ttl() });
}

/** Expire tagged data immediately (next request recomputes). Safe in actions and route handlers. */
export function invalidate(...tags: string[]) {
  if (!inNextRuntime()) return;
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}

/** Re-render every page on its next request (layout-wide data such as branding changed). */
export function invalidateAllPages() {
  if (!inNextRuntime()) return;
  revalidatePath("/", "layout");
}
