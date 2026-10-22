import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import type { Product } from '@/data/types';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { defaultSizeFor, metalOptionsFor, swatchStyle } from '@/pages/store/product/productOptions';
import { MAX_QTY, useCart } from '@/state/cart';
import { useToast } from '@/state/toast';

/**
 * نافذة الإضافة السريعة من أسفل الشاشة (زر «+» في بطاقة المنتج) — مثل نافذة الخيارات في المنيو المرجعي:
 * صورة، وصف، اختيار المعدن والمقاس، الكمية، ثم «أضف إلى السلة (السعر)».
 */
export function QuickAddSheet({ product: p, onClose }: { product: Product | null; onClose: () => void }) {
  if (!p) return null;
  return createPortal(<Sheet key={p.id} product={p} onClose={onClose} />, document.querySelector('[data-scroll-root]') ?? document.body);
}

function Sheet({ product: p, onClose }: { product: Product; onClose: () => void }) {
  const cart = useCart();
  const toast = useToast();
  const metals = useMemo(() => metalOptionsFor(p), [p]);
  const [metal, setMetal] = useState(metals[0]?.label ?? p.metal);
  const [size, setSize] = useState(defaultSizeFor(p));
  const [qty, setQty] = useState(1);
  const maxQty = Math.max(1, Math.min(MAX_QTY, p.stock));
  const soldOut = p.stock <= 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const add = () => {
    if (soldOut) return;
    if (p.sizes?.length && !size) {
      toast.show('اختاري المقاس أولاً', 'error');
      return;
    }
    cart.add(p.id, qty, { metal, size });
    toast.show(`أُضيفت «${p.shortName}» إلى السلة`, 'shopping_bag');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={p.shortName}>
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-wine-night/60 backdrop-blur-[2px]" />
      <div className="pb-safe relative max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[28px] bg-ivory-canvas shadow-[0_-12px_40px_rgba(42,3,13,0.3)]">
        <div className="sticky top-0 z-10 flex justify-center bg-ivory-canvas/95 pb-2 pt-3 backdrop-blur">
          <span className="h-1.5 w-12 rounded-full bg-rose-mist" />
        </div>
        <button
          type="button"
          aria-label="إغلاق"
          onClick={onClose}
          className="absolute left-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-lowest text-warm-ink shadow-sm"
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        <div className="px-gutter-mobile pb-5">
          <div className="overflow-hidden rounded-[20px] bg-wine-night shadow-luxury">
            <img src={p.image} alt={p.shortName} className="aspect-[4/3] w-full object-cover" />
          </div>
          <h2 className="mt-4 font-headline-md text-headline-md font-bold text-deep-oxblood">{p.shortName}</h2>
          {p.summary && <p className="mt-1 font-body-sm text-body-sm leading-relaxed text-muted-rosewood">{p.summary}</p>}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">
              {formatNumber(p.price)} د.ع
            </span>
            {p.oldPrice && p.oldPrice > p.price && (
              <span className="font-body-sm text-body-sm text-muted-rosewood line-through tabular-nums">{formatNumber(p.oldPrice)}</span>
            )}
          </div>

          {metals.length > 1 && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-label-lg text-label-lg text-warm-ink">المعدن</legend>
              <div className="flex flex-col gap-2">
                {metals.map((m) => (
                  <label
                    key={m.key}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 shadow-[0_0_0_1px_rgba(78,24,37,0.12)] transition-colors',
                      metal === m.label ? 'bg-blush-surface shadow-[0_0_0_1.5px_#4E1825]' : 'bg-surface-container-lowest',
                    )}
                  >
                    <input type="radio" name="metal" className="sr-only" checked={metal === m.label} onChange={() => setMetal(m.label)} />
                    <span className={cn('h-5 w-5 rounded-full bg-gradient-to-br ring-1 ring-black/10', m.gradient)} style={swatchStyle(m)} />
                    <span className="flex-1 font-body-sm text-body-sm text-warm-ink">{m.label}</span>
                    {metal === m.label && <Icon name="check_circle" fill className="text-[20px] text-imperial-burgundy" />}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {!!p.sizes?.length && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-label-lg text-label-lg text-warm-ink">المقاس</legend>
              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    disabled={s.soldOut}
                    onClick={() => setSize(s.label)}
                    className={cn(
                      'min-w-[64px] rounded-xl px-4 py-2.5 font-label-md text-label-md transition-colors',
                      s.soldOut && 'cursor-not-allowed text-muted-rosewood/50 line-through',
                      size === s.label
                        ? 'bg-imperial-burgundy text-ivory-canvas'
                        : 'bg-surface-container-lowest text-warm-ink shadow-[0_0_0_1px_rgba(78,24,37,0.12)]',
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="mt-5 flex items-center justify-between">
            <span className="font-label-lg text-label-lg text-warm-ink">الكمية</span>
            <div className="flex items-center gap-1 rounded-xl bg-surface-container-lowest p-1 shadow-[0_0_0_1px_rgba(78,24,37,0.12)]">
              <button
                type="button"
                aria-label="زيادة"
                disabled={qty >= maxQty}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-imperial-burgundy disabled:opacity-30"
              >
                <Icon name="add" className="text-[20px]" />
              </button>
              <span className="w-8 text-center font-label-lg text-label-lg tabular-nums">{qty}</span>
              <button
                type="button"
                aria-label="إنقاص"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-imperial-burgundy disabled:opacity-30"
              >
                <Icon name="remove" className="text-[20px]" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={add}
            disabled={soldOut}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-imperial-burgundy py-3.5 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_8px_20px_rgba(78,24,37,0.3)] transition-colors hover:bg-burgundy-600 active:translate-y-px disabled:bg-surface-container-high disabled:text-muted-rosewood disabled:shadow-none"
          >
            <Icon name="shopping_bag" className="text-[20px] text-champagne-gold" />
            {soldOut ? 'نفدت الكمية حالياً' : `أضف إلى السلة (${formatNumber(p.price * qty)} د.ع)`}
          </button>
          <Link
            to={`/products/${p.slug}`}
            onClick={onClose}
            className="mt-3 block text-center font-label-md text-label-md text-imperial-burgundy underline decoration-royal-gold/60 underline-offset-4"
          >
            عرض تفاصيل القطعة كاملة
          </Link>
        </div>
      </div>
    </div>
  );
}
