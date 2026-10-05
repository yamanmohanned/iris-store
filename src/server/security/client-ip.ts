import "server-only";
import { env } from "@/server/env";

/**
 * Resolve the client IP from proxy headers according to the deployment configuration.
 * With X-Forwarded-For, the right-most entries are appended by our own trusted proxies, so
 * the client is `TRUSTED_PROXY_COUNT` positions from the end — left-most values are spoofable.
 */
export function clientIpFrom(headers: Headers): string | null {
  const { CLIENT_IP_HEADER, TRUSTED_PROXY_COUNT } = env();
  if (CLIENT_IP_HEADER === "none") return null;
  const raw = headers.get(CLIENT_IP_HEADER);
  if (!raw) return null;
  if (CLIENT_IP_HEADER !== "x-forwarded-for") return sanitizeIp(raw.trim());
  const hops = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (hops.length === 0) return null;
  const index = Math.max(0, hops.length - Math.max(1, TRUSTED_PROXY_COUNT));
  return sanitizeIp(hops[index]!);
}

function sanitizeIp(value: string): string | null {
  // Accept IPv4/IPv6 literal characters only; anything else is treated as absent.
  return /^[0-9a-fA-F:.]{2,45}$/.test(value) ? value : null;
}
