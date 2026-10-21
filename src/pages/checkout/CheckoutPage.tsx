import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { formatNumber, piecesCount } from '@/lib/format';
import { useAuth } from '@/state/auth';
import { useCart } from '@/state/cart';
import { GOVERNORATES, isValidIraqiPhone, useCheckout } from '@/state/checkout';
import { useOrders, paymentLabels, type PaymentMethod } from '@/state/orders';
import { useToast } from '@/state/toast';

export type CheckoutStep = 'contact' | 'delivery' | 'payment' | 'review';

const STEPS: Array<{ id: CheckoutStep; label: string; path: string }> = [
  { id: 'contact', label: 'الاتصال', path: '/checkout' },
  { id: 'delivery', label: 'التوصيل', path: '/checkout/delivery' },
  { id: 'payment', label: 'الدفع', path: '/checkout/payment' },
  { id: 'review', label: 'المراجعة', path: '/checkout/review' },
];

const STEP_TITLES: Record<CheckoutStep, string> = {
  contact: 'بيانات الاتصال',
  delivery: 'عنوان التوصيل',
  payment: 'طريقة الدفع',
  review: 'مراجعة الطلب',
};

const CTA: Record<CheckoutStep, string> = {
  contact: 'متابعة إلى التوصيل',
  delivery: 'متابعة إلى الدفع',
  payment: 'متابعة إلى المراجعة',
  review: 'تأكيد الطلب',
};

/* ───────────── عناصر مشتركة ───────────── */

const inputCls =
  'w-full h-12 rounded-lg bg-surface-container-lowest px-4 font-body-md text-body-md text-warm-ink shadow-sm outline-none transition-all placeholder:text-muted-rosewood/50 focus:bg-white focus:ring-2 focus:ring-imperial-burgundy/25';

function Field({ label, required, hint, error, children, htmlFor }: { label: string; required?: boolean; hint?: string; error?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="flex items-center justify-between font-label-lg text-label-lg text-warm-ink">
        <span className="font-medium">{label}</span>
        {required ? <span className="font-label-sm text-label-sm text-imperial-burgundy">مطلوب *</span> : <span className="rounded-full bg-champagne-gold/20 px-2 py-0.5 font-label-sm text-label-sm text-antique-gold">اختياري</span>}
      </label>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 font-body-sm text-body-sm leading-tight text-semantic-error">
          <Icon name="info" className="mt-0.5 shrink-0 text-[16px]" />
          <span>{error}</span>
        </p>
      ) : (
        hint && <p className="font-label-sm text-label-sm text-muted-rosewood">{hint}</p>
      )}
    </div>
  );
}

function Stepper({ current }: { current: CheckoutStep }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="relative flex w-full items-center justify-between">
      <div className="absolute inset-x-6 top-3 z-0 h-px bg-rose-mist" />
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="z-10 flex flex-col items-center gap-1">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full',
                done && 'bg-imperial-burgundy text-champagne-gold shadow-[0_2px_6px_rgba(78,24,37,0.25)]',
                active && 'bg-royal-gold text-wine-night shadow-[0_2px_6px_rgba(201,162,75,0.2)]',
                !done && !active && 'bg-blush-surface text-muted-rosewood',
              )}
            >
              {done ? <Icon name="check" className="text-[14px]" /> : <span className={cn('rounded-full', active ? 'h-2 w-2 bg-wine-night' : 'h-1.5 w-1.5 bg-muted-rosewood/60')} />}
            </div>
            <span className={cn('font-label-sm text-label-sm', done ? 'font-medium text-imperial-burgundy' : active ? 'font-medium text-warm-ink' : 'text-muted-rosewood')}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── محتوى الخطوات ───────────── */

