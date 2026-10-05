import { logger } from "@/server/logger";
import { clientIpFrom } from "@/server/security/client-ip";
import { memoryRateLimit } from "@/server/security/memory-rate-limit";

const MAX_BYTES = 16 * 1024;

/** Receives browser CSP violation reports (report-uri). Logged for monitoring, never trusted. */
export async function POST(request: Request) {
  const ip = clientIpFrom(request.headers) ?? "unknown";
  if (!memoryRateLimit(`csp:${ip}`, 20, 60_000)) return new Response(null, { status: 204 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return new Response(null, { status: 413 });

  try {
    const text = (await request.text()).slice(0, MAX_BYTES);
    const body = JSON.parse(text) as { "csp-report"?: Record<string, unknown> };
    const report = body["csp-report"] ?? {};
    logger.warn(
      {
        csp: {
          directive: String(
            report["violated-directive"] ?? report["effective-directive"] ?? "",
          ).slice(0, 100),
          blocked: String(report["blocked-uri"] ?? "").slice(0, 200),
          document: String(report["document-uri"] ?? "").slice(0, 200),
        },
      },
      "csp violation",
    );
  } catch {
    // Malformed reports are ignored.
  }
  return new Response(null, { status: 204 });
}
