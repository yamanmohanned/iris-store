import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { QuickAddSheet } from '@/components/mobile/QuickAddSheet';
import { badgeLabels, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber, piecesCount } from '@/lib/format';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { useWishlist } from '@/state/wishlist';

const SPECIAL: Record<string, { name: string; description: string }> = {
  offers: { name: 'العروض', description: 'قطع مختارة بأسعار خاصة لفترة محدودة.' },
  all: { name: 'كل المنتجات', description: 'كل قطع آيريس ستور.' },
};

/**
 * صفحة القسم على الهاتف (`/collections/:slug`) — على نمط المنيو المرجعي:
 * غلاف القسم باسمه وزر رجوع، شريط للتنقل بين الأقسام، ثم منتجات القسم كبطاقات كبيرة
 * (صورة، اسم، سعر، وصف، وزر «+» للإضافة السريعة). المنتجات وترتيبها يحددها المالك.
 */
export default function MobileCategory() {
  const { slug = '' } = useParams();
  const { visibleCategories, visibleProducts } = useCatalog();
  const [quick, setQuick] = useState<Product | null>(null);
  const navigate = useNavigate();

  const special = SPECIAL[slug];
  const category = visibleCategories.find((c) => c.slug === slug);
  if (!special && !category) return <NotFoundPage />;

  const items = special
    ? slug === 'offers'
      ? visibleProducts.filter((p) => p.oldPrice && p.oldPrice > p.price)
      : visibleProducts
    : visibleProducts.filter((p) => p.category === slug);
  const name = category?.name ?? special.name;
  const description = category?.description ?? special.description;
  const cover = category?.image || items[0]?.image;

  return (
    <div className="flex min-h-screen flex-col text-warm-ink">
      <MobileTopBar overlay back="/" title={name} threshold={220} />

      <section className="relative h-[270px] w-full overflow-hidden bg-wine-night">
        {cover && <img src={cover} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-b from-wine-night/50 via-wine-night/30 to-wine-night/95" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-8 text-center">
          <h1 className="font-display-lg-mobile text-display-lg-mobile font-bold leading-tight text-ivory-canvas drop-shadow-[0_2px_10px_rgba(42,3,13,0.6)]">
            {name}
          </h1>
          <span className="mt-1 font-label-md text-label-md text-champagne-gold">
            {items.length ? piecesCount(items.length) : 'لا توجد قطع بعد'}
          </span>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="mt-3.5 inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-ivory-canvas/95 px-4 font-label-md text-label-md font-semibold text-deep-oxblood shadow-md active:scale-95"
          >
            <Icon name="arrow_forward" className="text-[16px]" />
            كل الأقسام
          </button>
        </div>
      </section>

      <CategoryRail current={slug} />

      <main className="flex-1 px-gutter-mobile pb-32 pt-4">
        {description && <p className="mb-5 text-center font-body-sm text-body-sm leading-relaxed text-muted-rosewood">{description}</p>}

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface-container-lowest px-6 py-12 text-center shadow-luxury">
            <Icon name="diamond" className="text-[36px] text-rose-mist" />
            <p className="font-headline-sm text-headline-sm text-warm-ink">لا توجد قطع في هذا القسم حالياً</p>
            <Link
              to="/"
              className="font-label-lg text-label-lg text-imperial-burgundy underline decoration-royal-gold/60 underline-offset-4"
            >
              تصفّح بقية الأقسام
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {items.map((p, i) => (
              <ProductTile key={p.id} product={p} eager={i < 2} onAdd={() => setQuick(p)} />
            ))}
          </div>
        )}
      </main>

      <QuickAddSheet product={quick} onClose={() => setQuick(null)} />
      <MobileTabBar active="categories" />
    </div>
  );
}

