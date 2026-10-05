import "server-only";
import { cache } from "react";
import { tl } from "@/lib/localized";
import type { CurrencyConfig } from "@/lib/money";
import { getCategoryTree } from "@/server/services/catalog";
import { getSettings } from "@/server/services/settings";

/** Per-request storefront context (settings, currency, navigation). Deduplicated with React cache. */
export const getStoreContext = cache(async (locale: string) => {
  const [settings, categoryTree] = await Promise.all([getSettings(), getCategoryTree()]);
  const currency: CurrencyConfig = {
    currency: settings.general.currency,
    decimals: settings.general.currencyDecimals,
  };
  return {
    settings,
    currency,
    categoryTree,
    storeName: tl(settings.general.storeName, locale) || "Store",
    tagline: tl(settings.general.tagline, locale),
  };
});

/** "+964 770…" → "9647700…" for wa.me links (digits only). */
export function whatsappNumber(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 ? digits : null;
}
