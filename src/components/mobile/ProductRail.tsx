import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { badgeLabels } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { QuickAddSheet } from './QuickAddSheet';

/** بطاقة منتج مصغّرة للهاتف (شرائط «قد يعجبك» و«الأكثر طلباً» ونتائج البحث). */
export function ProductMiniCard({ product: p, onAdd, className }: { product: Product; onAdd?: () => void; className?: string }) {
  const soldOut = p.stock <= 0;
  const badge = soldOut ? 'نفد مؤقتاً' : p.badge && p.badge !== 'soldout' ? badgeLabels[p.badge] : null;
  return (
    <article className={cn('flex flex-col', className)}>
      <div className="relative">
        <Link to={`/products/${p.slug}`} className="block overflow-hidden rounded-2xl bg-wine-night">
          <img
            src={p.image}
            alt={p.shortName}
            loading="lazy"
            decoding="async"
            className={cn('aspect-[4/5] w-full object-cover', soldOut && 'opacity-60 grayscale-[35%]')}
          />
        </Link>
        {badge && (
          <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-ivory-canvas/90 px-2 py-0.5 font-label-sm text-label-sm font-semibold text-imperial-burgundy backdrop-blur">
            {badge}
          </span>
        )}
        {onAdd && (
          <button
            type="button"
            aria-label={`إضافة ${p.shortName} إلى السلة`}
            disabled={soldOut}
            onClick={onAdd}
            className="absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory-canvas text-imperial-burgundy shadow-[0_4px_12px_rgba(42,3,13,0.25)] transition-transform active:scale-90 disabled:opacity-0"
          >
            <Icon name="add" className="text-[22px]" />
          </button>
        )}
      </div>
      <Link to={`/products/${p.slug}`} className="mt-2 block px-0.5">
        <h3 className="line-clamp-2 font-label-lg text-label-lg font-semibold leading-snug text-deep-oxblood">{p.shortName}</h3>
        <p className="mt-1 font-label-lg text-label-lg font-bold text-imperial-burgundy tabular-nums">
          {formatNumber(p.price)} <span className="font-label-sm text-label-sm font-medium text-muted-rosewood">د.ع</span>
        </p>
      </Link>
    </article>
  );
}

/** شريط أفقي من المنتجات مع إضافة سريعة. */
export function ProductRail({ products, className }: { products: Product[]; className?: string }) {
  const [quick, setQuick] = useState<Product | null>(null);
  if (products.length === 0) return null;
  return (
    <>
      <div className={cn('-mx-gutter-mobile flex snap-x snap-mandatory gap-3 overflow-x-auto px-gutter-mobile pb-1 [scrollbar-width:none]', className)}>
        {products.map((p) => (
          <ProductMiniCard key={p.id} product={p} onAdd={() => setQuick(p)} className="w-[44%] max-w-[190px] shrink-0 snap-start" />
        ))}
      </div>
      <QuickAddSheet product={quick} onClose={() => setQuick(null)} />
    </>
  );
}
