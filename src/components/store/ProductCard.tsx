import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { badgeLabels } from '@/data/catalog';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatIQD } from '@/lib/format';
import { useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { useWishlist } from '@/state/wishlist';

const SWATCH_STYLE: Record<NonNullable<Product['swatches']>[number], { color: string; title: string }> = {
  gold: { color: '#C9A24B', title: 'ذهبي' },
  white: { color: '#D8D8D8', title: 'ذهب أبيض' },
  silver: { color: '#D8D8D8', title: 'فضي' },
  rose: { color: '#E5A89E', title: 'وردي' },
  black: { color: '#2A030D', title: 'أسود' },
};

function discountPercent(p: Product): number | null {
  if (!p.oldPrice || p.oldPrice <= p.price) return null;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

function Badge({ product }: { product: Product }) {
  const pct = discountPercent(product);
  const base = 'absolute top-3 right-3 font-label-sm text-label-sm px-2.5 py-0.5 rounded-full shadow-md';
  if (product.badge === 'soldout') {
    return <div className={cn(base, 'bg-surface-container-high font-semibold text-muted-rosewood')}>{badgeLabels.soldout}</div>;
  }
  if (pct && (product.badge === 'sale' || !product.badge)) {
    return <div className={cn(base, 'bg-imperial-burgundy font-bold text-white')}>-{pct}%</div>;
  }
  if (product.badge === 'new') {
    return (
      <div className={cn(base, 'bg-gradient-to-r from-royal-gold via-champagne-gold to-royal-gold font-bold text-wine-night')}>{badgeLabels.new}</div>
    );
  }
  if (product.badge === 'exclusive') {
    return <div className={cn(base, 'bg-deep-oxblood font-semibold text-champagne-gold')}>{badgeLabels.exclusive}</div>;
  }
  if (product.badge === 'limited' || product.badge === 'bestseller') {
    return <div className={cn(base, 'bg-antique-gold font-semibold text-white')}>{badgeLabels[product.badge]}</div>;
  }
  if (product.stock > 0 && product.stock <= 2) {
    return <div className={cn(base, 'bg-antique-gold font-semibold text-white')}>آخر {product.stock === 1 ? 'قطعة' : 'قطعتين'}</div>;
  }
  return null;
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

/** بطاقة منتج المتجر (شبكة الأقسام والبحث والمفضلة). */
export function ProductCard({ product: p, className }: ProductCardProps) {
  const cart = useCart();
  const toast = useToast();
  const wishlist = useWishlist();
  const soldOut = p.stock <= 0;
  const liked = wishlist.has(p.id);
  const href = `/products/${p.slug}`;

  const addToCart = () => {
    cart.add(p.id, 1, { metal: p.metal });
    cart.openDrawer();
  };

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest transition-all duration-300',
        soldOut
          ? 'border border-hairline-burgundy opacity-70 shadow-[0_4px_16px_rgba(42,3,13,0.03)]'
          : 'shadow-[0_8px_24px_rgba(42,3,13,0.06)] hover:-translate-y-1',
        className,
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-blush-surface">
        <Link to={href} className="absolute inset-0" aria-label={p.shortName}>
          <img
            src={p.image}
            alt={p.shortName}
            loading="lazy"
            className={cn('h-full w-full object-cover transition-transform duration-500', !soldOut && 'group-hover:scale-105', soldOut && 'grayscale-[40%]')}
          />
        </Link>
        <Badge product={p} />
        <button
          type="button"
          aria-label={liked ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-pressed={liked}
          onClick={() => {
            const added = wishlist.toggle(p.id);
            toast.show(added ? 'أُضيفت القطعة إلى المفضلة' : 'أُزيلت القطعة من المفضلة', added ? 'favorite' : 'heart_minus');
          }}
          className={cn(
            'absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 shadow-sm backdrop-blur-sm transition-colors hover:text-error',
            liked ? 'text-error' : 'text-deep-oxblood',
          )}
        >
          <Icon name="favorite" fill={liked} className="text-[18px]" />
        </button>
        {!soldOut && (
          <button
            type="button"
            onClick={addToCart}
            className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between bg-imperial-burgundy/95 px-3 py-2.5 font-label-sm text-label-sm text-champagne-gold backdrop-blur-xs transition-transform duration-300 group-hover:translate-y-0 focus-visible:translate-y-0"
          >
            <span>أضف إلى السلة</span>
            <Icon name="arrow_back" className="text-[16px] text-royal-gold" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-3 p-4">
        <div>
          <h3 className="font-headline-sm text-headline-sm font-semibold leading-snug text-deep-oxblood transition-colors group-hover:text-imperial-burgundy">
            <Link to={href}>{p.name.split(' — ').slice(0, 2).join(' — ')}</Link>
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">{p.summary}</p>
        </div>
        <div className="flex items-center justify-between border-t border-hairline-burgundy pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-label-lg text-label-lg font-bold text-imperial-burgundy tabular-nums">{formatIQD(p.price)}</span>
            {p.oldPrice && p.oldPrice > p.price && (
              <span className="font-label-sm text-label-sm text-muted-rosewood line-through tabular-nums">{formatIQD(p.oldPrice)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {p.swatches?.map((s) => (
              <span key={s} className="h-3.5 w-3.5 rounded-full shadow-xs" style={{ background: SWATCH_STYLE[s].color }} title={SWATCH_STYLE[s].title} />
            ))}
          </div>
        </div>
        {soldOut && (
          <button
            type="button"
            onClick={() => toast.show('سنُعلمكِ فور توفر القطعة', 'notifications_active')}
            className="w-full rounded-lg bg-surface-container py-2 font-label-sm text-label-sm text-muted-rosewood transition-colors hover:bg-rose-mist"
          >
            أبلغني عند التوفر
          </button>
        )}
      </div>
    </article>
  );
}
