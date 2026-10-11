import { useEffect } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { formatIQD } from '@/lib/format';
import { useCart } from '@/state/cart';

/** درج «حقيبة المقتنيات» المنزلق (إطار C في التصميم). */
export function MiniCartDrawer() {
  const { items, count, subtotal, shipping, total, discount, coupon, freeShippingRemaining, remove, setQty, drawerOpen, closeDrawer } = useCart();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeDrawer();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="حقيبة المقتنيات"
      aria-hidden={!drawerOpen}
      className={cn('fixed inset-0 z-[1000]', drawerOpen ? 'pointer-events-auto' : 'pointer-events-none')}
    >
      <div
        onClick={closeDrawer}
        className={cn(
          'absolute inset-0 bg-[#2A030D]/55 backdrop-blur-sm transition-opacity duration-[400ms] ease-out',
          drawerOpen ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        className={cn(
          'pointer-events-auto absolute bottom-0 left-0 top-0 flex w-full max-w-[420px] flex-col border-r border-royal-gold/30 bg-ivory-canvas shadow-[-20px_0_50px_rgba(42,3,13,0.25)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[80px] items-center justify-between border-b border-royal-gold/30 bg-parchment/60 px-6">
          <div className="flex items-center gap-2.5">
            <Icon name="shopping_bag" className="text-[22px] text-imperial-burgundy" />
            <h3 className="font-headline-sm text-headline-sm font-bold text-warm-ink">حقيبة المقتنيات</h3>
            <span className="rounded-full bg-champagne-gold/30 px-2 py-0.5 text-xs font-bold text-antique-gold">{count}</span>
          </div>
          <button
            type="button"
            aria-label="إغلاق حقيبة التسوق"
            onClick={closeDrawer}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-warm-ink transition-colors hover:bg-blush-surface hover:text-imperial-burgundy"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-royal-gold/20 bg-champagne-gold/25 px-6 py-2.5 font-label-sm text-label-sm text-antique-gold">
          <span className="flex items-center gap-1.5">
            <Icon name="local_shipping" className="text-[16px] text-royal-gold" />
            {freeShippingRemaining === 0 && items.length > 0 ? 'التوصيل مجاني لهذا الطلب' : 'التوصيل المجاني'}
          </span>
          <span className="font-semibold text-imperial-burgundy">
            {freeShippingRemaining === 0 && items.length > 0 ? '100% مجاناً' : `أضف ${formatIQD(freeShippingRemaining)}`}
          </span>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-rosewood">
              <Icon name="shopping_bag" className="text-[48px] text-royal-gold/60" />
              <p className="font-headline-sm text-headline-sm text-warm-ink">حقيبتك فارغة</p>
              <p className="font-body-sm text-body-sm">اكتشفي القطع المنتقاة بعناية وأضيفي ما يعجبك.</p>
              <Link
                to="/collections/necklaces"
                onClick={closeDrawer}
                className="mt-2 rounded-xl border border-imperial-burgundy px-5 py-2.5 font-label-lg text-label-lg text-imperial-burgundy transition-colors hover:bg-blush-surface"
              >
                تصفّحي المجموعات
              </Link>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.key}
                className="flex gap-4 rounded-xl border border-royal-gold/20 bg-surface-container/70 p-3.5 transition-all duration-300 hover:border-royal-gold/50"
              >
                <img
                  src={item.product.image}
                  alt={item.product.shortName}
                  className="h-20 w-20 shrink-0 rounded-lg border border-royal-gold/30 object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/products/${item.product.slug}`}
                        onClick={closeDrawer}
                        className="font-headline-sm text-sm font-semibold leading-snug text-warm-ink hover:text-imperial-burgundy"
                      >
                        {item.product.shortName}
                      </Link>
                      <p className="mt-0.5 font-label-sm text-xs text-muted-rosewood">{item.options?.metal ?? item.product.metal}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="حذف"
                      onClick={() => remove(item.key)}
                      className="p-1 text-muted-rosewood transition-colors hover:text-imperial-burgundy"
                    >
                      <Icon name="delete" className="text-[17px]" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-label-md text-sm font-bold text-imperial-burgundy">{formatIQD(item.lineTotal)}</span>
                    <div className="flex items-center overflow-hidden rounded-lg border border-royal-gold/30 bg-ivory-canvas">
                      <button
                        type="button"
                        aria-label="إنقاص الكمية"
                        onClick={() => setQty(item.key, item.qty - 1)}
                        className="flex h-6 w-6 items-center justify-center text-xs hover:bg-blush-surface"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-semibold tabular-nums">{item.qty}</span>
                      <button
                        type="button"
                        aria-label="زيادة الكمية"
                        onClick={() => setQty(item.key, item.qty + 1)}
                        className="flex h-6 w-6 items-center justify-center text-xs hover:bg-blush-surface"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="space-y-3.5 border-t border-royal-gold/30 bg-parchment/40 p-6">
            <div className="flex items-center justify-between font-label-md text-label-md text-muted-rosewood">
              <span>المجموع الفرعي:</span>
              <span className="font-bold text-warm-ink">{formatIQD(subtotal)}</span>
            </div>
            {coupon && (
              <div className="flex items-center justify-between font-label-md text-label-md text-antique-gold">
                <span>
                  {coupon.label} <span className="font-mono text-xs">({coupon.code})</span>
                </span>
                <span className="font-bold tabular-nums">-{formatIQD(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-label-md text-label-md text-muted-rosewood">
              <span>الشحن والتوصيل:</span>
              <span className="font-semibold text-emerald-800">{shipping === 0 ? 'مجاني لجميع المحافظات' : formatIQD(shipping)}</span>
            </div>
            <div className="my-1 h-px bg-royal-gold/25" />
            <div className="flex items-baseline justify-between">
              <span className="font-headline-sm text-base font-bold text-warm-ink">الإجمالي:</span>
              <span className="font-headline-sm text-xl font-bold tracking-tight text-imperial-burgundy">{formatIQD(total)}</span>
            </div>
            <Link
              to="/checkout"
              onClick={closeDrawer}
              className="btn-sweep flex w-full items-center justify-center gap-2 rounded-xl border border-royal-gold/40 bg-imperial-burgundy px-6 py-3.5 font-label-lg text-label-lg font-medium text-ivory-canvas shadow-[0_8px_24px_rgba(78,24,37,0.25)] transition-all hover:bg-burgundy-600 active:scale-[0.98]"
            >
              <span>إتمام الطلب</span>
              <Icon name="lock" className="text-[19px]" />
            </Link>
            <Link
              to="/cart"
              onClick={closeDrawer}
              className="block text-center font-label-md text-label-md text-imperial-burgundy underline-offset-4 hover:underline"
            >
              عرض السلة كاملة
            </Link>
            <p className="pt-1 text-center font-label-sm text-[11px] text-muted-rosewood">
              الدفع عند الاستلام متاح · ضمان استبدال مجدول خلال 7 أيام
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
