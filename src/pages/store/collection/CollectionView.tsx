import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { ProductCard } from '@/components/store/ProductCard';
import { familyLabels, familyOf, type Family } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { useContactLinks } from '@/lib/contact';
import { formatNumber, productCount } from '@/lib/format';

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popular';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'الأحدث',
  'price-asc': 'السعر: من الأقل',
  'price-desc': 'السعر: من الأعلى',
  popular: 'الأكثر طلباً',
};

const METALS = [
  { key: 'steel', label: 'ستانلس ستيل', test: /ستانلس|ستيل/ },
  { key: 'plated', label: 'بطلاء ثابت', test: /طلاء/ },
] as const;

const COLORS = [
  { key: 'gold', label: 'ذهبي', hex: '#C9A24B' },
  { key: 'silver', label: 'فضي', hex: '#BFC3C7' },
  { key: 'white', label: 'أبيض', hex: '#D8D8D8' },
  { key: 'rose', label: 'وردي', hex: '#E5A89E' },
  { key: 'black', label: 'أسود', hex: '#2A030D' },
] as const;

const LENGTHS = ['40 سم', '45 سم', '50 سم', '55 سم'] as const;
const PAGE_SIZE = 12;

interface CollectionViewProps {
  title: string;
  description: string;
  items: Product[];
  breadcrumb: string;
  /** يظهر بطاقة الإهداء الترويجية داخل الشبكة */
  promo?: boolean;
  emptyHint?: string;
}

