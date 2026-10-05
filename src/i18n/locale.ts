import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing, type Locale } from "./routing";

/** Narrow a route param to a supported locale, or render the 404 page. */
export function assertLocale(value: string): Locale {
  if (!hasLocale(routing.locales, value)) notFound();
  return value;
}
