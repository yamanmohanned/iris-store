import "server-only";
import { env } from "@/server/env";
import { getSettings } from "@/server/services/settings";
import type { Brand } from "@/server/email/templates";

/** Store identity used in transactional emails. */
export async function emailBrand(locale: "ar" | "en" = "ar"): Promise<Brand> {
  const s = await getSettings();
  return {
    storeName:
      (locale === "en" ? s.general.storeName.en : s.general.storeName.ar) ||
      s.general.storeName.ar ||
      "Store",
    primaryColor: s.branding.primaryColor,
    appUrl: env().APP_URL,
  };
}
