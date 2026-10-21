/**
 * هل استُورد منشور إنستغرام من قبل؟ المنتج يحفظ مصدره (ig:<رقم المنشور>) ورابطه الأصلي،
 * فنطابق بأيٍّ منهما — منتجات المحتوى الافتتاحي تحمل رمز الرابط (shortcode) لا رقم Graph.
 */
import type { Product } from '@/data/types';
import type { IgPost } from '@/lib/adminApi';

export function igShortcode(url: string | undefined): string | null {
  return /instagram\.com\/(?:[\w.]+\/)?(?:p|reel|tv)\/([A-Za-z0-9_-]+)/.exec(url ?? '')?.[1] ?? null;
}

export function importedKeys(products: Product[]): Set<string> {
  const keys = new Set<string>();
  for (const p of products) {
    if (p.source) keys.add(p.source);
    const sc = igShortcode(p.sourceUrl);
    if (sc) keys.add(`sc:${sc}`);
  }
  return keys;
}

export function isPostImported(keys: Set<string>, post: Pick<IgPost, 'id' | 'permalink'>): boolean {
  const sc = igShortcode(post.permalink);
  return keys.has(`ig:${post.id}`) || (sc !== null && keys.has(`sc:${sc}`));
}
