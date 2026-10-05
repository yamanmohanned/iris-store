/**
 * Phone numbers typed by customers ("0770 123 4567", "٠٧٧٠١٢٣٤٥٦٧", "+964 770 123 4567") are
 * normalized to E.164 ("+9647701234567") so orders, tracking and coupon limits compare reliably.
 */

/** Mobile number rules (national significant number, without the trunk 0) for preset countries. */
const MOBILE_RULES: Record<string, RegExp> = {
  "964": /^7\d{9}$/, // Iraq
  "966": /^5\d{8}$/, // Saudi Arabia
  "971": /^5\d{8}$/, // UAE
  "965": /^[569]\d{7}$/, // Kuwait
  "974": /^[3567]\d{7}$/, // Qatar
  "973": /^[36]\d{7}$/, // Bahrain
  "968": /^[79]\d{7}$/, // Oman
  "962": /^7[789]\d{7}$/, // Jordan
  "20": /^1[0125]\d{8}$/, // Egypt
};

/** Arabic-Indic (٠-٩) and Persian (۰-۹) digits → ASCII. */
export function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

function validNational(countryDigits: string, national: string): boolean {
  const rule = MOBILE_RULES[countryDigits];
  return rule ? rule.test(national) : /^\d{6,12}$/.test(national);
}

/**
 * Normalize to E.164 using the store's country calling code (e.g. "+964").
 * Local numbers get the store's code; numbers with "+"/"00" keep their own. Returns null if invalid.
 */
export function normalizePhone(input: string, storePhoneCode: string): string | null {
  const cc = storePhoneCode.replace(/\D/g, "");
  // Drop spaces, dashes, dots, brackets and invisible direction marks people paste in.
  let s = toLatinDigits(input.trim()).replace(/[\s\-().‎‏‪-‮]/g, "");
  let international = false;
  if (s.startsWith("+")) {
    international = true;
    s = s.slice(1);
  } else if (s.startsWith("00")) {
    international = true;
    s = s.slice(2);
  }
  if (!/^\d+$/.test(s)) return null;

  let full: string;
  if (international) full = s;
  else if (s.startsWith(cc) && validNational(cc, s.slice(cc.length).replace(/^0/, "")))
    full = s; // country code typed without "+"
  else full = cc + s.replace(/^0/, ""); // local format with or without the trunk 0

  if (full.startsWith(cc)) {
    const national = full.slice(cc.length).replace(/^0/, ""); // "+964 0770…" is common
    return validNational(cc, national) ? `+${cc}${national}` : null;
  }
  // A foreign number (e.g. a relative abroad): accept any plausible E.164 number.
  return /^[1-9]\d{7,14}$/.test(full) ? `+${full}` : null;
}

/** "+9647701234567" → "+964 770 123 4567" (always render inside dir="ltr"). */
export function formatPhone(e164: string, storePhoneCode?: string): string {
  if (!e164.startsWith("+")) return e164;
  const digits = e164.slice(1);
  const cc =
    storePhoneCode && digits.startsWith(storePhoneCode.replace(/\D/g, ""))
      ? storePhoneCode.replace(/\D/g, "")
      : (Object.keys(MOBILE_RULES).find((c) => digits.startsWith(c)) ?? digits.slice(0, 3));
  const national = digits.slice(cc.length);
  const groups =
    national.length > 7
      ? [national.slice(0, 3), national.slice(3, 6), national.slice(6)]
      : [national.slice(0, national.length - 4), national.slice(-4)];
  return `+${cc} ${groups.filter(Boolean).join(" ")}`;
}

/** Example shown in phone fields, in the local format customers know. */
export function phonePlaceholder(storePhoneCode: string): string {
  const examples: Record<string, string> = {
    "964": "0770 123 4567",
    "966": "050 123 4567",
    "971": "050 123 4567",
    "965": "9 123 4567",
    "974": "3312 3456",
    "973": "3612 3456",
    "968": "9212 3456",
    "962": "079 123 4567",
    "20": "010 1234 5678",
  };
  return examples[storePhoneCode.replace(/\D/g, "")] ?? `${storePhoneCode} …`;
}
