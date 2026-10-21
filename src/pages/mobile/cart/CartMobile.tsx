import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MOBILE_CARD, MobilePage } from '@/components/mobile/MobilePage';
import { useCatalog } from '@/data/catalog';
import { cn } from '@/lib/cn';
import { formatNumber, piecesCount } from '@/lib/format';
import { useCart, type CartItem } from '@/state/cart';
import { useToast } from '@/state/toast';
import { useWishlist } from '@/state/wishlist';

/** السلة على الهاتف (`/cart`): القطع، القسيمة، الملخص، وزر إتمام الطلب الثابت فوق شريط التبويب. */
export default function CartMobile() {
  const cart = useCart();
  const toast = useToast();
  const { settings } = useCatalog();
  const [code, setCode] = useState(cart.coupon?.code ?? '');
  const [couponError, setCouponError] = useState<string | null>(null);

  const active = cart.items.filter((i) => i.available);
  const canCheckout = active.length > 0;
  const hasFreeShipping = settings.freeShippingThreshold > 0;

  const submitCoupon = () => {
    if (!code.trim()) {
      setCouponError('يرجى إدخال رمز القسيمة');
      return;
    }
    if (cart.applyCoupon(code)) {
      setCouponError(null);
      toast.show('تم تفعيل القسيمة', 'sell');
    } else {
      setCouponError('رمز القسيمة غير صالح');
    }
  };

  const checkoutBar = (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] z-40">
      <div className="pointer-events-auto mx-auto flex max-w-[440px] items-center gap-3 rounded-2xl bg-wine-night px-4 py-3 text-ivory-canvas shadow-[0_12px_32px_rgba(42,3,13,0.3)]">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-label-sm text-label-sm text-rose-mist/80">الإجمالي</span>
          <span className="font-headline-sm text-[1.25rem] font-bold text-champagne-gold tabular-nums">
            {formatNumber(cart.total)} <span className="font-label-md text-label-md font-medium text-rose-mist">د.ع</span>
          </span>
        </div>
        {canCheckout ? (
          <Link
            to="/checkout"
            className="mr-auto flex h-11 items-center gap-2 rounded-xl bg-champagne-gold px-5 font-label-lg text-label-lg font-bold text-wine-night transition-transform active:scale-[0.98]"
          >
            إتمام الطلب
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
        ) : (
          <span className="mr-auto flex h-11 items-center rounded-xl bg-white/10 px-5 font-label-lg text-label-lg font-semibold text-rose-mist/70">
            لا توجد قطع متاحة
          </span>
        )}
      </div>
    </div>
  );

  return (
    <MobilePage title="السلة" tab="cart" footer={checkoutBar} className="pb-48">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-headline-md text-headline-md font-semibold text-deep-oxblood">
          سلتكِ <span className="font-label-lg text-label-lg font-medium text-muted-rosewood">({piecesCount(cart.count || 0)})</span>
        </h1>
        <button
          type="button"
          onClick={() => {
            cart.clear();
            toast.show('أُفرغت السلة', 'delete');
          }}
          className="flex min-h-[40px] items-center gap-1 rounded-full px-3 font-label-md text-label-md text-muted-rosewood transition-colors active:bg-blush-surface"
        >
          <Icon name="delete" className="text-[18px]" />
          إفراغ
        </button>
      </div>

      {canCheckout && hasFreeShipping && (
        <div className="mb-4 rounded-2xl bg-blush-surface px-4 py-3">
          <div className="flex items-center gap-2 font-body-sm text-body-sm text-warm-ink">
            <Icon name="local_shipping" className="text-[20px] text-imperial-burgundy" />
            {cart.freeShippingRemaining === 0 ? (
              <span className="font-semibold text-semantic-success">التوصيل مجاني لهذا الطلب</span>
            ) : (
              <span>
                أضيفي <strong className="font-bold text-imperial-burgundy tabular-nums">{formatNumber(cart.freeShippingRemaining)} د.ع</strong> للحصول
                على توصيل مجاني
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-lowest">
            <div className="h-full rounded-full bg-royal-gold transition-all duration-700" style={{ width: `${cart.freeShippingProgress}%` }} />
          </div>
        </div>
      )}

      <section aria-label="قطع السلة" className="flex flex-col gap-3">
        {cart.items.map((item) => (
          <CartLineCard key={item.key} item={item} />
        ))}
      </section>

      {canCheckout && (
        <>
          <section className={`${MOBILE_CARD} mt-4`}>
            <label htmlFor="promo-input" className="font-label-lg text-label-lg font-semibold text-deep-oxblood">
              قسيمة الخصم
            </label>
            <form
              className="mt-2 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitCoupon();
              }}
            >
              <input
                id="promo-input"
                type="text"
                autoCapitalize="characters"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCouponError(null);
                }}
                placeholder="أدخلي الرمز"
                className="h-12 min-w-0 flex-1 rounded-xl bg-ivory-canvas px-4 font-label-lg text-label-lg text-deep-oxblood placeholder:text-muted-rosewood/70 focus:outline-none focus:ring-2 focus:ring-royal-gold/50"
              />
              <button
                type="submit"
                className="h-12 shrink-0 rounded-xl bg-imperial-burgundy px-5 font-label-lg text-label-lg font-semibold text-ivory-canvas active:translate-y-px"
              >
                تطبيق
              </button>
            </form>
            {couponError && (
              <p role="alert" className="mt-2 flex items-center gap-1.5 font-label-md text-label-md text-semantic-error">
                <Icon name="error" className="text-[16px]" /> {couponError}
              </p>
            )}
            {cart.coupon && !couponError && (
              <div className="mt-2 flex items-center justify-between gap-2 font-label-md text-label-md text-semantic-success">
                <span className="flex items-center gap-1.5">
                  <Icon name="check_circle" className="text-[16px]" />
                  {cart.coupon.label} (−{formatNumber(cart.discount)} د.ع)
                </span>
                <button
                  type="button"
                  className="text-muted-rosewood underline underline-offset-4"
                  onClick={() => {
                    cart.removeCoupon();
                    setCode('');
                  }}
                >
                  إزالة
                </button>
              </div>
            )}
          </section>

          <section className={`${MOBILE_CARD} mt-4 flex flex-col gap-2.5`}>
            <h2 className="font-label-lg text-label-lg font-semibold text-deep-oxblood">ملخص الطلب</h2>
            <SummaryRow label="المجموع" value={`${formatNumber(cart.subtotal)} د.ع`} />
            {cart.coupon && <SummaryRow label={`الخصم (${cart.coupon.code})`} value={`−${formatNumber(cart.discount)} د.ع`} tone="success" />}
            <SummaryRow
              label="التوصيل"
              value={cart.shipping === 0 ? 'مجاني' : `${formatNumber(cart.shipping)} د.ع`}
              tone={cart.shipping === 0 ? 'success' : undefined}
            />
            <div className="my-1 h-px bg-hairline-burgundy" />
            <div className="flex items-baseline justify-between">
              <span className="font-label-lg text-label-lg font-bold text-deep-oxblood">الإجمالي</span>
              <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">{formatNumber(cart.total)} د.ع</span>
            </div>
            <p className="font-label-sm text-label-sm text-muted-rosewood">الدفع نقداً عند الاستلام.</p>
          </section>
        </>
      )}
    </MobilePage>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-center justify-between font-body-sm text-body-sm">
      <span className="text-muted-rosewood">{label}</span>
      <span className={cn('font-semibold tabular-nums', tone === 'success' ? 'text-semantic-success' : 'text-deep-oxblood')}>{value}</span>
    </div>
  );
}

