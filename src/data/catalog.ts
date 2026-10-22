import { useSyncExternalStore } from 'react';
import { seedCategories, seedProducts, seedSettings } from './seed';
import type { CatalogData, Category, CategorySlug, Product, StoreSettings } from './types';

/**
 * الكتالوج الحي: الأقسام والمنتجات التي يديرها المالك من لوحة الإدارة.
 *
 * مخزن واحد على مستوى الوحدة (useSyncExternalStore) حتى تبقى الدوال المساعدة
 * (getProduct، searchProducts…) متاحة خارج React (مثل السلة) وتبقى المكونات متزامنة.
 * يُحمَّل من الخادم عند بدء التطبيق (state/catalog.tsx)، وإلى ذلك الحين تُستخدم البيانات الأولية.
 */

export const DEFAULT_SETTINGS: StoreSettings = seedSettings;

export const SEED_CATALOG: CatalogData = { categories: seedCategories, products: seedProducts, settings: DEFAULT_SETTINGS };

export interface CatalogSnapshot extends CatalogData {
  /** الأقسام الظاهرة للزوار بترتيب المالك */
  visibleCategories: Category[];
  /** المنتجات الظاهرة للزوار (غير مخفية وقسمها ظاهر) بترتيب المالك */
  visibleProducts: Product[];
  byId: Map<string, Product>;
  bySlug: Map<string, Product>;
}

function build(data: CatalogData): CatalogSnapshot {
  const settings = { ...DEFAULT_SETTINGS, ...data.settings, coupons: data.settings?.coupons ?? DEFAULT_SETTINGS.coupons };
  const visibleCategories = data.categories.filter((c) => !c.hidden);
  const shown = new Set(visibleCategories.map((c) => c.slug));
  return {
    ...data,
    settings,
    visibleCategories,
    visibleProducts: data.products.filter((p) => !p.hidden && shown.has(p.category)),
    byId: new Map(data.products.map((p) => [p.id, p])),
    bySlug: new Map(data.products.map((p) => [p.slug, p])),
  };
}

let snapshot = build(SEED_CATALOG);
const listeners = new Set<() => void>();

export function getCatalog(): CatalogSnapshot {
  return snapshot;
}

export function setCatalog(data: CatalogData): void {
  snapshot = build(data);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** يعيد الكتالوج الحالي ويعيد التصيير عند تحديثه (تحميل من الخادم أو حفظ من لوحة الإدارة). */
export function useCatalog(): CatalogSnapshot {
  return useSyncExternalStore(subscribe, getCatalog, getCatalog);
}

/** منتج بالمعرّف أو الرابط (يشمل المخفي — الصفحات تقرر عرضه). */
export function getProduct(idOrSlug: string | undefined): Product | undefined {
  if (!idOrSlug) return undefined;
  return snapshot.byId.get(idOrSlug) ?? snapshot.bySlug.get(idOrSlug);
}

/** هل يظهر المنتج للزوار؟ */
export function isProductVisible(p: Product): boolean {
  return !p.hidden && snapshot.visibleCategories.some((c) => c.slug === p.category);
}

export function getCategory(slug: string | undefined): Category | undefined {
  return snapshot.categories.find((c) => c.slug === slug);
}

/** منتجات القسم الظاهرة للزوار بترتيب المالك. */
export function productsByCategory(slug: CategorySlug): Product[] {
  return snapshot.visibleProducts.filter((p) => p.category === slug);
}

export type Family = 'couple' | 'gift' | 'steel' | 'other';

export const familyLabels: Record<Family, string> = {
  couple: 'لشخصين (كبلز)',
  gift: 'هدايا تحمل رسالة',
  steel: 'ستانلس ستيل',
  other: 'قطع أخرى',
};

/** تصنيف فرعي مشتق من الاسم/الوصف/المعدن (يُستبدل بحقل حقيقي عند الربط بقاعدة بيانات). */
export function familyOf(p: Product): Family {
  const t = `${p.name} ${p.summary} ${p.metal}`;
  if (/كبلز|ثنائي|لشخصين/.test(t)) return 'couple';
  if (/أحبك|رسالة|صورة|أمني/.test(t)) return 'gift';
  if (/ستانلس|ستيل/.test(t)) return 'steel';
  return 'other';
}

const stripMarks = (s: string) =>
  s
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** يطابق اسماً ظاهراً في التصميم (مثل «قلادة ذهبية رقم 102») مع منتج الكتالوج. */
export function findProductByName(name: string | null | undefined): Product | undefined {
  if (!name) return undefined;
  const n = stripMarks(name);
  const products = snapshot.visibleProducts;
  return (
    products.find((p) => stripMarks(p.shortName) === n || stripMarks(p.name) === n) ??
    products.find((p) => n.includes(stripMarks(p.shortName)) || stripMarks(p.name).includes(n))
  );
}

/**
 * توحيد الكتابة العربية للبحث: بلا تشكيل، والهمزات (أ إ آ) ألفاً، والتاء المربوطة هاءً، والألف المقصورة ياءً.
 * فتجد «اساور» الأساورَ و«قلاده» القلادةَ و«لولو» اللؤلؤَ.
 */
export function normalizeArabic(s: string): string {
  return stripMarks(s)
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ/g, '');
}

/** بحث نصي بسيط على الاسم/الرمز/الوصف. */
export function searchProducts(query: string): Product[] {
  const q = normalizeArabic(query);
  if (!q) return [];
  return snapshot.visibleProducts.filter((p) =>
    [p.name, p.shortName, p.sku, p.summary, p.metal, ...(p.tags ?? [])].some((s) => normalizeArabic(s).includes(q)),
  );
}

/** قطع مقترحة لشرائط «مختارات آيريس»: المتوفرة فقط، وتتقدّمها الأكثر طلباً والجديدة. */
export function featuredPicks(products: Product[], limit = 8): Product[] {
  const inStock = products.filter((p) => p.stock > 0);
  const featured = inStock.filter((p) => p.badge === 'bestseller' || p.badge === 'new');
  return (featured.length >= 4 ? featured : inStock).slice(0, limit);
}

export const badgeLabels: Record<NonNullable<Product['badge']>, string> = {
  new: 'جديد',
  sale: 'تخفيض',
  exclusive: 'إصدار خاص',
  bestseller: 'الأكثر طلباً',
  limited: 'إصدار حصري',
  soldout: 'نفد مؤقتاً',
};
