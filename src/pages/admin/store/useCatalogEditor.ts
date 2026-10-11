import { useCallback, useState } from 'react';
import { getCatalog } from '@/data/catalog';
import type { CatalogData } from '@/data/types';
import { useCatalogSync } from '@/state/catalog';
import { useToast } from '@/state/toast';

/** معرّف رابط من الاسم: حروف عربية/لاتينية وأرقام وشرطات (يطابق تحقق الخادم). */
export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[ً-ٰٟـ]/g, '') // التشكيل والتطويل
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'item'
  );
}

/** يضيف -2، -3… حتى يصبح المعرّف فريداً. */
export function uniqueSlug(base: string, taken: Iterable<string>, self?: string): string {
  const used = new Set(taken);
  if (self) used.delete(self);
  let slug = base;
  for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * تعديل كتالوج المالك وحفظه فوراً على الخادم. كل تعديل يُبنى على أحدث نسخة
 * ويُرسل كاملاً؛ الخادم يتحقق منه ويعيد النسخة المعتمدة.
 */
export function useCatalogEditor() {
  const { save, online } = useCatalogSync();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const commit = useCallback(
    async (mutate: (draft: CatalogData) => CatalogData, success?: string): Promise<boolean> => {
      const current = getCatalog();
      const draft: CatalogData = {
        categories: current.categories.map((c) => ({ ...c })),
        products: current.products.map((p) => ({ ...p })),
        settings: { ...current.settings },
      };
      setSaving(true);
      try {
        await save(mutate(draft));
        if (success) toast.show(success, 'check_circle');
        return true;
      } catch (e) {
        toast.show(e instanceof Error ? e.message : 'تعذر الحفظ', 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [save, toast],
  );

  return { commit, saving, online };
}