function CartLineCard({ item }: { item: CartItem }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const p = item.product;
  const detail = [item.options?.metal, item.options?.size].filter(Boolean).join(' · ') || p.metal;
  const maxQty = Math.min(10, p.stock);

  return (
    <article className={cn(MOBILE_CARD, 'flex gap-3 p-3', !item.available && 'opacity-75')}>
      <Link to={`/products/${p.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-wine-night">
        <img src={p.image} alt={p.shortName} className={cn('h-full w-full object-cover', !item.available && 'grayscale')} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={cn('truncate font-label-lg text-label-lg font-semibold text-deep-oxblood', !item.available && 'line-through')}>
              <Link to={`/products/${p.slug}`}>{p.shortName}</Link>
            </h3>
            <p className="mt-0.5 truncate font-label-md text-label-md text-muted-rosewood">{detail}</p>
          </div>
          <button
            type="button"
            aria-label={`حذف ${p.shortName} من السلة`}
            onClick={() => cart.remove(item.key)}
            className="-ml-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-rosewood transition-colors active:bg-semantic-error-bg active:text-semantic-error"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>

        {item.available ? (
          <div className="mt-auto flex items-end justify-between gap-2 pt-2">
            <span className="font-label-lg text-label-lg font-bold text-imperial-burgundy tabular-nums">
              {formatNumber(item.lineTotal)} <span className="font-label-sm text-label-sm font-medium text-muted-rosewood">د.ع</span>
            </span>
            <div className="flex items-center rounded-full bg-ivory-canvas p-0.5 shadow-[0_0_0_1px_rgba(78,24,37,0.1)]">
              <button
                type="button"
                aria-label="زيادة الكمية"
                disabled={item.qty >= maxQty}
                onClick={() => cart.setQty(item.key, item.qty + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-imperial-burgundy active:bg-blush-surface disabled:opacity-30"
              >
                <Icon name="add" className="text-[18px]" />
              </button>
              <span aria-live="polite" className="w-6 text-center font-label-lg text-label-lg font-bold text-deep-oxblood tabular-nums">
                {item.qty}
              </span>
              <button
                type="button"
                aria-label="إنقاص الكمية"
                onClick={() => cart.setQty(item.key, item.qty - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-imperial-burgundy active:bg-blush-surface"
              >
                <Icon name={item.qty <= 1 ? 'delete' : 'remove'} className="text-[18px]" />
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-muted-rosewood">
              غير متاحة حالياً
            </span>
            <button
              type="button"
              onClick={() => {
                const saved = wishlist.toggle(p.id);
                toast.show(saved ? 'حُفظت في المفضلة' : 'أُزيلت من المفضلة', 'favorite');
              }}
              className="font-label-md text-label-md text-imperial-burgundy underline underline-offset-4"
            >
              {wishlist.has(p.id) ? 'في المفضلة' : 'احفظيها في المفضلة'}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
