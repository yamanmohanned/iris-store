/**
 * تنسيق الأرقام والمبالغ.
 * نظام التصميم: الأسعار وأرقام الطلبات بأرقام لاتينية (0-9) وبصيغة «25,000 د.ع».
 */
const nf = new Intl.NumberFormat('en-US');

export function formatNumber(n: number): string {
  return nf.format(Math.round(n));
}

export function formatIQD(n: number): string {
  return `${formatNumber(n)} د.ع`;
}

/** يحوّل 12345 إلى «12.3K» للمؤشرات المختصرة. */
export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const dateFmt = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
export function formatDate(d: Date | string | number): string {
  return dateFmt.format(new Date(d));
}

/** رقم طلب بصيغة #1054 */
export function orderNumber(n: number): string {
  return `#${n}`;
}

export interface ArabicCountForms {
  /** عدد 1 (يُكتب بلا رقم) */
  one: string;
  /** عدد 2 (مثنى، بلا رقم) */
  two: string;
  /** 3–10 (جمع) */
  few: string;
  /** 11+ (مفرد منصوب) */
  many: string;
}

/** صيغة المعدود العربية الصحيحة: 1 مفرد، 2 مثنى، 3–10 جمع، 11+ مفرد منصوب. */
export function arabicCount(n: number, forms: ArabicCountForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${formatNumber(n)} ${forms.many}`;
}

export const productCount = (n: number) =>
  arabicCount(n, { one: 'منتج واحد', two: 'منتجان', few: 'منتجات', many: 'منتجاً' });

export const piecesCount = (n: number) => arabicCount(n, { one: 'قطعة واحدة', two: 'قطعتان', few: 'قطع', many: 'قطعة' });