/** صفحة القسم (PLP): ترويسة + فلاتر جانبية + شبكة منتجات بفرز وتحميل المزيد. */
export function CollectionView({ title, description, items, breadcrumb, promo = true, emptyHint }: CollectionViewProps) {
  const contact = useContactLinks();
  const prices = useMemo(() => items.map((i) => i.price), [items]);
  const lo = prices.length ? Math.min(...prices) : 0;
  const hi = prices.length ? Math.max(...prices) : 0;

  const [family, setFamily] = useState<Family | 'all'>('all');
  const [metals, setMetals] = useState<string[]>([]);
  const [color, setColor] = useState<string | null>(null);
  const [length, setLength] = useState<string | null>(null);
  const [inStock, setInStock] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const familyCounts = useMemo(() => {
    const m = new Map<Family, number>();
    items.forEach((i) => m.set(familyOf(i), (m.get(familyOf(i)) ?? 0) + 1));
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const min = minPrice ?? lo;
    const max = maxPrice ?? hi;
    let out = items.filter((p) => {
      if (family !== 'all' && familyOf(p) !== family) return false;
      if (metals.length && !metals.some((k) => METALS.find((m) => m.key === k)?.test.test(p.metal))) return false;
      if (color && !(p.swatches ?? []).includes(color as never)) return false;
      if (length && !(p.sizes ?? []).some((s) => s.label === length && !s.soldOut)) return false;
      if (inStock && p.stock <= 0) return false;
      if (offersOnly && !(p.oldPrice && p.oldPrice > p.price)) return false;
      return p.price >= min && p.price <= max;
    });
    if (sort === 'price-asc') out = [...out].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') out = [...out].sort((a, b) => b.price - a.price);
    else if (sort === 'popular') out = [...out].sort((a, b) => Number(b.badge === 'bestseller') - Number(a.badge === 'bestseller') || a.stock - b.stock);
    return out;
  }, [items, family, metals, color, length, inStock, offersOnly, minPrice, maxPrice, lo, hi, sort]);

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (family !== 'all') activeChips.push({ label: familyLabels[family], clear: () => setFamily('all') });
  metals.forEach((k) => activeChips.push({ label: METALS.find((m) => m.key === k)!.label, clear: () => setMetals((m) => m.filter((x) => x !== k)) }));
  if (color) activeChips.push({ label: COLORS.find((c) => c.key === color)?.label ?? color, clear: () => setColor(null) });
  if (length) activeChips.push({ label: length, clear: () => setLength(null) });
  if (inStock) activeChips.push({ label: 'المتوفر فقط', clear: () => setInStock(false) });
  if (offersOnly) activeChips.push({ label: 'العروض', clear: () => setOffersOnly(false) });
  if (minPrice != null || maxPrice != null) {
    activeChips.push({ label: `${formatNumber(minPrice ?? lo)} – ${formatNumber(maxPrice ?? hi)} د.ع`, clear: () => (setMinPrice(null), setMaxPrice(null)) });
  }

  const reset = () => {
    setFamily('all');
    setMetals([]);
    setColor(null);
    setLength(null);
    setInStock(false);
    setOffersOnly(false);
    setMinPrice(null);
    setMaxPrice(null);
  };

  const shown = filtered.slice(0, visible);
  const span = Math.max(1, hi - lo);
  const fromPct = (((minPrice ?? lo) - lo) / span) * 100;
  const toPct = (((maxPrice ?? hi) - lo) / span) * 100;

  return (
    <main className="min-h-screen w-full">
      <div className="flex w-full flex-col text-warm-ink">
        <section className="relative w-full overflow-hidden bg-parchment px-6 py-10 shadow-sm sm:px-10 lg:px-14">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <defs>
              <pattern height="60" id="lattice-pattern" patternUnits="userSpaceOnUse" width="60">
                <path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#4e1825" strokeWidth="1" />
                <circle cx="30" cy="30" fill="#C9A24B" r="3" />
                <path d="M0 0 L15 15 M60 0 L45 15 M60 60 L45 45 M0 60 L15 45" stroke="#4e1825" strokeWidth="0.7" />
              </pattern>
            </defs>
            <rect fill="url(#lattice-pattern)" height="100%" width="100%" />
          </svg>
          <div className="relative z-10 mx-auto max-w-[1400px]">
            <nav aria-label="مسار التصفح" className="mb-4 flex items-center gap-2 font-label-md text-label-md text-muted-rosewood">
              <Link to="/" className="transition-colors hover:text-imperial-burgundy">
                الرئيسية
              </Link>
              <span className="font-serif-brand text-sm text-royal-gold/60">›</span>
              <span className="font-medium text-imperial-burgundy">{breadcrumb}</span>
            </nav>
            <div className="mb-4 flex flex-wrap items-baseline gap-4">
              <h1 className="font-display-lg text-display-lg font-bold tracking-tight text-deep-oxblood">{title}</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-mist/60 px-3 py-1 font-label-sm text-label-sm font-semibold text-imperial-burgundy shadow-inner">
                <span className="h-1.5 w-1.5 rounded-full bg-royal-gold" />
                {productCount(items.length)}
              </span>
            </div>
            <div className="relative my-5 flex w-full items-center justify-center">
              <div className="flex w-full flex-col gap-[3px]">
                <div className="h-px w-full bg-gradient-to-l from-transparent via-royal-gold/50 to-transparent" />
                <div className="h-px w-full bg-gradient-to-l from-transparent via-royal-gold/50 to-transparent" />
              </div>
              <div className="absolute flex items-center justify-center bg-parchment px-3 text-royal-gold">
                <span className="text-xs tracking-widest">◆</span>
              </div>
            </div>
            <p className="max-w-3xl font-body-lg text-body-lg leading-relaxed text-muted-rosewood">{description}</p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[1400px] px-6 py-10 sm:px-10 lg:px-14 lg:py-12">
          <div className="flex flex-col items-start gap-8 lg:flex-row xl:gap-10">
            <aside className="relative w-full shrink-0 overflow-hidden rounded-xl bg-surface-container-lowest p-6 shadow-[0_8px_30px_rgba(42,3,13,0.06)] lg:w-[280px]">
              <div className="flex items-center justify-between border-b border-hairline-burgundy pb-4">
                <div className="flex items-center gap-2">
                  <Icon name="tune" className="text-[20px] text-imperial-burgundy" />
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">تصفية المنتجات</h2>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="font-label-sm text-label-sm text-muted-rosewood underline-offset-4 transition-colors hover:text-imperial-burgundy hover:underline"
                >
                  مسح الفلاتر
                </button>
              </div>

              <div className="divide-y divide-hairline-burgundy">
                <div className="py-5">
                  <h3 className="mb-3 flex items-center justify-between font-headline-sm text-headline-sm font-medium text-deep-oxblood">التصنيف</h3>
                  <div className="space-y-2.5 font-body-sm text-body-sm">
                    {([['all', 'الكل', items.length], ...Array.from(familyCounts.entries()).map(([k, n]) => [k, familyLabels[k], n])] as Array<[Family | 'all', string, number]>).map(
                      ([key, label, n]) => {
                        const on = family === key;
                        return (
                          <label key={key} className="group flex cursor-pointer items-center justify-between">
                            <span className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  'flex h-4 w-4 items-center justify-center rounded-full transition-colors',
                                  on ? 'bg-imperial-burgundy shadow-sm' : 'bg-surface-variant group-hover:bg-rose-mist',
                                )}
                              >
                                {on && <span className="h-1.5 w-1.5 rounded-full bg-champagne-gold" />}
                              </span>
                              <input type="radio" name="family" className="sr-only" checked={on} onChange={() => setFamily(key)} />
                              <span className={cn(on ? 'font-semibold text-deep-oxblood' : 'text-on-surface-variant group-hover:text-imperial-burgundy')}>{label}</span>
                            </span>
                            <span className="font-label-sm text-label-sm text-muted-rosewood tabular-nums">{n}</span>
                          </label>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="py-5">
                  <h3 className="mb-3 font-headline-sm text-headline-sm font-medium text-deep-oxblood">السعر</h3>
                  <div className="relative mb-4 flex h-6 w-full items-center px-1">
                    <div className="relative h-1 w-full rounded-full bg-surface-variant">
                      <div
                        className="absolute h-1 rounded-full bg-gradient-to-l from-royal-gold to-imperial-burgundy"
                        style={{ right: `${fromPct}%`, left: `${100 - toPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-right">
                    {([
                      ['من', minPrice ?? lo, (v: number) => setMinPrice(v)],
                      ['إلى', maxPrice ?? hi, (v: number) => setMaxPrice(v)],
                    ] as const).map(([label, value, set]) => (
                      <div key={label}>
                        <label className="mb-1 block font-label-sm text-label-sm text-muted-rosewood">{label}</label>
                        <div className="flex h-9 items-center justify-between rounded bg-ivory-canvas px-2.5 font-label-sm text-label-sm text-warm-ink shadow-inner">
                          <input
                            type="number"
                            inputMode="numeric"
                            value={value}
                            min={lo}
                            max={hi}
                            step={500}
                            onChange={(e) => set(Number(e.target.value) || 0)}
                            className="w-full border-0 bg-transparent p-0 font-label-sm text-label-sm tabular-nums focus:outline-none focus:ring-0"
                            aria-label={`السعر ${label}`}
                          />
                          <span className="text-[11px] text-muted-rosewood">د.ع</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="py-5">
                  <h3 className="mb-3 font-headline-sm text-headline-sm font-medium text-deep-oxblood">اللون والمعدن</h3>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {COLORS.map((c) => {
                      const on = color === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setColor(on ? null : c.key)}
                          aria-pressed={on}
                          className={cn('flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-transform active:scale-95', on ? 'bg-surface-container-high' : 'hover:bg-surface-container')}
                        >
                          <span className="flex h-6 w-6 items-center justify-center rounded-full shadow-sm" style={{ background: c.hex }}>
                            {on && <Icon name="check" className="text-[13px] font-bold leading-none text-white" />}
                          </span>
                          <span className={cn('font-label-sm text-label-sm', on ? 'font-semibold text-deep-oxblood' : 'text-muted-rosewood')}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="py-5">
                  <h3 className="mb-3 font-headline-sm text-headline-sm font-medium text-deep-oxblood">الخامة</h3>
                  <div className="space-y-2.5 font-body-sm text-body-sm">
                    {METALS.map((m) => {
                      const on = metals.includes(m.key);
                      const n = items.filter((p) => m.test.test(p.metal)).length;
                      return (
                        <label key={m.key} className="group flex cursor-pointer items-center justify-between">
                          <span className="flex items-center gap-2.5">
                            <span className={cn('flex h-4 w-4 items-center justify-center rounded transition-colors', on ? 'bg-imperial-burgundy shadow-sm' : 'bg-surface-variant group-hover:bg-rose-mist')}>
                              {on && <Icon name="check" className="text-[13px] font-bold text-champagne-gold" />}
                            </span>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={on}
                              onChange={() => setMetals((cur) => (on ? cur.filter((x) => x !== m.key) : [...cur, m.key]))}
                            />
                            <span className={cn(on ? 'font-medium text-deep-oxblood' : 'text-on-surface-variant group-hover:text-imperial-burgundy')}>{m.label}</span>
                          </span>
                          <span className="font-label-sm text-label-sm text-muted-rosewood tabular-nums">{n}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="py-5">
                  <h3 className="mb-3 font-headline-sm text-headline-sm font-medium text-deep-oxblood">طول السلسلة</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {LENGTHS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={length === l}
                        onClick={() => setLength(length === l ? null : l)}
                        className={cn(
                          'rounded-full px-2.5 py-1 font-label-sm text-label-sm transition-colors',
                          length === l ? 'bg-imperial-burgundy font-semibold text-ivory-canvas shadow-sm' : 'bg-surface-container text-muted-rosewood hover:bg-rose-mist',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-5">
                  {([
                    ['المتوفر فقط', inStock, setInStock],
                    ['عروض وخصومات حصرية', offersOnly, setOffersOnly],
                  ] as const).map(([label, on, set]) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className={cn('font-label-md text-label-md', on ? 'font-medium text-deep-oxblood' : 'text-muted-rosewood')}>{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={label}
                        onClick={() => set(!on)}
                        className={cn('flex h-5 w-10 items-center rounded-full p-0.5 shadow-inner transition-colors', on ? 'justify-start bg-imperial-burgundy' : 'justify-end bg-surface-variant')}
                      >
                        <span className={cn('h-4 w-4 rounded-full shadow', on ? 'bg-royal-gold' : 'bg-white')} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="min-w-0 w-full flex-1">
              <div className="mb-6 flex flex-col justify-between gap-4 rounded-xl bg-surface-container-lowest p-4 shadow-[0_4px_20px_rgba(42,3,13,0.04)] md:flex-row md:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  {activeChips.length > 0 && <span className="ml-1 font-label-sm text-label-sm text-muted-rosewood">المفعل:</span>}
                  {activeChips.map((c) => (
                    <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full bg-blush-surface px-3 py-1 font-label-sm text-label-sm text-imperial-burgundy shadow-sm">
                      {c.label}
                      <button type="button" aria-label="حذف الفلتر" onClick={c.clear} className="text-sm font-bold leading-none hover:text-deep-oxblood">
                        ×
                      </button>
                    </span>
                  ))}
                  {activeChips.length === 0 && <span className="font-label-sm text-label-sm text-muted-rosewood">كل القطع المتاحة في هذا القسم</span>}
                </div>
                <div className="flex shrink-0 items-center justify-between gap-5 md:justify-end">
                  <span className="font-label-sm text-label-sm text-muted-rosewood">
                    عرض <strong className="font-semibold text-deep-oxblood">{shown.length}</strong> من {filtered.length} قطعة فريدة
                  </span>
                  <div className="relative">
                    <button
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={sortOpen}
                      onClick={() => setSortOpen((o) => !o)}
                      className="flex h-9 items-center gap-2 rounded-lg bg-ivory-canvas px-3.5 font-label-sm text-label-sm text-deep-oxblood shadow-sm transition-colors hover:bg-surface-container"
                    >
                      <span>
                        الترتيب: <strong className="font-semibold">{SORT_LABELS[sort]}</strong>
                      </span>
                      <Icon name="keyboard_arrow_down" className="text-[16px] text-royal-gold" />
                    </button>
                    {sortOpen && (
                      <ul role="listbox" className="absolute left-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-xl border border-hairline-burgundy bg-surface-container-lowest py-1 shadow-[0_12px_32px_rgba(42,3,13,0.14)]">
                        {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                          <li key={k} role="option" aria-selected={sort === k}>
                            <button
                              type="button"
                              onClick={() => {
                                setSort(k);
                                setSortOpen(false);
                              }}
                              className={cn('w-full px-4 py-2 text-right font-label-md text-label-md transition-colors hover:bg-blush-surface', sort === k ? 'font-semibold text-imperial-burgundy' : 'text-warm-ink')}
                            >
                              {SORT_LABELS[k]}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {shown.length === 0 ? (
                <div className="rounded-xl bg-surface-container-lowest p-12 text-center shadow-sm">
                  <Icon name="search_off" className="text-[48px] text-royal-gold/70" />
                  <h3 className="mt-3 font-headline-md text-headline-md text-deep-oxblood">لا توجد قطع مطابقة</h3>
                  <p className="mt-1 font-body-md text-body-md text-muted-rosewood">{emptyHint ?? 'جرّبي تعديل الفلاتر أو مسحها لعرض كل القطع.'}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-5 rounded-xl border border-imperial-burgundy px-5 py-2.5 font-label-lg text-label-lg text-imperial-burgundy transition-colors hover:bg-blush-surface"
                  >
                    مسح كل الفلاتر
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-4">
                  {shown.flatMap((p, i) => {
                    const card = <ProductCard key={p.id} product={p} />;
                    if (promo && i === 4 && shown.length > 6) {
                      return [
                        card,
                        <article
                          key="promo"
                          className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-6 text-champagne-gold shadow-[0_8px_24px_rgba(42,3,13,0.18)] sm:col-span-2"
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#C9A24B_1px,transparent_1px)] opacity-[0.08] [background-size:14px_14px]" />
                          <div className="relative z-10">
                            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-royal-gold">
                              <span className="text-[10px]">◆</span> جديدنا أولاً بأول
                            </span>
                            <h3 className="mt-3 font-display-lg text-headline-xl leading-tight text-ivory-canvas">شاهدي القطع بالفيديو</h3>
                            <p className="mt-3 max-w-xs font-body-sm text-body-sm text-champagne-gold/80">
                              ننشر كل قطعة جديدة بالصور والفيديو على إنستغرام، ويمكنكِ الطلب من هناك برسالة أيضاً.
                            </p>
                          </div>
                          <a
                            href={contact.instagram ?? '/contact'}
                            target={contact.instagram ? '_blank' : undefined}
                            rel="noreferrer"
                            className="relative z-10 mt-6 inline-flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-royal-gold via-champagne-gold to-royal-gold px-5 py-2.5 font-label-md text-label-md font-semibold text-wine-night shadow-md"
                          >
                            {contact.instagramHandle ? `@${contact.instagramHandle}` : 'تواصلي معنا'} <Icon name="arrow_back" className="text-[16px]" />
                          </a>
                        </article>,
                      ];
                    }
                    return [card];
                  })}
                </div>
              )}

              {filtered.length > visible && (
                <div className="mt-12 flex flex-col items-center gap-4">
                  <div className="h-px w-full max-w-md bg-hairline-burgundy" />
                  <span className="font-label-sm text-label-sm text-muted-rosewood">
                    عرض <strong className="text-deep-oxblood">{shown.length}</strong> من أصل {filtered.length} قطعة
                  </span>
                  <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-variant">
                    <div className="stepper-progress-fill h-full" style={{ width: `${(shown.length / filtered.length) * 100}%` }} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="flex items-center gap-2 rounded-xl border border-imperial-burgundy px-8 py-3 font-label-lg text-label-lg text-imperial-burgundy transition-colors hover:bg-blush-surface"
                  >
                    <span>عرض المزيد</span>
                    <Icon name="expand_more" className="text-[18px]" />
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