/** شريط أفقي للتنقل بين الأقسام، يلتصق أسفل الشريط العلوي. */
function CategoryRail({ current }: { current: string }) {
  const { visibleCategories } = useCatalog();
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [current]);

  if (visibleCategories.length < 2) return null;
  return (
    <nav
      aria-label="الأقسام"
      className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 bg-ivory-canvas/95 py-3 shadow-[0_6px_16px_-8px_rgba(42,3,13,0.12)] backdrop-blur-xl"
    >
      <div ref={railRef} className="flex gap-2 overflow-x-auto px-gutter-mobile [scrollbar-width:none]">
        {visibleCategories.map((c) => (
          <Link
            key={c.slug}
            to={`/collections/${c.slug}`}
            replace
            aria-current={c.slug === current ? 'page' : undefined}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-4 py-2 font-label-md text-label-md transition-colors',
              c.slug === current
                ? 'bg-imperial-burgundy text-ivory-canvas shadow-[0_4px_12px_rgba(78,24,37,0.25)]'
                : 'bg-blush-surface text-warm-ink',
            )}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** بطاقة منتج كبيرة: الصورة بالعرض الكامل ولوحة عنابية بالاسم والسعر والوصف وزر الإضافة. */
function ProductTile({ product: p, onAdd, eager }: { product: Product; onAdd: () => void; eager?: boolean }) {
  const wishlist = useWishlist();
  const liked = wishlist.has(p.id);
  const soldOut = p.stock <= 0;
  const pct = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : null;
  const badge = soldOut ? 'نفد مؤقتاً' : pct ? `خصم ${pct}%` : p.badge ? badgeLabels[p.badge] : null;

  return (
    <article className="fade-up-item overflow-hidden rounded-[20px] bg-imperial-burgundy shadow-[0_12px_30px_rgba(42,3,13,0.16)]">
      <div className="relative">
        <Link to={`/products/${p.slug}`} className="block bg-wine-night">
          <img
            src={p.image}
            alt={p.shortName}
            loading={eager ? 'eager' : 'lazy'}
            className={cn('aspect-[4/3] w-full object-cover', soldOut && 'opacity-60 grayscale-[35%]')}
          />
        </Link>
        {badge && (
          <span
            className={cn(
              'absolute right-3 top-3 rounded-full px-3 py-1 font-label-sm text-label-sm font-bold shadow-md',
              soldOut
                ? 'bg-surface-container-high text-muted-rosewood'
                : 'bg-gradient-to-r from-royal-gold via-champagne-gold to-royal-gold text-wine-night',
            )}
          >
            {badge}
          </span>
        )}
        <button
          type="button"
          aria-label={liked ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          aria-pressed={liked}
          onClick={() => wishlist.toggle(p.id)}
          className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-ivory-canvas/90 text-imperial-burgundy shadow-md backdrop-blur"
        >
          <Icon name="favorite" fill={liked} className="text-[20px]" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/products/${p.slug}`} className="min-w-0 flex-1">
            <h2 className="font-headline-sm text-headline-sm font-semibold leading-snug text-ivory-canvas">{p.shortName}</h2>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex flex-col items-end leading-tight">
              <span className="font-label-lg text-label-lg font-bold text-champagne-gold tabular-nums">
                {formatNumber(p.price)} <span className="text-label-sm font-medium">د.ع</span>
              </span>
              {pct && (
                <span className="font-label-sm text-label-sm text-rose-mist/70 line-through tabular-nums">{formatNumber(p.oldPrice!)}</span>
              )}
            </div>
            <button
              type="button"
              aria-label={`إضافة ${p.shortName} إلى السلة`}
              disabled={soldOut}
              onClick={onAdd}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-champagne-gold text-wine-night shadow-[0_4px_12px_rgba(201,162,75,0.35)] transition-transform active:scale-90 disabled:bg-rose-mist/30 disabled:text-rose-mist/60 disabled:shadow-none"
            >
              <Icon name="add" className="text-[22px] font-bold" />
            </button>
          </div>
        </div>
        {(p.summary || p.metal) && (
          <p className="mt-1.5 font-body-sm text-body-sm leading-relaxed text-rose-mist/85">
            {[p.metal, p.summary].filter(Boolean).join(' — ')}
          </p>
        )}
      </div>
    </article>
  );
}
