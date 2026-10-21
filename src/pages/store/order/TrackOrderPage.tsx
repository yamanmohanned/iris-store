import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { customerStatusLabels, paymentLabels, useOrders, type Order, type OrderStatus } from '@/state/orders';

/** مراحل الزبون: الطلب المرسل مؤكَّد من البداية، وموافقة المسؤول تنقله إلى التجهيز (customerStatusLabels). */
const STEPS: Array<{ ids: OrderStatus[]; label: string; icon: string }> = [
  { ids: ['pending'], label: 'تم تأكيد الطلب', icon: 'verified' },
  { ids: ['confirmed', 'preparing'], label: 'قيد التجهيز والتغليف', icon: 'redeem' },
  { ids: ['shipped'], label: 'مع مندوب التوصيل', icon: 'local_shipping' },
  { ids: ['delivered'], label: 'تم التسليم', icon: 'task_alt' },
];

/**
 * تتبع الطلب (`/track-order?order=1055`): رقم الطلب + رقم الهاتف المستخدم فيه ← حالته الحالية من الخادم.
 * (كانت الصفحتان الأصليتان تعرضان طلباً ثابتاً من التصميم مهما أدخل الزبون.)
 */
export default function TrackOrderPage() {
  const mobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const { orders, trackOrder } = useOrders();
  const known = orders.find((o) => String(o.id) === params.get('order')) ?? (params.get('order') ? undefined : orders[0]);
  const [id, setId] = useState(params.get('order') ?? (known ? String(known.id) : ''));
  const [phone, setPhone] = useState(known?.customer.phone ?? '');
  const [order, setOrder] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (orderId: string, tel: string) => {
    setBusy(true);
    setError(null);
    try {
      setOrder(await trackOrder(orderId, tel));
      setParams({ order: orderId.replace(/\D/g, '') }, { replace: true });
    } catch (e) {
      setOrder(null);
      setError(e instanceof Error ? e.message : 'تعذر العثور على الطلب.');
    } finally {
      setBusy(false);
    }
  };

  // طلب معروف على هذا الجهاز ← نجلب حالته مباشرة
  useEffect(() => {
    if (known) void lookup(String(known.id), known.customer.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !phone.trim()) {
      setError('يرجى إدخال رقم الطلب ورقم الهاتف.');
      return;
    }
    void lookup(id, phone);
  };

  const body = (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-3 rounded-2xl bg-surface-container-lowest p-4 shadow-royal sm:grid-cols-[1fr_1.3fr_auto] sm:p-5"
      >
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-muted-rosewood">رقم الطلب</span>
          <input
            dir="ltr"
            inputMode="numeric"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="1055"
            className="h-12 rounded-xl bg-ivory-canvas px-4 font-mono text-body-md text-warm-ink shadow-[inset_0_0_0_1px_rgba(201,162,75,0.45)] outline-none focus:shadow-[inset_0_0_0_2px_#4E1825]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-label-md text-label-md text-muted-rosewood">رقم الهاتف المستخدم في الطلب</span>
          <input
            dir="ltr"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07XX XXX XXXX"
            className="h-12 rounded-xl bg-ivory-canvas px-4 text-body-md text-warm-ink shadow-[inset_0_0_0_1px_rgba(201,162,75,0.45)] outline-none focus:shadow-[inset_0_0_0_2px_#4E1825]"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 items-center justify-center gap-2 self-end rounded-xl bg-imperial-burgundy px-6 font-label-lg text-label-lg font-semibold text-ivory-canvas hover:bg-burgundy-600 disabled:opacity-60"
        >
          <Icon name={busy ? 'progress_activity' : 'search'} className={cn('text-[20px] text-champagne-gold', busy && 'animate-spin')} />
          تتبع
        </button>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-semantic-error-bg p-4 text-semantic-error">
          <Icon name="error" className="mt-0.5 text-[20px]" />
          <p className="font-body-sm text-body-sm">{error}</p>
        </div>
      )}

      {order && <OrderStatusCard order={order} />}

      {!order && !error && orders.length > 1 && (
        <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-luxury">
          <p className="mb-2 font-label-lg text-label-lg text-antique-gold">طلباتك من هذا الجهاز</p>
          <ul className="flex flex-col divide-y divide-hairline-burgundy">
            {orders.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => {
                    setId(String(o.id));
                    setPhone(o.customer.phone);
                    void lookup(String(o.id), o.customer.phone);
                  }}
                  className="flex w-full items-center justify-between py-2.5 text-right"
                >
                  <span className="font-mono text-label-lg font-bold text-imperial-burgundy">#{o.id}</span>
                  <span className="font-label-sm text-label-sm text-muted-rosewood">{formatDate(o.createdAt)}</span>
                  <span className="font-label-md text-label-md tabular-nums">{formatNumber(o.total)} د.ع</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div className="flex min-h-screen flex-col">
        <MobileTopBar title="تتبع طلبك" back="/" />
        <main className="flex-1 px-gutter-mobile pb-32 pt-[calc(5rem+env(safe-area-inset-top,0px))]">{body}</main>
        <MobileTabBar active="account" />
      </div>
    );
  }
  return (
    <main className="w-full bg-ivory-canvas">
      <section className="border-b border-hairline-burgundy bg-parchment px-6 py-12 text-center">
        <h1 className="font-headline-xl text-headline-xl font-bold text-deep-oxblood">تتبع طلبك</h1>
        <p className="mt-2 font-body-md text-body-md text-muted-rosewood">أدخل رقم الطلب ورقم الهاتف لمعرفة حالته الآن.</p>
      </section>
      <div className="px-6 py-10">{body}</div>
    </main>
  );
}

