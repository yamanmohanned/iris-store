import type { Product, ProductContent } from '@/data/types';

/**
 * منطق خيارات المنتج المشترك بين صفحة الديسكتوب (`ProductView`) وصفحة الموبايل
 * (`ProductMobile`): المعادن المتاحة، المقاس الافتراضي، والمحتوى الافتراضي.
 */

export const METAL_STYLES: Record<string, { label: string; gradient: string }> = {
  gold: { label: 'ذهب أصفر عيار 18', gradient: 'from-antique-gold via-champagne-gold to-yellow-200' },
  white: { label: 'ذهب أبيض عيار 18', gradient: 'from-slate-300 via-white to-slate-200' },
  rose: { label: 'ذهب وردي عيار 18', gradient: 'from-rose-300 via-rose-100 to-amber-100' },
  silver: { label: 'فضة استرليني 925', gradient: 'from-slate-400 via-slate-100 to-slate-300' },
  black: { label: 'ذهب أسود عيار 18', gradient: 'from-neutral-700 via-neutral-500 to-neutral-800' },
};

export interface MetalOption {
  key: string;
  label: string;
  gradient: string;
}

export function metalOptionsFor(p: Product): MetalOption[] {
  const keys = p.swatches?.length ? p.swatches : [];
  const list = keys.map((k) => ({ key: k, ...METAL_STYLES[k] }));
  // الذهب الأصفر الفعلي للقطعة يُعرض باسمه الكامل
  if (!list.length) return [{ key: 'gold', label: p.metal, gradient: METAL_STYLES.gold.gradient }];
  return list.map((m, i) => (i === 0 ? { ...m, label: p.metal.includes('أبيض') && m.key === 'white' ? p.metal : m.label } : m));
}

/** «بقيت قطعة واحدة / قطعتان / 3 قطع فقط» بصيغة العدد العربية الصحيحة. */
export function remainingText(stock: number): string {
  if (stock === 1) return 'بقيت قطعة واحدة فقط';
  if (stock === 2) return 'بقيت قطعتان فقط';
  return `بقيت ${stock} قطع فقط`;
}

/** المقاس المختار مبدئياً: «الأكثر طلباً» إن توفّر، وإلا أول مقاس غير منتهٍ. */
export function defaultSizeFor(p: Product): string | undefined {
  const size = p.sizes?.find((s) => !s.soldOut && s.note?.includes('الأكثر')) ?? p.sizes?.find((s) => !s.soldOut);
  return size?.label;
}

export function genericContent(p: Product): ProductContent {
  return {
    description: [
      `${p.summary}. صياغة يدوية من ${p.metal} بتشطيب حريري ناعم الملمس، تحمل ختم دار آيريس ورقم القطعة ${p.sku}.`,
      'تُسلَّم القطعة في صندوق الدار المخملي العنابي مرفقة بشهادة الأصالة وبطاقة العناية.',
    ],
    specs: [
      { label: 'نوع المعدن والعيار', value: p.metal },
      { label: 'رقم القطعة (SKU)', value: p.sku },
      { label: 'الصياغة', value: 'يدوية بإشراف صائغ الدار' },
      { label: 'الضمان', value: 'بطاقة ضمان وشهادة أصالة مع القطعة' },
    ],
  };
}
