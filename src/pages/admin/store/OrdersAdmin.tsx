import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AdminPage, Button, Drawer, EmptyState, inputClass, OfflineNotice, ReadOnlyNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';
import { useAdminAuth } from '@/state/adminAuth';
import { useAdminOrders } from '@/state/adminOrders';
import { orderStatusLabels, paymentLabels, type Order, type OrderStatus } from '@/state/orders';
import { useToast } from '@/state/toast';

export const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-semantic-warning-bg text-semantic-warning',
  confirmed: 'bg-semantic-info-bg text-semantic-info',
  preparing: 'bg-semantic-info-bg text-semantic-info',
  shipped: 'bg-champagne-gold/40 text-antique-gold',
  delivered: 'bg-semantic-success-bg text-semantic-success',
  cancelled: 'bg-surface-container-high text-muted-rosewood',
  returned: 'bg-semantic-error-bg text-semantic-error',
};

const FILTERS: Array<{ id: 'all' | OrderStatus; label: string }> = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'جديدة' },
  { id: 'confirmed', label: 'مؤكدة' },
  { id: 'preparing', label: 'قيد التجهيز' },
  { id: 'shipped', label: 'قيد الشحن' },
  { id: 'delivered', label: 'مُسلّمة' },
  { id: 'cancelled', label: 'ملغاة' },
];

const dateTime = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** واتساب برقم عراقي محلي (07…) */
const waLink = (phone: string, text: string) => `https://wa.me/964${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`;

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold', STATUS_TONE[status])}>
      {orderStatusLabels[status]}
    </span>
  );
}

