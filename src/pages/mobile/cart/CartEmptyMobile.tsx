import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MOBILE_BTN_PRIMARY, MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { ProductRail } from '@/components/mobile/ProductRail';
import { featuredPicks, useCatalog } from '@/data/catalog';
import { formatNumber } from '@/lib/format';

/** السلة الفارغة على الهاتف: رسالة واضحة + زر للأقسام + قطع حقيقية من الكتالوج للإضافة السريعة. */
export default function CartEmptyMobile() {
  const { visibleProducts, settings } = useCatalog();
  const picks = featuredPicks(visibleProducts);

  return (
    <MobilePage title="السلة" tab="cart">
      <section className="flex flex-col items-center px-2 pb-8 pt-4 text-center">
        <div className="relative mb-2 flex h-40 w-40 items-center justify-center">
          <div className="pointer-events-none absolute inset-4 rounded-full bg-rose-mist/50 blur-2xl" />
          <EmptyBoxArt />
        </div>
        <h1 className="font-headline-md text-headline-md font-semibold text-deep-oxblood">سلتكِ فارغة</h1>
        <p className="mt-1.5 max-w-[300px] font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
          لم تُضيفي أي قطعة بعد. تصفّحي الأقسام واختاري ما يليق بكِ.
        </p>
        <Link to="/categories" className={`${MOBILE_BTN_PRIMARY} mt-6 max-w-[300px]`}>
          تصفّح الأقسام
          <Icon name="arrow_back" className="text-[20px]" />
        </Link>
      </section>

      {picks.length > 0 && (
        <section className="mb-6">
          <MobileSectionTitle action={{ to: '/collections/all', label: 'عرض الكل' }}>مختارات الدار</MobileSectionTitle>
          <ProductRail products={picks} />
        </section>
      )}

      <section className={`${MOBILE_CARD} flex flex-col gap-3`}>
        {[
          {
            icon: 'local_shipping',
            text:
              settings.freeShippingThreshold > 0
                ? `توصيل لجميع المحافظات — مجاني للطلبات فوق ${formatNumber(settings.freeShippingThreshold)} د.ع`
                : 'توصيل لجميع المحافظات',
          },
          { icon: 'payments', text: 'الدفع نقداً عند الاستلام' },
          { icon: 'autorenew', text: 'استبدال خلال 7 أيام من الاستلام' },
        ].map((f) => (
          <div key={f.icon} className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
              <Icon name={f.icon} className="text-[19px]" />
            </span>
            <span className="font-body-sm text-body-sm text-warm-ink">{f.text}</span>
          </div>
        ))}
      </section>
    </MobilePage>
  );
}

/** رسم صندوق المجوهرات المفتوح (من تصميم Stitch). */
function EmptyBoxArt() {
  return (
    <svg className="relative h-full w-full" fill="none" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M42 136L98 162L158 136L102 114L42 136Z" fill="#F7ECEC" stroke="#4e1825" strokeLinejoin="round" strokeWidth="1.5" />
      <path d="M42 136V152L98 178V162L42 136Z" fill="#370A15" stroke="#4e1825" strokeWidth="1.5" />
      <path d="M98 162V178L158 152V136L98 162Z" fill="#43121E" stroke="#4e1825" strokeWidth="1.5" />
      <ellipse cx="100" cy="138" fill="#2A030D" rx="34" ry="12" stroke="#C9A24B" strokeDasharray="2 2" strokeWidth="1" />
      <path d="M42 136L70 82L132 82L158 136" stroke="#4e1825" strokeLinecap="round" strokeWidth="1.5" />
      <path d="M70 82L100 68L162 68L132 82" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1.2" />
      <path d="M100 68L100 60" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1.5" />
      <circle cx="100" cy="58" fill="#C9A24B" r="2.5" />
      <path d="M100 138C98 116 93 92 100 78C107 92 102 116 100 138Z" fill="#FBF6EF" stroke="#4e1825" strokeWidth="1.5" />
      <path d="M100 90V126" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1" />
      <circle cx="100" cy="98" fill="#C9A24B" r="1.5" />
      <circle cx="100" cy="108" fill="#C9A24B" r="1.5" />
      <path d="M98 115C85 110 66 108 64 122C62 132 76 138 96 135" fill="#EED9DB" fillOpacity="0.6" stroke="#4e1825" strokeWidth="1.5" />
      <path d="M74 120C82 122 89 126 96 135" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1" />
      <path d="M102 115C115 110 134 108 136 122C138 132 124 138 104 135" fill="#EED9DB" fillOpacity="0.6" stroke="#4e1825" strokeWidth="1.5" />
      <path d="M126 120C118 122 111 126 104 135" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1" />
      <path d="M92 136C86 145 78 152 70 155" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1.2" />
      <path d="M108 136C114 145 122 152 130 155" stroke="#C9A24B" strokeLinecap="round" strokeWidth="1.2" />
      <path d="M142 66L144 72L150 74L144 76L142 82L140 76L134 74L140 72L142 66Z" fill="#C9A24B" />
      <path d="M56 100L57.5 104.5L62 106L57.5 107.5L56 112L54.5 107.5L50 106L54.5 104.5L56 100Z" fill="#C9A24B" />
    </svg>
  );
}
