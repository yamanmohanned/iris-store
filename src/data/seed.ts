import seed from './seed.json';
import type { Category, Product, StoreSettings } from './types';

/**
 * المحتوى الافتتاحي لكتالوج آيريس ستور (أول منتجات إنستغرام) — ملف JSON واحد يشترك فيه
 * المتجر وخادم PHP (يُنسخ إلى api/data/catalog.seed.json عند تجهيز حزمة الرفع).
 * تُعرض إلى أن يحفظ المالك كتالوجه من لوحة الإدارة.
 */
export const seedCategories = seed.categories as Category[];
export const seedProducts = seed.products as Product[];
export const seedSettings = seed.settings as StoreSettings;
