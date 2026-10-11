import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { MAX_QTY, useCart } from '@/state/cart';
import { useToast } from '@/state/toast';
import { useWishlist } from '@/state/wishlist';

const TRUST = [
  { icon: 'local_shipping', title: 'الدفع عند الاستلام مع المعاينة', note: 'حق فحص الذهب والأحجار قبل سداد المبلغ' },
  { icon: 'inventory_2', title: 'التغليف في علبة الدار', note: 'مع كل قطعة بلا كلفة إضافية' },
  { icon: 'workspace_premium', title: 'استبدال خلال 7 أيام', note: 'إذا كانت القطعة بحالتها الأصلية' },
];

/** السلة للديسكتوب (ممتلئة أو فارغة). */
export default function CartPage() {
  const cart = useCart();
  const wishlist = useWishlist();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState(cart.coupon?.code ?? '');
  const [couponError, setCouponError] = useState(false);

  const active = cart.items.filter((i) => i.available);
  const { visibleProducts } = useCatalog();
  const suggestions = visibleProducts.filter((p) => p.stock > 0 && !cart.items.some((i) => i.product.id === p.id)).slice(0, 4);

  const submitCoupon = (e: FormEvent) => {
    e.preventDefault();
    if (cart.applyCoupon(code)) {
      setCouponError(false);
      toast.show('تم تفعيل القسيمة بنجاح', 'sell');
    } else {
      setCouponError(true);
    }
  };

  return (
    <main className="min-h-[calc(100vh-20rem)] w-full bg-surface">
      <div className="flex w-full flex-col">
        <div className="relative w-full overflow-hidden bg-ivory-canvas pb-space-3xl">
          <div className="pointer-events-none absolute -top-40 right-1/4 h-[520px] w-[520px] rounded-full bg-rose-mist/35 blur-3xl" />
          <div className="pointer-events-none absolute left-0 top-1/3 h-[420px] w-[420px] rounded-full bg-champagne-gold/15 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-[1280px] px-gutter pt-space-xl">
            <nav aria-label="مسار التصفح" className="mb-space-md flex items-center gap-space-xs text-muted-rosewood">
              <Link to="/" className="font-body-sm text-body-sm transition-colors duration-200 hover:text-imperial-burgundy">
                الرئيسية
              </Link>
              <Icon name="chevron_left" className="text-[14px] text-royal-gold/70" />
              <span className="font-body-sm text-body-sm font-medium text-imperial-burgundy">سلة التسوق</span>
            </nav>

            <div className="mb-space-md flex flex-col justify-between gap-space-sm sm:flex-row sm:items-baseline">
              <div className="flex items-center gap-space-md">
                <h1 className="font-display-lg text-headline-xl font-bold tracking-tight text-deep-oxblood">سلة التسوق</h1>
                <span className="inline-flex items-center rounded-full bg-blush-surface px-3 py-1 font-label-md text-label-md font-semibold text-antique-gold shadow-sm">
                  {cart.count} {cart.count === 1 ? 'منتج' : 'منتجات'}
                </span>
              </div>
              <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-muted-rosewood">
                <Icon name="verified_user" className="text-[18px] text-royal-gold" />
                <span>جلسة حجز المجوهرات مؤمّنة بالكامل</span>
              </div>
            </div>

            <div className="my-space-md flex w-full items-center justify-center">
              <div className="flex flex-1 flex-col gap-[3px]">
                <div className="h-px w-full bg-royal-gold/45" />
                <div className="h-px w-full bg-royal-gold/45" />
              </div>
              <span className="select-none px-space-md text-[11px] leading-none text-royal-gold">◆</span>
              <div className="flex flex-1 flex-col gap-[3px]">
                <div className="h-px w-full bg-royal-gold/45" />
                <div className="h-px w-full bg-royal-gold/45" />
              </div>
            </div>

            {active.length === 0 && cart.items.length === 0 ? (
              <div className="mx-auto mt-space-xl max-w-2xl rounded-[20px] bg-surface-container-lowest p-space-2xl text-center shadow-[0_8px_30px_rgba(42,3,13,0.06)]">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-blush-surface">
                  <Icon name="shopping_bag" className="text-[44px] text-imperial-burgundy" />
                </div>
                <h2 className="mt-space-md font-headline-lg text-headline-lg font-bold text-deep-oxblood">سلتكِ فارغة حالياً</h2>
                <p className="mx-auto mt-2 max-w-md font-body-md text-body-md text-muted-rosewood">
                  لم تقومي بإضافة أي قطعة إلى سلتك بعد. استكشفي أحدث إبداعات دار آيريس المصاغة بحرفية استثنائية لتنتقي ما يليق بذوقكِ الرفيع.
                </p>
                <div className="mt-space-lg flex flex-wrap justify-center gap-space-sm">
                  <Link
                    to="/collections/necklaces"
                    className="flex items-center gap-2 rounded-xl bg-imperial-burgundy px-space-lg py-3 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_10px_24px_rgba(78,24,37,0.28)] transition-colors hover:bg-burgundy-600"
                  >
                    تصفّحي تشكيلاتنا
                    <Icon name="arrow_back" className="text-[18px]" />
                  </Link>
                  <Link
                    to="/wishlist"
                    className="flex items-center gap-2 rounded-xl bg-blush-surface px-space-lg py-3 font-label-lg text-label-lg font-semibold text-imperial-burgundy transition-colors hover:bg-rose-mist"
                  >
                    <Icon name="favorite" className="text-[18px] text-royal-gold" />
                    استعراض قائمة الأمنيات
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-space-lg rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
                  <div className="mb-space-sm flex flex-col items-start justify-between gap-space-sm sm:flex-row sm:items-center">
                    <div className="flex items-center gap-space-sm">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
                        <Icon name="redeem" className="text-[18px]" />
                      </span>
                      <p className="font-body-md text-body-md text-deep-oxblood">
                        {cart.freeShippingRemaining > 0 ? (
                          <>
                            أضف <span className="font-label-lg font-bold text-imperial-burgundy tabular-nums">{formatNumber(cart.freeShippingRemaining)} د.ع</span> إضافية
                            للحصول على <span className="font-medium">توصيل مجاني</span>
                          </>
                        ) : (
                          <span className="font-medium">التوصيل مجاني لهذا الطلب</span>
                        )}
                      </p>
                    </div>
                    <span className="font-label-sm text-label-sm font-semibold tracking-wider text-antique-gold">
                      {cart.freeShippingRemaining > 0 ? `المتبقي ${100 - cart.freeShippingProgress}% فقط للاكتمال` : 'تم الاكتمال'}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-royal-gold to-imperial-burgundy transition-all duration-500"
                      style={{ width: `${cart.freeShippingProgress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
                  <div className="flex flex-col gap-space-lg lg:col-span-7 xl:col-span-8">
                    <div className="overflow-hidden rounded-[20px] bg-surface-container-lowest shadow-[0_8px_30px_rgba(42,3,13,0.06)]">
                      <div className="flex items-center justify-between bg-surface-container-low px-space-lg py-space-md font-label-sm text-label-sm text-muted-rosewood">
                        <span>تفاصيل القطع المختارة</span> <span className="hidden sm:inline">الكمية والمجموع</span>
                      </div>
                      <div className="divide-y divide-rose-mist/40">
                        {cart.items.map((item) => {
                          const p = item.product;
                          const saved = wishlist.has(p.id);
                          return item.available ? (
                            <article key={item.key} className="flex flex-col gap-space-lg p-space-lg transition-colors hover:bg-surface-container-low/40 sm:flex-row">
                              <Link to={`/products/${p.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-wine-night/10 shadow-sm">
                                <img className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" src={p.image} alt={p.shortName} />
                                <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_0_0_1px_rgba(201,162,75,0.4)]" />
                              </Link>
                              <div className="flex flex-1 flex-col justify-between">
                                <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-start">
                                  <div>
                                    <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood transition-colors hover:text-imperial-burgundy">
                                      <Link to={`/products/${p.slug}`}>{p.name.length > 70 ? p.shortName : p.name}</Link>
                                    </h2>
                                    <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">
                                      اللون: {item.options?.metal ?? p.metal}
                                      {item.options?.size ? ` · المقاس: ${item.options.size}` : ''}
                                    </p>
                                    <span className="mt-1 inline-block font-mono font-label-sm text-label-sm tracking-wider text-antique-gold">SKU: {p.sku}</span>
                                  </div>
                                  <div className="shrink-0 text-right sm:text-left">
                                    {p.oldPrice && p.oldPrice > p.price && (
                                      <span className="ml-2 font-body-sm text-body-sm text-muted-rosewood/70 line-through tabular-nums">{formatNumber(p.oldPrice * item.qty)} د.ع</span>
                                    )}
                                    <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">{formatNumber(item.lineTotal)} د.ع</span>
                                    <p className="mt-0.5 font-label-sm text-label-sm text-muted-rosewood/80">سعر القطعة: {formatNumber(p.price)} د.ع</p>
                                  </div>
                                </div>
                                <div className="mt-space-md flex items-center justify-between pt-space-sm">
                                  <div className="inline-flex items-center rounded-xl bg-surface-container-low p-1 shadow-inner">
                                    <button
                                      type="button"
                                      aria-label="إنقاص الكمية"
                                      onClick={() => cart.setQty(item.key, item.qty - 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-deep-oxblood transition-all hover:bg-blush-surface hover:text-imperial-burgundy active:translate-y-px"
                                    >
                                      <Icon name="remove" className="text-[16px]" />
                                    </button>
                                    <span className="w-10 text-center font-label-md text-label-md font-semibold text-deep-oxblood tabular-nums">{item.qty}</span>
                                    <button
                                      type="button"
                                      aria-label="زيادة الكمية"
                                      disabled={item.qty >= Math.min(MAX_QTY, p.stock)}
                                      onClick={() => cart.setQty(item.key, item.qty + 1)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-deep-oxblood transition-all hover:bg-blush-surface hover:text-imperial-burgundy active:translate-y-px disabled:opacity-40"
                                    >
                                      <Icon name="add" className="text-[16px]" />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-space-md">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        wishlist.toggle(p.id);
                                        toast.show(saved ? 'أُزيلت القطعة من المفضلة' : 'نُقلت القطعة إلى قائمة الأمنيات', 'favorite');
                                      }}
                                      className="flex items-center gap-1 font-label-sm text-label-sm text-muted-rosewood transition-colors duration-200 hover:text-antique-gold"
                                    >
                                      <Icon name="favorite" fill={saved} className={cn('text-[18px]', saved && 'text-error')} />
                                      <span className="hidden md:inline">{saved ? 'في قائمة الأمنيات' : 'نقل إلى قائمة الأمنيات'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="حذف القطعة"
                                      onClick={() => cart.remove(item.key)}
                                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-rosewood transition-colors hover:bg-semantic-error-bg hover:text-semantic-error"
                                    >
                                      <Icon name="delete" className="text-[18px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </article>
                          ) : (
                            <article key={item.key} className="flex flex-col gap-space-lg bg-surface-container-low/50 p-space-lg sm:flex-row">
                              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-surface-container-high opacity-45 shadow-sm">
                                <img className="h-full w-full object-cover grayscale" src={p.image} alt={p.shortName} />
                              </div>
                              <div className="flex flex-1 flex-col justify-between">
                                <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-start">
                                  <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <h2 className="font-headline-sm text-headline-sm font-medium text-muted-rosewood">{p.shortName}</h2>
                                      <span className="rounded-full bg-surface-container-highest px-2.5 py-0.5 font-label-sm text-label-sm font-medium text-muted-rosewood">
                                        غير متاح حالياً — نفد من الخزانة
                                      </span>
                                    </div>
                                    <p className="font-body-sm text-body-sm text-muted-rosewood/70">{p.metal}</p>
                                    <span className="mt-1 inline-block font-mono font-label-sm text-label-sm tracking-wider text-muted-rosewood/60">SKU: {p.sku}</span>
                                  </div>
                                  <div className="shrink-0 text-right sm:text-left">
                                    <span className="font-headline-sm text-headline-sm text-muted-rosewood line-through tabular-nums">{formatNumber(p.price)} د.ع</span>
                                    <p className="mt-0.5 font-label-sm text-label-sm text-muted-rosewood/70">مستبعد من الحساب</p>
                                  </div>
                                </div>
                                <div className="mt-space-sm flex items-center gap-space-sm rounded-xl bg-surface-container-high/60 p-3 text-muted-rosewood">
                                  <Icon name="lock_clock" className="shrink-0 text-[18px]" />
                                  <p className="font-body-sm text-body-sm">تم استبعاد هذه القطعة تلقائياً من حساب إجمالي الطلب حتى إعادة توفرها في الصياغة.</p>
                                </div>
                                <div className="mt-space-md flex items-center justify-between pt-space-sm">
                                  <button
                                    type="button"
                                    onClick={() => toast.show('سنُعلمكِ فور توفر القطعة', 'notifications_active')}
                                    className="flex items-center gap-1.5 rounded-xl bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm font-semibold text-imperial-burgundy shadow-sm transition-all hover:bg-blush-surface"
                                  >
                                    <Icon name="notifications" className="text-[16px] text-royal-gold" />
                                    <span>إعلامي فور التوفر</span>
                                  </button>
                                  <button type="button" onClick={() => cart.remove(item.key)} className="font-label-sm text-label-sm text-semantic-error transition-colors hover:underline">
                                    إزالة من السلة
                                  </button>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                      <div className="flex flex-col items-center justify-between gap-space-sm bg-surface-container-low/70 p-space-md font-body-sm text-body-sm text-muted-rosewood sm:flex-row">
                        <div className="flex items-center gap-2">
                          <Icon name="stars" className="text-[18px] text-royal-gold" />
                          <span>كل قطعة ذهبية مختومة بدمغة العيار الرسمية</span>
                        </div>
                        <Link to="/policies/size-guide" className="font-label-sm text-label-sm font-semibold text-imperial-burgundy hover:underline">
                          استعراض دليل القياسات والأطوال ←
                        </Link>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-[20px] bg-wine-night p-space-lg text-rose-mist shadow-xl">
                      <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-imperial-burgundy/40 blur-3xl" />
                      <div className="relative z-10 flex flex-col items-center justify-between gap-space-lg md:flex-row">
                        <div className="flex items-center gap-space-md">
                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl shadow-[0_0_0_1px_rgba(201,162,75,0.4)]">
                            <img className="h-full w-full object-cover" src="/images/gift-box-opening.jpg" alt="صندوق الهدايا الملكي" />
                          </div>
                          <div>
                            <h3 className="font-headline-sm text-headline-sm font-bold text-champagne-gold">تغليف آيريس</h3>
                            <p className="mt-1 max-w-md font-body-sm text-body-sm text-rose-mist/80">
                              كل طلب يغلف يدوياً بصندوق مخملي كستنائي مع بطاقة تهنئة مختومة بالشمع الأحمر ومرفقة بشهادة الفحص.
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-champagne-gold/15 px-3 py-1 font-label-sm text-label-sm font-semibold text-champagne-gold">
                          مشمول مع الطلبات المؤهلة
                        </span>
                      </div>
                    </div>
                  </div>

                  <aside className="sticky top-28 flex flex-col gap-space-lg lg:col-span-5 xl:col-span-4">
                    <div className="rounded-[20px] bg-surface-container-lowest p-space-xl shadow-[0_12px_40px_rgba(42,3,13,0.08)]">
                      <div className="flex items-center justify-between pb-space-sm">
                        <div className="flex items-center gap-space-xs">
                          <span className="text-[10px] text-royal-gold">◆</span>
                          <h2 className="font-headline-md text-headline-md font-bold text-deep-oxblood">ملخص الطلب</h2>
                        </div>
                        <span className="font-label-sm text-label-sm text-muted-rosewood">{active.length === 1 ? 'قطعة نشطة' : active.length === 2 ? 'قطعتان نشطتان' : `${active.length} قطع نشطة`}</span>
                      </div>
                      <div className="my-space-sm h-px w-full bg-rose-mist/50" />
                      <div className="flex flex-col gap-space-md py-space-sm">
                        <div className="flex items-center justify-between font-body-md text-body-md text-deep-oxblood">
                          <span className="text-muted-rosewood">المجموع الفرعي:</span>
                          <span className="font-mono font-medium tabular-nums">{formatNumber(cart.subtotal)} د.ع</span>
                        </div>
                        {cart.coupon && (
                          <div className="flex items-center justify-between font-body-md text-body-md text-antique-gold">
                            <div className="flex items-center gap-2">
                              <span>{cart.coupon.label}</span>
                              <span className="rounded-full bg-champagne-gold/25 px-2 py-0.5 font-mono text-label-sm font-semibold text-deep-oxblood">{cart.coupon.code}</span>
                            </div>
                            <span className="font-mono font-bold tabular-nums">-{formatNumber(cart.discount)} د.ع</span>
                          </div>
                        )}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between font-body-md text-body-md">
                            <span className="text-muted-rosewood">رسوم الشحن والتوصيل:</span>
                            <span className="font-label-sm text-label-sm font-semibold text-antique-gold">
                              {cart.shipping === 0 ? 'مجاني' : `${formatNumber(cart.shipping)} د.ع`}
                            </span>
                          </div>
                          <p className="font-label-sm text-label-sm text-muted-rosewood/70">متاح الدفع نقداً عند الاستلام داخل بغداد وجميع المحافظات</p>
                        </div>
                      </div>
                      <div className="my-space-md flex w-full items-center justify-center">
                        <div className="flex flex-1 flex-col gap-[3px]">
                          <div className="h-px w-full bg-royal-gold/50" />
                          <div className="h-px w-full bg-royal-gold/50" />
                        </div>
                        <span className="select-none px-space-sm text-[9px] text-royal-gold">◆</span>
                        <div className="flex flex-1 flex-col gap-[3px]">
                          <div className="h-px w-full bg-royal-gold/50" />
                          <div className="h-px w-full bg-royal-gold/50" />
                        </div>
                      </div>
                      <div className="flex items-baseline justify-between pb-space-md pt-space-xs">
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-headline-sm font-bold text-deep-oxblood">الإجمالي</span>
                          <span className="font-label-sm text-label-sm text-muted-rosewood">شامل التوصيل · الدفع عند الاستلام</span>
                        </div>
                        <div className="text-left">
                          <span className="whitespace-nowrap font-display-lg font-mono text-[1.75rem] font-bold text-imperial-burgundy tabular-nums">{formatNumber(cart.total)} د.ع</span>
                        </div>
                      </div>

                      <form onSubmit={submitCoupon} className="my-space-md rounded-xl bg-surface-container-low p-space-md">
                        <label className="mb-2 block font-label-sm text-label-sm font-semibold text-warm-ink" htmlFor="coupon-code">
                          قسيمة الخصم
                        </label>
                        <div className="flex items-center gap-space-sm">
                          <div className="relative flex-1">
                            <input
                              id="coupon-code"
                              type="text"
                              value={code}
                              onChange={(e) => {
                                setCode(e.target.value);
                                setCouponError(false);
                              }}
                              placeholder="SPRING10"
                              className="w-full rounded-xl border-0 bg-surface-container-lowest px-space-md py-2.5 font-mono text-body-sm font-medium uppercase text-warm-ink shadow-inner transition-all focus:outline-none focus:ring-2 focus:ring-imperial-burgundy/40"
                            />
                            {cart.coupon && code.trim().toUpperCase() === cart.coupon.code && (
                              <Icon name="check_circle" className="absolute left-3 top-2.5 text-[18px] text-semantic-success" />
                            )}
                          </div>
                          <button
                            type="submit"
                            className="rounded-xl bg-deep-oxblood px-space-md py-2.5 font-label-md text-label-md font-semibold text-champagne-gold shadow-sm transition-all hover:bg-wine-night active:translate-y-px"
                          >
                            تطبيق
                          </button>
                        </div>
                        {cart.coupon && !couponError && (
                          <p className="mt-2 flex items-center gap-1 font-label-sm text-label-sm text-semantic-success">
                            <span>تم تفعيل خصم {cart.coupon.percent}% بنجاح على قلائد وخواتم المجموعة.</span>
                            <button
                              type="button"
                              onClick={() => {
                                cart.removeCoupon();
                                setCode('');
                              }}
                              className="mr-auto text-muted-rosewood underline"
                            >
                              إزالة
                            </button>
                          </p>
                        )}
                        {couponError && <p className="mt-2 font-label-sm text-label-sm text-semantic-error">الكود غير صالح. جرّبي SPRING10.</p>}
                      </form>

                      <button
                        type="button"
                        disabled={active.length === 0}
                        onClick={() => navigate('/checkout')}
                        className="group relative flex h-14 w-full items-center justify-center gap-space-sm overflow-hidden rounded-xl bg-imperial-burgundy font-headline-sm text-headline-sm font-semibold text-surface-container-lowest shadow-[0_10px_24px_rgba(78,24,37,0.28)] transition-all duration-200 hover:bg-burgundy-600 active:translate-y-px disabled:opacity-50"
                      >
                        <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(201,162,75,0.4)]" />
                        <Icon name="lock" className="text-[22px] text-champagne-gold transition-transform group-hover:scale-110" />
                        <span>إتمام الطلب</span>
                        <Icon name="arrow_back" className="text-[20px] transition-transform group-hover:-translate-x-1" />
                      </button>
                      <div className="mt-space-md text-center">
                        <Link
                          to="/collections/necklaces"
                          className="inline-flex items-center gap-2 font-label-md text-label-md font-medium text-deep-oxblood transition-colors duration-200 hover:text-imperial-burgundy"
                        >
                          <span>متابعة التسوق واستعراض المجوهرات</span> <span className="text-royal-gold">←</span>
                        </Link>
                      </div>
                    </div>

                    <div className="flex flex-col gap-space-md rounded-2xl bg-surface-container-lowest p-space-md shadow-sm">
                      {TRUST.map((t, i) => (
                        <div key={t.title}>
                          {i > 0 && <div className="mb-space-md h-px w-full bg-rose-mist/40" />}
                          <div className="flex items-center gap-space-sm">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blush-surface text-imperial-burgundy">
                              <Icon name={t.icon} className="text-[20px]" />
                            </div>
                            <div>
                              <h4 className="font-label-md text-label-md font-semibold text-deep-oxblood">{t.title}</h4>
                              <p className="font-label-sm text-label-sm text-muted-rosewood">{t.note}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-space-sm rounded-2xl bg-surface-container-low p-space-md text-deep-oxblood">
                      <div className="flex items-center gap-space-sm">
                        <Icon name="support_agent" className="text-[24px] text-royal-gold" />
                        <div>
                          <span className="block font-label-md text-label-md font-semibold">بحاجة إلى استشارة خاصة؟</span>
                          <span className="font-label-sm text-label-sm text-muted-rosewood">خبير المجوهرات متواجد لخدمتك</span>
                        </div>
                      </div>
                      <Link to="/contact" className="rounded-lg bg-surface-container-lowest px-3 py-1.5 font-label-sm text-label-sm font-semibold text-imperial-burgundy shadow-sm transition-all hover:bg-blush-surface">
                        محادثة فورية
                      </Link>
                    </div>
                  </aside>
                </div>
              </>
            )}

            {suggestions.length > 0 && (
              <section className="mt-space-3xl">
                <div className="mb-space-lg flex items-end justify-between">
                  <div>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-antique-gold">◆ إبداعات مختارة</span>
                    <h2 className="mt-1 font-headline-lg text-headline-lg font-bold text-deep-oxblood">مختارات ملكية قد تنال إعجابكِ</h2>
                  </div>
                  <Link to="/collections/all" className="flex items-center gap-1 font-label-md text-label-md font-semibold text-imperial-burgundy">
                    <Icon name="arrow_back" className="text-[16px]" /> عرض كافة المختارات
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-4">
                  {suggestions.map((p) => (
                    <div key={p.id} className="group flex flex-col overflow-hidden rounded-2xl bg-surface-container-lowest shadow-sm transition-all duration-300 hover:shadow-xl">
                      <Link to={`/products/${p.slug}`} className="relative block aspect-[4/5] overflow-hidden bg-deep-oxblood">
                        <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" src={p.image} alt={p.shortName} loading="lazy" />
                      </Link>
                      <div className="flex flex-1 flex-col justify-between gap-space-xs p-space-md">
                        <h3 className="font-headline-sm text-[1.125rem] font-bold text-warm-ink transition-colors group-hover:text-imperial-burgundy">
                          <Link to={`/products/${p.slug}`}>{p.shortName}</Link>
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">{formatNumber(p.price)} د.ع</span>
                          <button
                            type="button"
                            onClick={() => {
                              cart.add(p.id, 1, { metal: p.metal });
                              toast.show('أُضيفت القطعة إلى السلة', 'shopping_bag');
                            }}
                            className="rounded-lg bg-blush-surface px-3 py-1.5 font-label-sm text-label-sm font-semibold text-imperial-burgundy transition-colors hover:bg-rose-mist"
                          >
                            أضف
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
