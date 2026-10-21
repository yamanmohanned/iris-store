/** Data bindings for «تأكيد استلام الطلب» (desktop 6adf31 / mobile 11405c). */

const common = {
  imports: [
    "import { useRouteOrder } from '@/hooks/useRouteOrder';",
    "import { formatNumber } from '@/lib/format';",
    "import NotFoundPage from '@/pages/store/system/NotFoundPage';",
    "import { customerStatusLabels, paymentLabels } from '@/state/orders';",
  ],
  hooks: `  const order = useRouteOrder();
  const pieces = order ? order.lines.reduce((n, l) => n + l.qty, 0) : 0;`,
  guard: '  if (!order) return <NotFoundPage />;',
};

const addressExpr = '⟦order.delivery.governorate⟧ — ⟦order.delivery.district⟧⟦order.delivery.neighborhood ? `، ${order.delivery.neighborhood}` : ``⟧';

export const desktop = {
  ...common,
  bind: [
    { sel: '#order-number-val', text: '#⟦order.id⟧' },
    { sel: '#copy-btn', attr: { 'data-legacy-onclick': "navigator.clipboard.writeText('⟦order.id⟧')" } },
    { sel: '#copy-feedback', remove: true },
    { sel: 'span.text-semantic-warning.font-semibold', text: '⟦customerStatusLabels[order.status]⟧' },
    { sel: 'span.font-mono.text-label-sm', first: true, swap: [['2 قطعة مختارة', '⟦pieces⟧ قطعة مختارة']] },

    // order lines (right card)
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.h-px.w-full.bg-hairline-burgundy', remove: true },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md img', attr: { src: '⟦l.image⟧', alt: '⟦l.name⟧' } },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md h3', text: '⟦l.name⟧' },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md span.font-mono.whitespace-nowrap', text: '⟦formatNumber(l.price * l.qty)⟧ د.ع' },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md p.font-body-sm', text: '⟦l.options?.size ? `المقاس: ${l.options.size} · ` : ``⟧⟦l.options?.metal ?? `صياغة يدوية خاصة`⟧' },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md span.text-outline', text: 'SKU: ⟦l.sku⟧' },
    { sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md span.font-medium.text-on-surface-variant', text: 'الكمية: ⟦l.qty⟧' },
    {
      sel: 'section.lg\\:col-span-5 > div:first-child > div.flex.items-start.gap-space-md',
      addClass: 'pb-space-md border-b border-hairline-burgundy last:border-b-0 last:pb-0',
      repeat: { of: 'order.lines', as: 'l', key: 'l.productId + (l.options?.size ?? "")' },
    },

    // address / payment
    { sel: 'div.bg-ivory-canvas.p-space-md span.text-on-surface', nth: 0, text: addressExpr },
    { sel: 'div.bg-ivory-canvas.p-space-md span.text-on-surface', nth: 2, text: '⟦paymentLabels[order.payment]⟧' },

    // totals
    { sel: 'div.space-y-space-xs.pt-space-xs > div:nth-child(1) span.font-mono', text: '⟦formatNumber(order.subtotal)⟧ د.ع' },
    {
      sel: 'div.space-y-space-xs.pt-space-xs > div:nth-child(1)',
      after:
        '{order.discount > 0 && (<div className="flex items-center justify-between text-antique-gold"><span>خصم القسيمة ({order.couponCode})</span> <span className="font-mono">-{formatNumber(order.discount)} د.ع</span></div>)}',
    },
    { sel: 'div.space-y-space-xs.pt-space-xs > div:nth-child(2) span.font-mono', text: '⟦order.shipping === 0 ? `مجاني` : `${formatNumber(order.shipping)} د.ع`⟧' },
    { sel: 'span.font-headline-lg.font-bold.text-imperial-burgundy', text: '⟦formatNumber(order.total)⟧' },
    { sel: 'span.font-headline-sm.text-primary.block', swap: [['المبلغ المستحق عند الاستلام', "⟦order.payment === 'cod' ? 'المبلغ المستحق عند الاستلام' : 'إجمالي الطلب'⟧"]] },

    // track button → link
    {
      sel: 'button.bg-imperial-burgundy.flex-1',
      replace:
        '<Link to={`/track-order?order=${order.id}`} className="flex-1 py-3.5 px-space-lg rounded-xl bg-imperial-burgundy hover:bg-burgundy-600 text-ivory-canvas font-label-lg text-label-lg font-semibold flex items-center justify-center gap-space-sm transition-all duration-200 active:translate-y-[1px] shadow-md"><span className="material-symbols-outlined text-xl text-champagne-gold">travel_explore</span> <span>تتبع طلبي بالتفصيل</span></Link>',
    },
  ],
};