/** طلبات المتجر الواردة من الزبائن: تصفية حسب الحالة، بحث، تفاصيل، وتغيير الحالة. */
export default function OrdersAdmin() {
  const { orders, loading, error, refresh } = useAdminOrders();
  const canEdit = useAdminAuth().can('orders', 'edit');
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | OrderStatus>('all');
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim();
    return orders.filter(
      (o) =>
        (filter === 'all' || o.status === filter) &&
        (!q || String(o.id).includes(q) || o.customer.name.includes(q) || o.customer.phone.includes(q)),
    );
  }, [orders, filter, query]);
  const open = orders.find((o) => String(o.id) === orderId) ?? null;

  return (
    <AdminPage
      title="الطلبات"
      subtitle="الطلبات المرسلة من المتجر. تتحدث القائمة تلقائياً كل دقيقة."
      actions={
        <Button variant="secondary" icon="refresh" busy={loading} onClick={() => void refresh()}>
          تحديث
        </Button>
      }
    >
      {error && <OfflineNotice message={error} />}
      {!canEdit && <ReadOnlyNotice />}

      <div className="mb-4 flex flex-col gap-3">
        <input
          className={inputClass}
          placeholder="ابحث برقم الطلب أو اسم الزبون أو الهاتف…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {FILTERS.map((f) => {
            const n = f.id === 'all' ? orders.length : orders.filter((o) => o.status === f.id).length;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'shrink-0 rounded-full px-4 py-1.5 font-label-md text-label-md',
                  filter === f.id ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-blush-surface text-warm-ink',
                )}
              >
                {f.label} <span className="opacity-70">({n})</span>
              </button>
            );
          })}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title={orders.length ? 'لا توجد طلبات مطابقة' : 'لا توجد طلبات بعد'}
          body={orders.length ? undefined : 'عندما يرسل زبون طلباً من المتجر سيظهر هنا فوراً.'}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => navigate(`/admin/orders/${o.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-surface-container-lowest p-3 text-right shadow-luxury hover:bg-blush-surface/40 md:p-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush-surface font-mono text-label-md font-bold text-imperial-burgundy">
                  #{o.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{o.customer.name}</span>
                    <StatusPill status={o.status} />
                  </span>
                  <span className="block truncate font-label-sm text-label-sm text-muted-rosewood">
                    {dateTime.format(new Date(o.createdAt))} · {o.delivery.governorate} · {o.lines.reduce((n, l) => n + l.qty, 0)} قطع
                  </span>
                </span>
                <span className="shrink-0 font-label-lg text-label-lg font-bold text-imperial-burgundy tabular-nums">
                  {formatNumber(o.total)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <OrderDrawer order={open} canEdit={canEdit} onClose={() => navigate('/admin/orders')} />
    </AdminPage>
  );
}

function OrderDrawer({ order, canEdit, onClose }: { order: Order | null; canEdit: boolean; onClose: () => void }) {
  const { setStatus } = useAdminOrders();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const change = async (status: OrderStatus) => {
    if (!order || status === order.status) return;
    setBusy(true);
    try {
      await setStatus(order.id, status);
      toast.show(`الطلب #${order.id}: ${orderStatusLabels[status]}`, 'check_circle');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر تحديث الحالة', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={!!order} title={order ? `الطلب #${order.id}` : ''} onClose={onClose}>
      {order && (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <StatusPill status={order.status} />
            <span className="font-label-sm text-label-sm text-muted-rosewood">{dateTime.format(new Date(order.createdAt))}</span>
          </div>

          <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="mb-2 font-label-lg text-label-lg text-antique-gold">الزبون</h3>
            <p className="font-headline-sm text-headline-sm text-deep-oxblood">{order.customer.name}</p>
            <p dir="ltr" className="text-right font-mono text-body-md text-warm-ink">
              {order.customer.phone}
            </p>
            {order.customer.email && (
              <p dir="ltr" className="text-right font-body-sm text-body-sm text-muted-rosewood">
                {order.customer.email}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`tel:${order.customer.phone}`}
                className="inline-flex items-center gap-1 rounded-lg bg-blush-surface px-3 py-1.5 font-label-md text-label-md text-imperial-burgundy"
              >
                <Icon name="call" className="text-[18px]" /> اتصال
              </a>
              <a
                href={waLink(order.customer.phone, `مرحباً ${order.customer.name}، بخصوص طلبك رقم #${order.id} من آيريس.`)}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 rounded-lg bg-semantic-success-bg px-3 py-1.5 font-label-md text-label-md text-semantic-success"
              >
                <Icon name="chat" className="text-[18px]" /> واتساب
              </a>
            </div>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="mb-2 font-label-lg text-label-lg text-antique-gold">التوصيل</h3>
            <p className="font-body-md text-body-md text-warm-ink">
              {[order.delivery.governorate, order.delivery.district, order.delivery.neighborhood].filter(Boolean).join(' — ')}
            </p>
            <p className="font-body-sm text-body-sm text-muted-rosewood">أقرب نقطة دالة: {order.delivery.landmark}</p>
            {order.delivery.details && <p className="font-body-sm text-body-sm text-muted-rosewood">{order.delivery.details}</p>}
            {order.delivery.notes && (
              <p className="mt-2 rounded-lg bg-parchment p-2 font-body-sm text-body-sm text-warm-ink">ملاحظة: {order.delivery.notes}</p>
            )}
            <p className="mt-2 font-label-md text-label-md text-warm-ink">الدفع: {paymentLabels[order.payment]}</p>
          </section>

          <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm">
            <h3 className="mb-3 font-label-lg text-label-lg text-antique-gold">القطع</h3>
            <ul className="flex flex-col gap-3">
              {order.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3">
                  <img src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-label-md text-label-md font-semibold text-deep-oxblood">{l.name}</span>
                    <span className="block font-label-sm text-label-sm text-muted-rosewood">
                      {[l.sku, l.options?.metal, l.options?.size].filter(Boolean).join(' · ')} · الكمية {l.qty}
                    </span>
                  </span>
                  <span className="font-label-md text-label-md tabular-nums">{formatNumber(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 flex flex-col gap-1 border-t border-hairline-burgundy pt-3 font-body-sm text-body-sm">
              <div className="flex justify-between">
                <dt>المجموع</dt>
                <dd className="tabular-nums">{formatNumber(order.subtotal)} د.ع</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-antique-gold">
                  <dt>خصم {order.couponCode}</dt>
                  <dd className="tabular-nums">-{formatNumber(order.discount)} د.ع</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt>التوصيل</dt>
                <dd className="tabular-nums">{order.shipping ? `${formatNumber(order.shipping)} د.ع` : 'مجاني'}</dd>
              </div>
              <div className="flex justify-between font-label-lg text-label-lg font-bold text-imperial-burgundy">
                <dt>الإجمالي</dt>
                <dd className="tabular-nums">{formatNumber(order.total)} د.ع</dd>
              </div>
            </dl>
          </section>

          <section hidden={!canEdit}>
            <h3 className="mb-2 font-label-lg text-label-lg text-antique-gold">تغيير الحالة</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(orderStatusLabels) as OrderStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() => void change(s)}
                  className={cn(
                    'rounded-xl px-3 py-2.5 font-label-md text-label-md transition-colors disabled:opacity-50',
                    order.status === s
                      ? 'bg-imperial-burgundy text-ivory-canvas'
                      : 'bg-surface-container-lowest text-warm-ink shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)] hover:bg-blush-surface',
                  )}
                >
                  {orderStatusLabels[s]}
                </button>
              ))}
            </div>
            <p className="mt-2 font-label-sm text-label-sm text-muted-rosewood">الإلغاء أو الإرجاع يعيد الكمية إلى المخزون تلقائياً.</p>
          </section>
        </div>
      )}
    </Drawer>
  );
}
