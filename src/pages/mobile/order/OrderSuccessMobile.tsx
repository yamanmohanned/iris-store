import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppLink } from '@/components/common/WhatsAppLink';
import { MOBILE_BTN_PRIMARY, MOBILE_BTN_SECONDARY, MOBILE_CARD, MobilePage } from '@/components/mobile/MobilePage';
import { useRouteOrder } from '@/hooks/useRouteOrder';
import { cn } from '@/lib/cn';
import { formatNumber, piecesCount } from '@/lib/format';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { orderStatusLabels, paymentLabels } from '@/state/orders';
import { useToast } from '@/state/toast';

/** تأكيد الطلب على الهاتف (`/order-success/:orderId`): رقم الطلب، ما يحدث بعده، والملخص. */
export default function OrderSuccessMobile() {
  const order = useRouteOrder();
  const toast = useToast();
  if (!order) return <NotFoundPage />;
  const pieces = order.lines.reduce((n, l) => n + l.qty, 0);

  const copyId = () => {
    void navigator.clipboard?.writeText(String(order.id)).catch(() => undefined);
    toast.show('تم نسخ رقم الطلب', 'content_copy');
  };

  return (
    <MobilePage title="تم استلام طلبكِ">
      <section className="flex flex-col items-center pb-6 pt-2 text-center">
        <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blush-surface to-parchment text-royal-gold shadow-[0_0_0_6px_rgba(201,162,75,0.12),0_10px_24px_rgba(42,3,13,0.08)]">
          <Icon name="verified" fill className="text-[40px]" />
        </span>
        <h1 className="font-headline-md text-headline-md font-semibold text-deep-oxblood">شكراً لثقتكِ بنا</h1>
        <p className="mt-1.5 max-w-[300px] font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
          سنتصل بكِ قريباً لتأكيد الطلب وموعد التوصيل.
        </p>
        <button
          type="button"
          onClick={copyId}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface-container-lowest px-4 py-2 shadow-[0_0_0_1px_rgba(78,24,37,0.12)]"
        >
          <span className="font-label-md text-label-md text-muted-rosewood">رقم الطلب</span>
          <span className="font-label-lg text-label-lg font-bold text-deep-oxblood tabular-nums">#{order.id}</span>
          <Icon name="content_copy" className="text-[16px] text-antique-gold" />
        </button>
        <span className="mt-2.5 rounded-full bg-semantic-warning-bg px-3 py-0.5 font-label-sm text-label-sm font-semibold text-semantic-warning">
          {orderStatusLabels[order.status]}
        </span>
      </section>

      <section className={cn(MOBILE_CARD, 'flex flex-col gap-3')}>
        <div className="flex items-center justify-between">
          <h2 className="font-label-lg text-label-lg font-semibold text-deep-oxblood">تفاصيل الطلب</h2>
          <span className="font-label-md text-label-md text-muted-rosewood">{piecesCount(pieces)}</span>
        </div>
        {order.lines.map((l) => (
          <div key={l.productId + (l.options?.size ?? '') + (l.options?.metal ?? '')} className="flex items-center gap-3">
            <img src={l.image} alt={l.name} className="h-14 w-14 shrink-0 rounded-xl bg-parchment object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{l.name}</p>
              <p className="truncate font-label-md text-label-md text-muted-rosewood">
                {[l.options?.metal, l.options?.size && `المقاس ${l.options.size}`, `الكمية ${l.qty}`].filter(Boolean).join(' · ')}
              </p>
            </div>
            <span className="shrink-0 font-label-lg text-label-lg font-bold text-imperial-burgundy tabular-nums">{formatNumber(l.price * l.qty)}</span>
          </div>
        ))}

        <div className="mt-1 flex flex-col gap-2 border-t border-hairline-burgundy pt-3 font-body-sm text-body-sm">
          <Row icon="location_on" label="عنوان التوصيل">
            {[order.delivery.governorate, order.delivery.district, order.delivery.neighborhood].filter(Boolean).join('، ')}
          </Row>
          <Row icon="payments" label="طريقة الدفع">
            {paymentLabels[order.payment]}
          </Row>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-hairline-burgundy pt-3 font-body-sm text-body-sm">
          <div className="flex justify-between text-muted-rosewood">
            <span>المجموع</span>
            <span className="tabular-nums text-warm-ink">{formatNumber(order.subtotal)} د.ع</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-semantic-success">
              <span>الخصم</span>
              <span className="tabular-nums">−{formatNumber(order.discount)} د.ع</span>
            </div>
          )}
          <div className="flex justify-between text-muted-rosewood">
            <span>التوصيل</span>
            <span className="tabular-nums text-warm-ink">{order.shipping === 0 ? 'مجاني' : `${formatNumber(order.shipping)} د.ع`}</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-label-lg text-label-lg font-bold text-deep-oxblood">{order.payment === 'cod' ? 'المستحق عند الاستلام' : 'الإجمالي'}</span>
            <span className="font-headline-sm text-headline-sm font-bold text-imperial-burgundy tabular-nums">{formatNumber(order.total)} د.ع</span>
          </div>
        </div>
      </section>

      <p className="mt-4 flex items-start gap-2 rounded-xl bg-parchment px-3.5 py-3 font-label-md text-label-md leading-relaxed text-warm-ink">
        <Icon name="visibility" className="mt-0.5 text-[18px] text-antique-gold" />
        يمكنكِ معاينة القطعة مع المندوب قبل الدفع.
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        <Link to={`/track-order?order=${order.id}`} className={MOBILE_BTN_PRIMARY}>
          <Icon name="local_shipping" className="text-[20px] text-champagne-gold" />
          تتبع الطلب
        </Link>
        <WhatsAppLink text={`مرحباً دار آيريس، استفسار عن الطلب رقم ${order.id}`} className={MOBILE_BTN_SECONDARY}>
          <Icon name="chat" className="text-[20px]" />
          تواصلي معنا
        </WhatsAppLink>
        <Link to="/" className="mt-1 py-2 text-center font-label-md text-label-md text-muted-rosewood">
          متابعة التسوق
        </Link>
      </div>
    </MobilePage>
  );
}

function Row({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} className="mt-0.5 text-[18px] text-antique-gold" />
      <div className="min-w-0">
        <span className="block font-label-sm text-label-sm text-muted-rosewood">{label}</span>
        <span className="font-label-lg text-label-lg font-medium text-warm-ink">{children}</span>
      </div>
    </div>
  );
}