export const mobile = {
  ...common,
  bind: [
    { sel: '#orderNumber', text: '#⟦order.id⟧' },
    { sel: '#copyBtn', attr: { 'data-legacy-onclick': "navigator.clipboard.writeText('⟦order.id⟧')" } },
    { sel: 'div.inline-flex.border-semantic-warning\\/30 span.font-medium', text: '⟦customerStatusLabels[order.status]⟧' },
    { sel: 'section.rounded-\\[20px\\] span.font-label-sm.text-antique-gold', first: true, text: '⟦pieces⟧ قطع مختارة' },

    // lines
    { sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.w-full', remove: true },
    { sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3 img', attr: { src: '⟦l.image⟧', alt: '⟦l.name⟧' } },
    { sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3 h3', text: '⟦l.name⟧' },
    {
      sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3 p',
      text: '⟦l.options?.metal ?? ``⟧⟦l.options?.size ? ` · (${l.options.size})` : ``⟧',
    },
    { sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3 span.text-muted-rosewood', text: 'الكمية: ⟦l.qty⟧' },
    { sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3 span.font-mono', text: '⟦formatNumber(l.price * l.qty)⟧ د.ع' },
    {
      sel: 'section.rounded-\\[20px\\] div.flex.flex-col.gap-3\\.5.mb-4 > div.flex.items-center.gap-3',
      repeat: { of: 'order.lines', as: 'l', key: 'l.productId + (l.options?.size ?? "")' },
    },

    // address / payment
    { sel: 'div.space-y-2\\.5.pt-1 span.text-warm-ink', nth: 0, text: addressExpr },
    { sel: 'div.space-y-2\\.5.pt-1 span.text-warm-ink', nth: 1, text: '⟦paymentLabels[order.payment]⟧' },

    // totals
    { sel: 'div.pt-3.space-y-1\\.5 > div:nth-child(1) span.font-mono', text: '⟦formatNumber(order.subtotal)⟧ د.ع' },
    { sel: 'div.pt-3.space-y-1\\.5 > div:nth-child(2) span.font-mono', text: '⟦order.shipping === 0 ? `مجاني` : `${formatNumber(order.shipping)} د.ع`⟧' },
    { sel: 'span.font-mono.font-bold.text-imperial-burgundy.text-lg', text: '⟦formatNumber(order.total)⟧ د.ع' },
    {
      sel: 'button.bg-imperial-burgundy.h-12',
      replace:
        '<Link to={`/track-order?order=${order.id}`} className="w-full h-12 rounded-xl bg-imperial-burgundy text-ivory-canvas font-label-lg font-semibold flex items-center justify-center gap-2 shadow-md hover:bg-burgundy-600 active:translate-y-[1px] transition-all"><span className="material-symbols-outlined text-[20px]">local_shipping</span> <span>تتبع مسار طلبي</span></Link>',
    },
    {
      sel: 'button.inline-flex.text-muted-rosewood',
      replace:
        '<Link to="/collections/necklaces" className="inline-flex items-center gap-1.5 text-muted-rosewood hover:text-imperial-burgundy font-label-md transition-colors py-1"><span>العودة ومتابعة استكشاف المجموعة</span> <span className="material-symbols-outlined text-[16px] rtl:rotate-180">arrow_forward</span></Link>',
    },
  ],
};