function OrderStatusCard({ order }: { order: Order }) {
  const stopped = order.status === 'cancelled' || order.status === 'returned';
  const current = STEPS.findIndex((s) => s.ids.includes(order.status));

  return (
    <div className="rounded-3xl bg-surface-container-lowest p-5 shadow-royal md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label-md text-label-md text-antique-gold">الطلب</p>
          <p className="font-mono text-headline-md font-bold text-deep-oxblood">#{order.id}</p>
          <p className="font-label-sm text-label-sm text-muted-rosewood">{formatDate(order.createdAt)}</p>
        </div>
        <span
          className={cn(
            'rounded-full px-4 py-1.5 font-label-lg text-label-lg font-semibold',
            stopped ? 'bg-surface-container-high text-muted-rosewood' : 'bg-blush-surface text-imperial-burgundy',
          )}
        >
          {customerStatusLabels[order.status]}
        </span>
      </div>

      {!stopped && (
        <ol className="mb-6 flex flex-col gap-4 md:flex-row md:gap-0">
          {STEPS.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s.label} className="flex flex-1 items-center gap-3 md:flex-col md:text-center">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    done ? 'bg-imperial-burgundy text-champagne-gold' : 'bg-surface-container text-muted-rosewood/60',
                  )}
                >
                  <Icon name={s.icon} className="text-[20px]" />
                </span>
                <span className={cn('font-label-md text-label-md', done ? 'font-semibold text-deep-oxblood' : 'text-muted-rosewood')}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <ul className="flex flex-col gap-3 border-t border-hairline-burgundy pt-4">
        {order.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-3">
            <img src={l.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{l.name}</span>
              <span className="block font-label-sm text-label-sm text-muted-rosewood">الكمية: {l.qty}</span>
            </span>
            <span className="font-label-md text-label-md tabular-nums">{formatNumber(l.price * l.qty)} د.ع</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-hairline-burgundy pt-4">
        <span className="font-body-sm text-body-sm text-muted-rosewood">{paymentLabels[order.payment]}</span>
        <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">
          {formatNumber(order.total)} د.ع
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          to="/contact"
          className="inline-flex items-center gap-1.5 rounded-xl bg-blush-surface px-4 py-2 font-label-md text-label-md text-imperial-burgundy"
        >
          <Icon name="support_agent" className="text-[18px]" /> استفسار عن الطلب
        </Link>
      </div>
    </div>
  );
}
