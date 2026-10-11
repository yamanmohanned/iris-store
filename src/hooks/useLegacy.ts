import { useEffect } from 'react';
import { registerLegacy, type LegacyFn } from '@/lib/legacy';

/**
 * يسجّل دوال الصفحة التي كانت مُعرَّفة عالمياً في سكربت Stitch الأصلي
 * (مثل toggleFaq / adjustQty) لتُستدعى من `data-legacy-onclick`.
 * الدوال تُمرَّر عبر ref فتستخدم دائماً آخر نسخة دون إعادة التسجيل.
 */
export function useLegacy(fns: Record<string, LegacyFn>): void {
  useEffect(() => registerLegacy(fns));
}
