import { assertStaff } from "@/server/auth/session";
import { isAppError } from "@/server/errors";
import { logger } from "@/server/logger";
import { enforceRateLimit } from "@/server/security/rate-limit";
import { audit } from "@/server/services/audit";
import { exportProductsCsv, productCsvTemplate } from "@/server/services/product-csv";
import { getSettings } from "@/server/services/settings";

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Products spreadsheet download (`?template=1` for an empty one with examples; `?lang=en` for
 * English headers). Staff who edit products only: the file includes cost prices. Each export is
 * recorded in the audit log.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const locale = params.get("lang") === "en" ? "en" : "ar";
  const template = params.get("template") === "1";
  try {
    const { actor } = await assertStaff("products:write");
    await enforceRateLimit(`products:export:${actor.id}`, 30, 3600);

    let body: string;
    let filename: string;
    if (template) {
      body = productCsvTemplate(locale);
      filename = "products-template.csv";
    } else {
      const { general } = await getSettings();
      body = await exportProductsCsv(locale, general.currencyDecimals);
      filename = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      await audit({
        action: "product.export",
        actorId: actor.id,
        actorLabel: actor.label,
        entityType: "product",
      });
    }
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isAppError(error)) {
      const status =
        error.code === "UNAUTHORIZED" ? 401 : error.code === "RATE_LIMITED" ? 429 : 403;
      return json({ error: error.code.toLowerCase() }, status);
    }
    logger.error({ err: error }, "product export failed");
    return json({ error: "internal" }, 500);
  }
}
