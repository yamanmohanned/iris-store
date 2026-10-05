/**
 * Tiny in-process fixed-window limiter for low-value endpoints (e.g. CSP reports) where a
 * per-instance limit is good enough. Business-critical limits use the database limiter.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function memoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size > 10_000) buckets.clear(); // bound memory under abuse
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
