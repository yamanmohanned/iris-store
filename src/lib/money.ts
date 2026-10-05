/**
 * Money helpers. Amounts are integers in the currency's minor unit as configured for the store
 * (`decimals`), e.g. IQD with 0 decimals → 25000 means 25,000 IQD.
 */
export type CurrencyConfig = { currency: string; decimals: number };

export function toMinor(major: number, decimals: number): number {
  return Math.round(major * 10 ** decimals);
}

export function toMajor(minor: number, decimals: number): number {
  return minor / 10 ** decimals;
}

/** Arabic currency abbreviations as commonly printed on price tags (Intl adds stray dots/marks). */
const AR_SYMBOLS: Record<string, string> = {
  IQD: "د.ع",
  SAR: "ر.س",
  AED: "د.إ",
  KWD: "د.ك",
  QAR: "ر.ق",
  BHD: "د.ب",
  OMR: "ر.ع",
  JOD: "د.أ",
  EGP: "ج.م",
  SYP: "ل.س",
  LBP: "ل.ل",
  LYD: "د.ل",
  YER: "ر.ي",
  SDG: "ج.س",
  MAD: "د.م",
  TND: "د.ت",
  DZD: "د.ج",
  USD: "$",
  EUR: "€",
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let f = formatters.get(key);
  if (!f) {
    // Latin digits: clearer for prices and consistent across Arabic regions.
    f = new Intl.NumberFormat(`${locale}-u-nu-latn`, opts);
    formatters.set(key, f);
  }
  return f;
}

export function formatMoney(
  minor: number,
  { currency, decimals }: CurrencyConfig,
  locale: string,
): string {
  const major = toMajor(minor, decimals);
  if (locale === "ar") {
    const n = formatter("ar", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
    return `${n} ${AR_SYMBOLS[currency] ?? currency}`;
  }
  return formatter(locale, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

export function formatNumber(value: number, locale: string): string {
  return formatter(locale, {}).format(value);
}

/** Discount percentage between a compare-at price and the selling price (rounded down). */
export function discountPercent(
  price: number,
  compareAt: number | null | undefined,
): number | null {
  if (!compareAt || compareAt <= price || compareAt <= 0) return null;
  return Math.floor(((compareAt - price) / compareAt) * 100);
}

/** "25,000" / "٢٥٠٠٠" / "25.5" typed in the store currency → minor units; null when invalid. */
export function parseMoneyInput(text: string, decimals: number): number | null {
  const normalized = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٫]/g, ".")
    .replace(/[\s,٬]/g, "");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const [, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) return null;
  const value = Math.round(Number(normalized) * 10 ** decimals);
  return Number.isSafeInteger(value) ? value : null;
}

/** Minor units → the plain number shown in an input (no grouping, no symbol). */
export function moneyInputValue(minor: number | null | undefined, decimals: number): string {
  if (minor == null) return "";
  return decimals ? (minor / 10 ** decimals).toFixed(decimals) : String(minor);
}