function ContactStep({ errors }: { errors: Record<string, string> }) {
  const { draft, setContact } = useCheckout();
  const c = draft.contact;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-1">
        <h2 className="font-headline-md text-headline-md font-semibold tracking-tight text-wine-night">بيانات الاتصال</h2>
        <p className="font-body-sm text-body-sm leading-relaxed text-muted-rosewood">نستخدم رقمكِ للتواصل بشأن التوصيل فقط.</p>
      </div>

      <Field label="الاسم الكامل" required htmlFor="full-name" error={errors.name}>
        <div className="relative w-full">
          <input id="full-name" name="full_name" autoComplete="name" value={c.name} onChange={(e) => setContact({ name: e.target.value })} placeholder="الاسم الثلاثي للمستلم" className={cn(inputCls, errors.name && 'ring-2 ring-semantic-error/40')} />
          <Icon name="badge" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted-rosewood" />
        </div>
      </Field>

      <Field label="رقم الهاتف" required htmlFor="phone-number" error={errors.phone} hint="يتصل بكِ المندوب قبل الوصول.">
        <div className="flex w-full items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              id="phone-number"
              name="phone_number"
              type="tel"
              inputMode="tel"
              dir="ltr"
              autoComplete="tel"
              value={c.phone}
              onChange={(e) => setContact({ phone: e.target.value })}
              placeholder="0770 123 4567"
              className={cn(inputCls, 'text-left', errors.phone && 'ring-2 ring-semantic-error/40')}
            />
            <Icon name="smartphone" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[20px] text-muted-rosewood" />
          </div>
        </div>
      </Field>

      <label className="flex cursor-pointer select-none items-start gap-3 rounded-xl bg-blush-surface/70 p-3.5 transition-colors">
        <input type="checkbox" checked={c.whatsapp} onChange={(e) => setContact({ whatsapp: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 rounded accent-imperial-burgundy" />
        <div className="flex flex-col text-right">
          <span className="flex items-center gap-1.5 font-label-md text-label-md font-semibold text-deep-oxblood">
            يمكنكم مراسلتي على واتساب بنفس الرقم
          </span>
          <span className="mt-0.5 font-body-sm text-body-sm text-muted-rosewood">لتأكيد الطلب وموعد التوصيل.</span>
        </div>
      </label>

      <Field label="البريد الإلكتروني" htmlFor="email-address" error={errors.email}>
        <div className="relative w-full">
          <input id="email-address" name="email_address" type="email" autoComplete="email" value={c.email} onChange={(e) => setContact({ email: e.target.value })} placeholder="name@example.com" className={inputCls} />
          <Icon name="mail" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-muted-rosewood" />
        </div>
      </Field>

      <div className="flex items-center gap-3 rounded-xl bg-surface-container-high/60 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-antique-gold shadow-xs">
          <Icon name="verified_user" className="text-[18px]" />
        </div>
        <p className="font-label-sm text-label-sm leading-relaxed text-warm-ink">بياناتكِ تُستخدم لتوصيل الطلب فقط ولا نشاركها مع أي جهة.</p>
      </div>
    </div>
  );
}

function DeliveryStep({ errors }: { errors: Record<string, string> }) {
  const { draft, setDelivery } = useCheckout();
  const d = draft.delivery;
  // نفس الأجور المحسوبة في السلة وعلى الخادم (إعدادات المالك)، لا رقم ثابت حسب المحافظة
  const { shipping } = useCart();
  const field = (key: keyof typeof d, props: { id: string; placeholder: string; icon: string; label: string; required?: boolean; error?: string }) => (
    <Field label={props.label} required={props.required} htmlFor={props.id} error={props.error}>
      <div className="relative w-full">
        <input
          id={props.id}
          value={d[key]}
          onChange={(e) => setDelivery({ [key]: e.target.value })}
          placeholder={props.placeholder}
          aria-invalid={!!props.error}
          className={cn(inputCls, 'pl-11', props.error && 'bg-semantic-error-bg text-semantic-error ring-2 ring-semantic-error/40')}
        />
        <Icon name={props.error ? 'error' : props.icon} fill={!!props.error} className={cn('pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px]', props.error ? 'text-semantic-error' : 'text-antique-gold/60')} />
      </div>
    </Field>
  );
  return (
    <div className="flex flex-col gap-y-space-md">
      <section className="flex flex-col gap-y-space-md">
        <div className="flex flex-col items-start gap-1">
          <h2 className="font-headline-md text-headline-md font-semibold tracking-tight text-wine-night">عنوان التوصيل</h2>
          <p className="font-body-sm text-body-sm text-muted-rosewood">نوصل إلى جميع المحافظات خلال 1–4 أيام عمل.</p>
        </div>
        <div className="flex w-full items-center justify-between gap-space-sm rounded-xl bg-parchment p-space-sm shadow-[0_4px_16px_rgba(42,3,13,0.03)]">
          <div className="flex min-w-0 items-center gap-space-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-deep-oxblood text-champagne-gold shadow-sm">
              <Icon name="local_shipping" fill className="text-[20px]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-label-md text-label-md font-semibold text-wine-night">التوصيل</span>
              </div>
              <span className="truncate font-body-sm text-body-sm text-muted-rosewood">{shipping === 0 ? 'التوصيل مجاني لهذا الطلب' : `رسوم التوصيل ${formatNumber(shipping)} د.ع`} · خلال 1–4 أيام عمل</span>
            </div>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ivory-canvas text-royal-gold shadow-sm">
            <Icon name="verified" className="text-[16px]" />
          </div>
        </div>
      </section>

      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor="governorate-select" className="flex items-center justify-between font-label-md text-label-md text-warm-ink">
          <span>المحافظة</span>
        </label>
        <div className="relative w-full">
          <select
            id="governorate-select"
            value={d.governorate}
            onChange={(e) => setDelivery({ governorate: e.target.value })}
            className="h-12 w-full cursor-pointer appearance-none rounded-xl border-0 bg-surface-container-lowest px-4 pl-11 font-body-md text-body-md text-warm-ink shadow-[0_2px_8px_rgba(42,3,13,0.03)] focus:bg-blush-surface focus:outline-none"
          >
            {GOVERNORATES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <Icon name="expand_more" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-muted-rosewood" />
        </div>
      </div>

      {field('district', { id: 'district-field', label: 'المدينة أو القضاء', required: true, placeholder: 'أدخل القضاء أو المنطقة', icon: 'location_city', error: errors.district })}
      {field('neighborhood', { id: 'neighborhood-field', label: 'الحي أو المنطقة', placeholder: 'رقم المحلة، الزقاق، أو الشارع الرئيسي', icon: 'signpost' })}
      {field('landmark', { id: 'landmark-field', label: 'أقرب نقطة دالة', required: true, placeholder: 'مثال: قرب جامع أو مدرسة معروفة', icon: 'pin_drop', error: errors.landmark })}
      {field('details', { id: 'building-details-field', label: 'تفاصيل إضافية للعنوان', placeholder: 'رقم المبنى، الطابق، أو الجناح', icon: 'home' })}

      <div className="flex w-full flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="delivery-notes" className="font-label-md text-label-md text-warm-ink">
            ملاحظات للتوصيل
          </label>
          <span className="font-label-sm text-label-sm text-muted-rosewood">اختياري</span>
        </div>
        <textarea
          id="delivery-notes"
          rows={3}
          value={d.notes}
          onChange={(e) => setDelivery({ notes: e.target.value })}
          placeholder="مثال: يرجى الاتصال قبل الوصول، أو تغليف كهدية"
          className="w-full resize-none rounded-xl border-0 bg-surface-container-lowest p-3.5 font-body-md text-body-md text-warm-ink shadow-[0_2px_8px_rgba(42,3,13,0.03)] focus:bg-blush-surface focus:outline-none"
        />
      </div>

    </div>
  );
}

const PAYMENT_OPTIONS: Array<{ id: PaymentMethod; title: string; note: string; icon: string; badge?: string; soon?: boolean }> = [
  { id: 'cod', title: 'الدفع عند الاستلام', note: 'ادفعي نقداً عند استلام الطلب بعد معاينة القطعة.', icon: 'payments', badge: 'متاح' },
  // لا توجد بوابة دفع إلكتروني مربوطة بعد — الخياران يظهران «قريباً» بدل وعد بتحويل لا يحدث
  { id: 'zaincash', title: 'زين كاش', note: 'الدفع عبر المحفظة الإلكترونية — قريباً.', icon: 'account_balance_wallet', soon: true },
  { id: 'card', title: 'بطاقة مصرفية', note: 'فيزا وماستركارد — قريباً.', icon: 'credit_card', soon: true },
];

function PaymentStep() {
  const { draft, setPayment } = useCheckout();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-1">
        <h2 className="font-headline-md text-headline-md font-semibold tracking-tight text-wine-night">طريقة الدفع</h2>
        <p className="font-body-sm text-body-sm leading-relaxed text-muted-rosewood">حالياً الدفع نقداً عند الاستلام في جميع المحافظات.</p>
      </div>

      <div role="radiogroup" aria-label="طريقة الدفع" className="flex flex-col gap-3">
        {PAYMENT_OPTIONS.map((o) => {
          const on = draft.payment === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={o.soon}
              onClick={() => !o.soon && setPayment(o.id)}
              className={cn(
                'relative flex w-full flex-col gap-2 overflow-hidden rounded-xl p-space-md text-right shadow-sm transition-all',
                on ? 'bg-blush-surface shadow-[0_6px_20px_rgba(78,24,37,0.12)] ring-2 ring-imperial-burgundy' : 'bg-surface-container-low',
                o.soon ? 'cursor-not-allowed opacity-60' : !on && 'hover:bg-blush-surface/60',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-oxblood text-champagne-gold shadow-md">
                    <Icon name={o.icon} className="text-[22px]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md font-bold text-wine-night">{o.title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(o.badge || o.soon) && (
                    <span className={cn('rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-semibold', o.soon ? 'bg-surface-container-high text-muted-rosewood' : 'bg-semantic-success-bg text-semantic-success')}>
                      {o.soon ? 'قريباً' : o.badge}
                    </span>
                  )}
                  <span className={cn('flex h-5 w-5 items-center justify-center rounded-full border-2', on ? 'border-imperial-burgundy' : 'border-outline-variant')}>
                    {on && <span className="h-2.5 w-2.5 rounded-full bg-imperial-burgundy" />}
                  </span>
                </div>
              </div>
              <p className="rounded-lg bg-surface-container-lowest/80 p-space-sm font-body-sm text-body-sm leading-relaxed text-on-surface-variant">{o.note}</p>
            </button>
          );
        })}
      </div>

    </div>
  );
}

function ReviewStep() {
  const { draft, setAcceptTerms } = useCheckout();
  const cart = useCart();
  const lines = cart.items.filter((i) => i.available);
  const d = draft.delivery;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-1">
        <h2 className="font-headline-md text-headline-md font-semibold tracking-tight text-wine-night">مراجعة الطلب</h2>
        <p className="font-body-sm text-body-sm leading-relaxed text-muted-rosewood">تأكدي من البيانات ثم اضغطي «تأكيد الطلب».</p>
      </div>

      <section className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-sm">
        <div className="pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full bg-royal-gold/10 blur-xl" />
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-deep-oxblood text-champagne-gold shadow-md">
              <Icon name="payments" className="text-[22px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md font-bold text-wine-night">{paymentLabels[draft.payment]}</span>
              <span className="font-label-sm text-label-sm text-antique-gold">{draft.payment === 'cod' ? 'نقداً بعد معاينة القطعة' : 'دفع إلكتروني'}</span>
            </div>
          </div>
          <Link to="/checkout/payment" className="rounded bg-blush-surface/70 px-2 py-1 font-label-sm text-label-sm font-semibold text-imperial-burgundy transition-colors hover:bg-blush-surface">
            تعديل
          </Link>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
              <Icon name="location_on" className="text-[18px]" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="font-label-sm text-label-sm text-muted-rosewood">عنوان التوصيل</span>
              <span className="font-label-md text-label-md font-semibold text-warm-ink">
                {d.governorate}
                {d.district ? ` — ${d.district}` : ''}
                {d.neighborhood ? `، ${d.neighborhood}` : ''}
              </span>
              {d.landmark && <span className="font-label-sm text-label-sm text-muted-rosewood">قرب: {d.landmark}</span>}
            </div>
          </div>
          <Link to="/checkout/delivery" className="rounded bg-blush-surface/70 px-2 py-1 font-label-sm text-label-sm font-semibold text-imperial-burgundy transition-colors hover:bg-blush-surface">
            تعديل
          </Link>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
        <div className="mb-3 flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Icon name="inventory_2" className="text-[20px] text-imperial-burgundy" />
            <h3 className="font-headline-sm text-headline-sm font-medium text-wine-night">القطع</h3>
          </div>
          <span className="rounded-full bg-surface-container px-2 py-0.5 font-label-sm text-label-sm text-muted-rosewood">{piecesCount(cart.count)}</span>
        </div>
        <div className="flex flex-col gap-3.5">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-3">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container">
                <img className="h-full w-full object-cover" src={l.product.image} alt={l.product.shortName} />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-1">
                  <h4 className="truncate font-label-md text-label-md font-bold text-wine-night">{l.product.shortName}</h4>
                  <span className="whitespace-nowrap font-label-md text-label-md font-bold text-imperial-burgundy tabular-nums">{formatNumber(l.lineTotal)} د.ع</span>
                </div>
                <span className="font-label-sm text-label-sm text-muted-rosewood">رمز: {l.product.sku} • {l.options?.metal ?? l.product.metal}</span>
                <div className="mt-1 flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
                  {l.options?.size && (
                    <>
                      <span>المقاس: {l.options.size}</span> <span className="h-1 w-1 rounded-full bg-rose-mist" />
                    </>
                  )}
                  <span>الكمية: {l.qty}</span>
                </div>
              </div>
            </div>
          ))}
          <div className="h-px w-full bg-surface-container-high" />
          <div className="flex items-center gap-3 rounded-lg bg-blush-surface/70 p-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-champagne-gold/40 text-wine-night">
              <Icon name="redeem" fill className="text-[20px]" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-label-sm text-label-sm font-semibold text-wine-night">التغليف في علبة الدار</span>
              <span className="font-label-sm text-label-sm text-antique-gold">مع كل قطعة</span>
            </div>
            <span className="whitespace-nowrap rounded-full bg-semantic-success-bg px-2 py-0.5 font-label-sm text-label-sm font-bold text-semantic-success">مجاناً</span>
          </div>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Icon name="receipt_long" className="text-[18px] text-antique-gold" />
          <h3 className="font-headline-sm text-headline-sm font-medium text-wine-night">ملخص الدفع</h3>
        </div>
        <div className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant">
          <div className="flex items-center justify-between">
            <span>المجموع</span> <span className="font-medium text-warm-ink tabular-nums">{formatNumber(cart.subtotal)} د.ع</span>
          </div>
          {cart.discount > 0 && (
            <div className="flex items-center justify-between text-antique-gold">
              <span>خصم القسيمة ({cart.coupon?.code})</span> <span className="font-medium tabular-nums">-{formatNumber(cart.discount)} د.ع</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span>التوصيل</span>
            </div>
            <span className="font-medium text-warm-ink tabular-nums">{cart.shipping === 0 ? 'مجاناً' : `${formatNumber(cart.shipping)} د.ع`}</span>
          </div>
        </div>
        <div className="relative my-1 flex flex-col items-center justify-center py-3.5">
          <div className="flex w-full flex-col gap-[3px]">
            <div className="h-px w-full bg-royal-gold/40" />
            <div className="h-px w-full bg-royal-gold/40" />
          </div>
          <div className="absolute flex items-center justify-center bg-surface-container-low px-2 text-royal-gold">
            <span className="text-[10px] leading-none">◆</span>
          </div>
        </div>
        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-bold text-wine-night">المبلغ المستحق {draft.payment === 'cod' ? 'عند الاستلام' : 'الآن'}</span>
            <span className="font-label-sm text-label-sm text-muted-rosewood">شامل التوصيل</span>
          </div>
          <span className="font-headline-md text-headline-md font-bold text-imperial-burgundy tabular-nums">
            {formatNumber(cart.total)} <span className="font-body-sm text-body-sm">د.ع</span>
          </span>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest/80 p-space-md shadow-sm">
        <label className="flex cursor-pointer select-none items-start gap-3">
          <input type="checkbox" checked={draft.acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 cursor-pointer rounded accent-imperial-burgundy" />
          <span className="font-body-sm text-body-sm leading-relaxed text-warm-ink">
            أوافق على{' '}
            <Link
              to="/policies/shipping"
              state={{ from: window.location.pathname }}
              className="font-medium text-imperial-burgundy underline decoration-royal-gold underline-offset-4"
            >
              سياسة الشحن والاستبدال
            </Link>
            .
          </span>
        </label>
      </section>

      <div className="mb-2 grid grid-cols-3 gap-2 text-center">
        {[
          ['local_shipping', 'توصيل لكل المحافظات'],
          ['published_with_changes', 'استبدال 7 أيام'],
          ['visibility', 'معاينة قبل الدفع'],
        ].map(([icon, label]) => (
          <div key={label} className="flex flex-col items-center justify-center gap-1 rounded-lg bg-surface-container p-2">
            <Icon name={icon} className="text-[20px] text-antique-gold" />
            <span className="font-label-sm text-label-sm font-semibold text-wine-night">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────── الصفحة ───────────── */

/** مسار الدفع: contact → delivery → payment → review. موبايل بإطار التصميم، وديسكتوب بعمودين. */
export default function CheckoutPage({ step }: { step: CheckoutStep }) {
  const cart = useCart();
  const checkout = useCheckout();
  // الدفع الإلكتروني غير مفعّل بعد: مسودة قديمة محفوظة بطريقة أخرى تعود للدفع عند الاستلام
  const { draft: savedDraft, setPayment: resetPayment } = checkout;
  useEffect(() => {
    if (savedDraft.payment !== 'cod') resetPayment('cod');
  }, [savedDraft.payment, resetPayment]);
  const orders = useOrders();
  const toast = useToast();
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const { user } = useAuth();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const placed = useRef(false);
  const idx = STEPS.findIndex((s) => s.id === step);
  const active = cart.items.filter((i) => i.available);
  const draft = checkout.draft;

  // تعبئة تلقائية من حساب العميل عند أول دخول
  const { setContact } = checkout;
  useEffect(() => {
    if (user && !draft.contact.name && !draft.contact.phone) setContact({ name: user.name, phone: user.phone });
  }, [user, draft.contact.name, draft.contact.phone, setContact]);

  if (active.length === 0) return placed.current ? null : <Navigate to="/cart" replace />;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (step === 'contact') {
      if (draft.contact.name.trim().length < 3) next.name = 'يرجى إدخال الاسم الكامل للمستلم.';
      if (!isValidIraqiPhone(draft.contact.phone)) next.phone = 'يرجى إدخال رقم هاتف عراقي صحيح (مثال: 0770 123 4567).';
      if (draft.contact.email && !/^\S+@\S+\.\S+$/.test(draft.contact.email)) next.email = 'صيغة البريد الإلكتروني غير صحيحة.';
    }
    if (step === 'delivery') {
      if (!draft.delivery.district.trim()) next.district = 'يرجى إدخال المدينة أو القضاء.';
      if (!draft.delivery.landmark.trim()) next.landmark = 'يرجى كتابة نقطة دالة واضحة لتسهيل وصول المندوب (مثال: قرب جامع أو مدرسة معروفة).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goBack = () => (idx > 0 ? navigate(STEPS[idx - 1].path) : navigate('/cart'));

  const onContinue = async () => {
    if (!validate()) return;
    if (step !== 'review') {
      navigate(STEPS[idx + 1].path);
      return;
    }
    if (!draft.acceptTerms) {
      toast.show('يرجى الموافقة على سياسة الشحن والاسترجاع', 'error');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const order = await orders.placeOrder({
        customer: { name: draft.contact.name.trim(), phone: draft.contact.phone.trim(), email: draft.contact.email.trim() || undefined },
        delivery: { ...draft.delivery },
        payment: draft.payment,
        lines: active.map((l) => ({ productId: l.product.id, qty: l.qty, options: l.options })),
        couponCode: cart.coupon?.code,
      });
      placed.current = true;
      cart.clear();
      cart.removeCoupon();
      checkout.setAcceptTerms(true);
      toast.show(`تم استلام طلبك #${order.id} بنجاح`, 'verified');
      navigate(`/order-success/${order.id}`, { replace: true });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر إرسال الطلب، حاول مجدداً.', 'error');
      setBusy(false);
    }
  };

  const body =
    step === 'contact' ? <ContactStep errors={errors} /> : step === 'delivery' ? <DeliveryStep errors={errors} /> : step === 'payment' ? <PaymentStep /> : <ReviewStep />;

  const totalLabel = step === 'review' ? (draft.payment === 'cod' ? 'المستحق عند الاستلام' : 'الإجمالي') : step === 'delivery' || step === 'payment' ? 'المجموع مع الشحن' : 'الإجمالي التقديري';

  if (mobile) {
    return (
      <div className="flex flex-col bg-ivory-canvas text-warm-ink selection:bg-rose-mist selection:text-wine-night">
        <MobileTopBar back onBack={goBack} title={STEP_TITLES[step]} end={false} />
        <div className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 bg-ivory-canvas/95 px-6 pb-3 pt-2 shadow-[0_6px_16px_-8px_rgba(42,3,13,0.12)] backdrop-blur-xl">
          <Stepper current={step} />
        </div>
        <main className="pb-safe relative flex min-h-screen w-full flex-col px-margin-mobile pt-[calc(8rem+env(safe-area-inset-top,0px))]">
          <div className="flex w-full flex-col pb-32">{body}</div>
        </main>
        <div className="pb-safe fixed bottom-0 left-0 right-0 z-40 bg-ivory-canvas/95 shadow-[0_-4px_24px_rgba(42,3,13,0.06)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-margin-mobile py-3.5">
            <div className="flex flex-col text-right">
              <span className="font-label-sm text-label-sm text-muted-rosewood">{totalLabel}</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-headline-md font-bold tracking-tight text-imperial-burgundy tabular-nums">{formatNumber(cart.total)}</span>
                <span className="font-label-sm text-label-sm font-medium text-antique-gold">د.ع</span>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onContinue()}
              className="relative flex h-12 max-w-[200px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-imperial-burgundy font-label-lg text-label-lg font-medium text-ivory-canvas shadow-[0_4px_16px_rgba(78,24,37,0.3)] transition-all hover:bg-burgundy-600 active:translate-y-px disabled:opacity-60"
            >
              {step === 'review' && <Icon name="lock" className="text-[18px] text-champagne-gold" />}
              <span>{CTA[step]}</span>
              <Icon name="arrow_back" className="text-[18px] text-champagne-gold" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // الديسكتوب: عمودان (الخطوة + ملخص الطلب)
  return (
    <main className="min-h-[calc(100vh-20rem)] w-full">
      <div className="mx-auto w-full max-w-[1120px] px-6 py-10 lg:py-14">
        <nav aria-label="مسار التصفح" className="mb-6 flex items-center gap-space-xs text-muted-rosewood">
          <Link to="/" className="font-body-sm text-body-sm hover:text-imperial-burgundy">
            الرئيسية
          </Link>
          <Icon name="chevron_left" className="text-[14px] text-royal-gold/70" />
          <Link to="/cart" className="font-body-sm text-body-sm hover:text-imperial-burgundy">
            سلة التسوق
          </Link>
          <Icon name="chevron_left" className="text-[14px] text-royal-gold/70" />
          <span className="font-body-sm text-body-sm font-medium text-imperial-burgundy">إتمام الطلب</span>
        </nav>
        <h1 className="mb-6 font-display-lg text-headline-xl font-bold text-deep-oxblood">إتمام الطلب</h1>

        <div className="mb-8 rounded-2xl bg-surface-container-lowest p-6 shadow-sm">
          <Stepper current={step} />
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
          <section className="rounded-[20px] bg-surface-container-lowest p-6 shadow-[0_8px_30px_rgba(42,3,13,0.06)] lg:col-span-7 lg:p-8">
            {body}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline-burgundy pt-6">
              <button type="button" onClick={goBack} className="flex items-center gap-2 font-label-lg text-label-lg text-muted-rosewood transition-colors hover:text-imperial-burgundy">
                <Icon name="arrow_forward" className="text-[18px]" />
                {idx > 0 ? 'الخطوة السابقة' : 'العودة إلى السلة'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onContinue()}
                className="group relative flex h-12 min-w-[220px] items-center justify-center gap-2 overflow-hidden rounded-xl bg-imperial-burgundy px-6 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_10px_24px_rgba(78,24,37,0.28)] transition-all hover:bg-burgundy-600 active:translate-y-px disabled:opacity-60"
              >
                <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_rgba(201,162,75,0.4)]" />
                {step === 'review' && <Icon name="lock" className="text-[18px] text-champagne-gold" />}
                <span>{CTA[step]}</span>
                <Icon name="arrow_back" className="text-[18px] text-champagne-gold transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </section>

          <aside className="sticky top-28 flex flex-col gap-5 lg:col-span-5">
            <div className="rounded-[20px] bg-surface-container-lowest p-6 shadow-[0_12px_40px_rgba(42,3,13,0.08)]">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-space-xs">
                  <span className="text-[10px] text-royal-gold">◆</span>
                  <h2 className="font-headline-md text-headline-md font-bold text-deep-oxblood">ملخص الطلب</h2>
                </div>
                <Link to="/cart" className="font-label-sm text-label-sm text-imperial-burgundy hover:underline">
                  تعديل السلة
                </Link>
              </div>
              <div className="flex flex-col gap-3 border-y border-rose-mist/50 py-4">
                {active.map((l) => (
                  <div key={l.key} className="flex items-center gap-3">
                    <img src={l.product.image} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover shadow-[0_0_0_1px_rgba(201,162,75,0.35)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-label-md text-label-md font-semibold text-deep-oxblood">{l.product.shortName}</p>
                      <p className="font-label-sm text-label-sm text-muted-rosewood">الكمية: {l.qty}</p>
                    </div>
                    <span className="font-label-md text-label-md font-bold text-imperial-burgundy tabular-nums">{formatNumber(l.lineTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 py-4 font-body-sm text-body-sm text-on-surface-variant">
                <div className="flex justify-between">
                  <span>المجموع الفرعي</span> <span className="tabular-nums text-warm-ink">{formatNumber(cart.subtotal)} د.ع</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-antique-gold">
                    <span>خصم القسيمة ({cart.coupon?.code})</span> <span className="tabular-nums">-{formatNumber(cart.discount)} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>التوصيل</span> <span className="tabular-nums text-warm-ink">{cart.shipping === 0 ? 'مجاني' : `${formatNumber(cart.shipping)} د.ع`}</span>
                </div>
              </div>
              <div className="flex items-baseline justify-between border-t border-rose-mist/50 pt-4">
                <span className="font-headline-sm text-headline-sm font-bold text-deep-oxblood">{totalLabel}</span>
                <span className="whitespace-nowrap font-mono text-[1.5rem] font-bold text-imperial-burgundy tabular-nums">{formatNumber(cart.total)} د.ع</span>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-surface-container-low p-4 text-deep-oxblood">
              <Icon name="support_agent" className="text-[24px] text-royal-gold" />
              <div>
                <span className="block font-label-md text-label-md font-semibold">بحاجة إلى مساعدة في الطلب؟</span>
                <Link to="/contact" className="font-label-sm text-label-sm text-imperial-burgundy hover:underline">
                  تواصلي معنا
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
