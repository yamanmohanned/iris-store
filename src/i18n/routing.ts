import { defineRouting } from "next-intl/routing";

export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  // Arabic (default) lives at "/", English at "/en/...".
  localePrefix: "as-needed",
  // The URL alone decides the language: no Accept-Language guessing, no locale cookie.
  localeDetection: false,
  localeCookie: false,
});

export const rtlLocales: ReadonlySet<Locale> = new Set(["ar"]);

export function dirOf(locale: Locale): "rtl" | "ltr" {
  return rtlLocales.has(locale) ? "rtl" : "ltr";
}
