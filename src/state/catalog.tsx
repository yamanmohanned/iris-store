import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SEED_CATALOG, setCatalog } from '@/data/catalog';
import type { CatalogData } from '@/data/types';
import { api } from '@/lib/api';
import { readJSON, writeJSON } from './storage';

const CACHE_KEY = 'iris.catalog.cache.v1';
/** أقصى انتظار للخادم قبل العرض بالنسخة المحفوظة/الأولية */
const LOAD_TIMEOUT = 8000;

type Source = 'server' | 'cache' | 'seed';

interface CatalogContextValue {
  /** true حتى يصل أول رد من الخادم أو تنتهي مهلة الانتظار */
  loading: boolean;
  /** مصدر الكتالوج المعروض حالياً */
  source: Source;
  /** هل الخادم متاح (يمكن الحفظ من لوحة الإدارة)؟ */
  online: boolean;
  reload: () => Promise<void>;
  /** حفظ الكتالوج كاملاً على الخادم (لوحة الإدارة فقط). يعيد النسخة التي اعتمدها الخادم. */
  save: (data: CatalogData) => Promise<CatalogData>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function isCatalog(v: unknown): v is CatalogData {
  const c = v as CatalogData | null;
  return !!c && Array.isArray(c.categories) && Array.isArray(c.products);
}

function apply(data: CatalogData): void {
  setCatalog({ ...data, settings: { ...SEED_CATALOG.settings, ...data.settings } });
}

/**
 * يحمّل الكتالوج من الخادم عند بدء التطبيق.
 *  - إن وُجدت نسخة محفوظة من زيارة سابقة تُعرض فوراً ثم تُحدَّث بصمت.
 *  - وإلا يُعرض مؤشر التحميل حتى يرد الخادم (حتى لا تظهر بيانات حذفها المالك).
 *  - الخادم لم يُهيّأ بعد (لم يحفظ المالك أي شيء) → البيانات الأولية.
 */
export function CatalogProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [source, setSource] = useState<Source>(() => {
    const cached = readJSON<unknown>(CACHE_KEY, null);
    if (isCatalog(cached)) {
      apply(cached);
      return 'cache';
    }
    return 'seed';
  });
  const [loading, setLoading] = useState(source === 'seed');
  const [online, setOnline] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await api<{ catalog: CatalogData | null }>('catalog');
      setOnline(true);
      if (isCatalog(res.catalog)) {
        apply(res.catalog);
        writeJSON(CACHE_KEY, res.catalog);
        setSource('server');
      } else {
        // لم يحفظ المالك كتالوجاً بعد — نعرض البيانات الأولية
        apply(SEED_CATALOG);
        setSource('seed');
      }
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), LOAD_TIMEOUT);
    void reload().finally(() => window.clearTimeout(timer));
    return () => window.clearTimeout(timer);
  }, [reload]);

  const save = useCallback(async (data: CatalogData) => {
    const res = await api<{ catalog: CatalogData }>('catalog/save', { method: 'POST', body: { catalog: data } });
    apply(res.catalog);
    writeJSON(CACHE_KEY, res.catalog);
    setSource('server');
    setOnline(true);
    return res.catalog;
  }, []);

  const value = useMemo(() => ({ loading, source, online, reload, save }), [loading, source, online, reload, save]);
  return <CatalogContext.Provider value={value}>{loading ? fallback : children}</CatalogContext.Provider>;
}

export function useCatalogSync(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalogSync must be used inside <CatalogProvider>');
  return ctx;
}
