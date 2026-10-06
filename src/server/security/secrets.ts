import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Compare a provided secret with the expected one in constant time (via fixed-length digests). */
export function secretMatches(provided: string, expected: string | undefined | null): boolean {
  if (!expected) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
