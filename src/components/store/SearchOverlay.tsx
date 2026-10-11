import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { searchProducts, useCatalog } from '@/data/catalog';
import { cn } from '@/lib/cn';
import { formatIQD } from '@/lib/format';
import { readJSON, writeJSON } from '@/state/storage';
import { useUi } from '@/state/ui';

const RECENT_KEY = 'iris.search.recent.v1';
const SUGGESTIONS = ['قلادة السفير', 'خاتم سوليتير', 'لؤلؤ الباروك', '102'];

/** يبرز الجزء المطابق من النص. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-bold text-imperial-burgundy underline decoration-royal-gold">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** نافذة البحث المنسدلة الشاملة (Search Overlay في التصميم). */
export function SearchOverlay() {
  const { searchOpen, closeSearch } = useUi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(() => readJSON<string[]>(RECENT_KEY, []));

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        window.clearTimeout(t);
        document.body.style.overflow = prev;
      };
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeSearch();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [searchOpen, closeSearch]);

  useEffect(() => closeSearch(), [pathname, closeSearch]);

  const catalog = useCatalog();
  const products = catalog.visibleProducts;
  const results = useMemo(() => searchProducts(query).slice(0, 4), [query, catalog]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = useMemo(() => searchProducts(query).length, [query, catalog]); // eslint-disable-line react-hooks/exhaustive-deps
  const categoryCounts = useMemo(
    () =>
      catalog.visibleCategories
        .map((c) => ({
          ...c,
          matches: (query.trim() ? searchProducts(query) : products).filter((p) => p.category === c.slug).length,
        }))
        .filter((c) => c.matches > 0),
    [query, catalog, products],
  );

  const remember = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 5);
    setRecent(next);
    writeJSON(RECENT_KEY, next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    remember(query);
    closeSearch();
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  if (!searchOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="البحث" className="fixed inset-0 top-[66px] z-40">
      <div onClick={closeSearch} className="absolute inset-0 bg-wine-night/60 backdrop-blur-sm" />
      <div className="relative w-full overflow-hidden rounded-b-[24px] bg-ivory-canvas shadow-[0_28px_64px_rgba(42,3,13,0.22)]">
        <div className="h-0.5 w-full bg-gradient-to-r from-royal-gold/10 via-royal-gold to-royal-gold/10" />
        <div className="mx-auto max-h-[calc(100vh-110px)] max-w-[1240px] overflow-y-auto px-6 pb-7 pt-8 lg:px-10">
          <form onSubmit={submit} className="mb-8 w-full">
            <div className="relative flex items-center rounded-xl bg-blush-surface/70 px-4 py-3.5 shadow-[inset_0_1px_3px_rgba(42,3,13,0.06)]">
              <div className="flex items-center justify-center pl-3 text-royal-gold">
                <Icon name="search" className="text-[26px]" />
              </div>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث بالاسم أو رقم القطعة (مثال: قلادة السفير أو 102)..."
                aria-label="ابحث في المتجر"
                className="flex-1 border-0 bg-transparent font-body-xl text-body-xl font-semibold tracking-wide text-warm-ink placeholder:font-body-md placeholder:text-body-md placeholder:font-normal placeholder:text-muted-rosewood/60 focus:outline-none focus:ring-0"
              />
              <div className="flex items-center gap-3 pr-2">
                {query && (
                  <button
                    type="button"
                    aria-label="مسح"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted-rosewood transition-colors hover:bg-rose-mist/60 hover:text-warm-ink"
                  >
                    <Icon name="close" className="text-[20px]" />
                  </button>
                )}
                <div className="h-4 w-px bg-outline-variant/60" />
                <button type="button" onClick={closeSearch} className="rounded bg-ivory-canvas px-2 py-0.5 font-label-sm text-[11px] text-muted-rosewood shadow-sm">
                  Esc
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 pt-2 font-body-sm text-body-sm text-muted-rosewood">
              <div className="flex items-center gap-1.5 text-antique-gold">
                <span className="text-[10px] leading-none">◆</span>
                <span className="font-label-sm text-label-sm text-muted-rosewood">
                  الرقم الظاهر على القطعة يساعدك في الوصول المباشر إلى تفاصيلها الفنية وشهادة الاعتماد.
                </span>
              </div>
              <div className="hidden items-center gap-2 font-label-sm text-label-sm text-muted-rosewood/80 sm:flex">
                <span>بحث دقيق بواسطة كود الأرشيف</span>
                <span className="font-mono font-medium text-antique-gold">SKU Index</span>
              </div>
            </div>
          </form>

          <div className="relative my-6 flex w-full items-center justify-center">
            <div className="flex w-full flex-col gap-[3px]">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-royal-gold/40 to-transparent" />
              <div className="h-px w-full bg-gradient-to-r from-transparent via-royal-gold/40 to-transparent" />
            </div>
            <span className="absolute select-none bg-ivory-canvas px-3 text-[11px] leading-none text-royal-gold">◆</span>
          </div>

          <div className="grid grid-cols-12 items-start gap-8">
            <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">
                    {query.trim() ? 'المنتجات المطابقة' : 'مقترحات لكِ'}
                  </h3>
                  {query.trim() && (
                    <span className="rounded-full bg-parchment px-2 py-0.5 font-label-sm text-label-sm font-bold text-antique-gold">({total})</span>
                  )}
                </div>
                <span className="font-label-sm text-label-sm text-muted-rosewood">مرتبة بحسب الصلة المباشرة</span>
              </div>

              {query.trim() && results.length === 0 ? (
                <div className="rounded-xl bg-surface-container-lowest p-8 text-center shadow-sm">
                  <Icon name="search_off" className="text-[40px] text-royal-gold/70" />
                  <p className="mt-2 font-headline-sm text-headline-sm text-warm-ink">لا توجد قطع مطابقة لـ «{query}»</p>
                  <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">جرّبي رقم القطعة أو اسماً أقصر.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(query.trim() ? results : products.filter((p) => p.badge === 'new' || p.badge === 'bestseller').slice(0, 4)).map((p) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.slug}`}
                      onClick={() => remember(query || p.shortName)}
                      className="group relative flex items-center justify-between rounded-xl bg-surface-container-lowest p-3.5 shadow-sm transition-all duration-200 hover:bg-parchment/60"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-rose-mist/30 shadow-sm">
                          <img src={p.image} alt={p.shortName} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-wine-night/20 to-transparent" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blush-surface px-2 py-0.5 font-mono text-xs font-medium text-muted-rosewood">{p.sku}</span>
                            {p.badge && p.badge !== 'soldout' && (
                              <span className="rounded-full bg-champagne-gold/20 px-2 py-0.5 font-label-sm text-label-sm text-antique-gold">قطعة مميزة</span>
                            )}
                          </div>
                          <h4 className="font-headline-sm text-[1.125rem] leading-snug text-warm-ink">
                            <Highlight text={p.name} query={query} />
                          </h4>
                          <p className="line-clamp-1 font-body-sm text-body-sm text-muted-rosewood">{p.summary}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 pl-2">
                        <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-imperial-burgundy">{formatIQD(p.price)}</span>
                        <div className="inline-flex items-center gap-1 font-label-sm text-label-sm font-semibold text-antique-gold transition-colors group-hover:text-imperial-burgundy">
                          <span>عرض القطعة</span>
                          <Icon name="arrow_forward" className="rotate-180 text-[16px]" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {query.trim() && total > results.length && (
                <button
                  type="button"
                  onClick={submit}
                  className="self-start font-label-md text-label-md font-semibold text-imperial-burgundy underline-offset-4 hover:underline"
                >
                  عرض كل النتائج ({total})
                </button>
              )}
            </div>

            <div className="col-span-12 flex flex-col gap-6 rounded-xl bg-parchment/45 p-5 shadow-sm lg:col-span-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="category" className="text-[18px] text-antique-gold" />
                  <h4 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">التصنيفات المقترحة</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryCounts.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/collections/${c.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blush-surface px-3 py-1.5 font-label-md text-label-md text-warm-ink shadow-sm transition-colors hover:bg-rose-mist/70"
                    >
                      <span>{c.name}</span>
                      <span className="font-mono text-xs text-muted-rosewood">({c.matches})</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="h-px w-full bg-rose-mist/80" />
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon name="history" className="text-[18px] text-antique-gold" />
                    <h4 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">عمليات البحث الأخيرة</h4>
                  </div>
                  {recent.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecent([]);
                        writeJSON(RECENT_KEY, []);
                      }}
                      className="font-label-sm text-label-sm text-muted-rosewood transition-colors hover:text-imperial-burgundy"
                    >
                      مسح
                    </button>
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {(recent.length ? recent : SUGGESTIONS).map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => setQuery(term)}
                        className={cn(
                          'group flex w-full items-center justify-between rounded px-2 py-1.5 text-muted-rosewood transition-colors hover:bg-blush-surface/80 hover:text-warm-ink',
                        )}
                      >
                        <span className="font-body-md text-body-md transition-colors group-hover:text-imperial-burgundy">{term}</span>
                        <Icon name="arrow_forward" className="rotate-180 text-[16px] text-antique-gold/60 group-hover:text-antique-gold" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
