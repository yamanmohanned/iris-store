import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MobileSectionTitle } from '@/components/mobile/MobilePage';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import { ProductRail } from '@/components/mobile/ProductRail';
import { QuickAddSheet } from '@/components/mobile/QuickAddSheet';
import { featuredPicks, searchProducts, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { formatNumber } from '@/lib/format';

/** البحث على الهاتف (`/search?q=`) — بحث فعلي في كتالوج المالك بالاسم أو رقم القطعة أو الخامة. */
export default function MobileSearch() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [quick, setQuick] = useState<Product | null>(null);
  const catalog = useCatalog();
  const results = useMemo(() => searchProducts(query), [query, catalog]); // eslint-disable-line react-hooks/exhaustive-deps
  const picks = featuredPicks(catalog.visibleProducts);

  const update = (q: string) => {
    setQuery(q);
    setParams(q ? { q } : {}, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-ivory-canvas">
      <header className="pt-safe fixed inset-x-0 top-0 z-50 bg-ivory-canvas/95 shadow-[0_4px_20px_rgba(42,3,13,0.06)] backdrop-blur-xl">
        <div className="flex h-16 items-center gap-2 px-3">
          <Link to="/" aria-label="رجوع" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-warm-ink">
            <Icon name="arrow_forward" className="text-[22px]" />
          </Link>
          <div className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-surface-container-lowest px-3 shadow-[0_0_0_1px_rgba(78,24,37,0.1)]">
            <Icon name="search" className="text-[20px] text-antique-gold" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => update(e.target.value)}
              placeholder="ابحثي بالاسم أو رقم القطعة…"
              aria-label="بحث في المتجر"
              className="w-full bg-transparent font-body-md text-body-md text-warm-ink outline-none placeholder:text-muted-rosewood/60"
            />
            {query && (
              <button type="button" aria-label="مسح" onClick={() => update('')} className="text-muted-rosewood">
                <Icon name="close" className="text-[18px]" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 px-gutter-mobile pb-32 pt-[calc(5rem+env(safe-area-inset-top,0px))]">
        {!query.trim() ? (
          <>
            <MobileSectionTitle>الأقسام</MobileSectionTitle>
            <div className="flex flex-wrap gap-2">
              {catalog.visibleCategories.map((c) => (
                <Link
                  key={c.slug}
                  to={`/collections/${c.slug}`}
                  className="flex h-10 items-center rounded-full bg-blush-surface px-4 font-label-md text-label-md text-warm-ink active:bg-rose-mist"
                >
                  {c.name}
                </Link>
              ))}
            </div>
            {picks.length > 0 && (
              <section className="mt-7">
                <MobileSectionTitle>مختارات الدار</MobileSectionTitle>
                <ProductRail products={picks} />
              </section>
            )}
          </>
        ) : results.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <Icon name="search_off" className="text-[40px] text-rose-mist" />
            <p className="font-headline-sm text-headline-sm text-warm-ink">لا توجد قطع مطابقة لـ «{query}»</p>
            <p className="font-body-sm text-body-sm text-muted-rosewood">جرّبي اسماً أقصر أو رقم القطعة.</p>
          </div>
        ) : (
          <>
            <p className="mb-3 font-label-md text-label-md text-muted-rosewood">{results.length} نتيجة</p>
            <ul className="flex flex-col gap-3">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-surface-container-lowest p-2.5 shadow-luxury">
                  <Link to={`/products/${p.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <img src={p.image} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{p.shortName}</span>
                      <span className="block truncate font-label-sm text-label-sm text-muted-rosewood">{p.metal}</span>
                      <span className="block font-label-md text-label-md font-bold text-imperial-burgundy tabular-nums">
                        {formatNumber(p.price)} د.ع
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    aria-label={`إضافة ${p.shortName} إلى السلة`}
                    disabled={p.stock <= 0}
                    onClick={() => setQuick(p)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-imperial-burgundy text-champagne-gold disabled:opacity-30"
                  >
                    <Icon name="add" className="text-[22px]" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <QuickAddSheet product={quick} onClose={() => setQuick(null)} />
      <MobileTabBar />
    </div>
  );
}
