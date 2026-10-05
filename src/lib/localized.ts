import type { LocalizedText } from "@/server/db/schema/_shared";

export type { LocalizedText };

const FALLBACK_ORDER = ["ar", "en"] as const;

/**
 * Pick the text for `locale`, falling back to the other language so content entered in only one
 * language still shows up (owners may skip the English translation).
 */
export function tl(value: LocalizedText | null | undefined, locale: string): string {
  if (!value) return "";
  const exact = value[locale as keyof LocalizedText];
  if (exact && exact.trim()) return exact;
  for (const l of FALLBACK_ORDER) {
    const v = value[l];
    if (v && v.trim()) return v;
  }
  return "";
}

/** Drop blank languages: `{ ar: "x", en: " " }` → `{ ar: "x" }` (null when nothing is left). */
export function compactText(value: LocalizedText | null | undefined): LocalizedText | null {
  const out: LocalizedText = {};
  for (const l of FALLBACK_ORDER) {
    const v = value?.[l]?.trim();
    if (v) out[l] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function hasText(value: LocalizedText | null | undefined): boolean {
  return Boolean(value && Object.values(value).some((v) => typeof v === "string" && v.trim()));
}
