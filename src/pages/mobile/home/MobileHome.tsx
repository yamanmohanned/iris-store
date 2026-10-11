import { Link } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { CategoryGrid } from '@/components/mobile/CategoryGrid';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { useCatalog } from '@/data/catalog';

/** غلاف افتراضي (صندوق الدار في المعرض) — مختلف عن صور الأقسام حتى لا تتكرر الصورة نفسها مرتين في أول شاشة. */
export const DEFAULT_HERO_IMAGE = '/images/stitch/005.jpg';

const FEATURES = [
  { icon: 'local_shipping', label: 'توصيل لكل المحافظات' },
  { icon: 'payments', label: 'الدفع عند الاستلام' },
  { icon: 'autorenew', label: 'استبدال خلال 7 أيام' },
];

/**
 * الرئيسية على الهاتف — على نمط قائمة المنيو المرجعية (menu.iqrarabic.com):
 * صورة غلاف بعرض الشاشة، ثم شعار الدار، ثم أقسام المالك كبطاقات صور كبيرة
 * (قلائد، أساور، محابس…) وكل بطاقة تفتح منتجات ذلك القسم.
 */
export default function MobileHome() {
  const { visibleCategories, visibleProducts, settings } = useCatalog();
  const tiles = visibleCategories.map((category) => ({
    category,
    count: visibleProducts.filter((p) => p.category === category.slug).length,
  }));
  const offers = visibleProducts.filter((p) => p.oldPrice && p.oldPrice > p.price).length;

  return (
    <div className="flex min-h-screen flex-col bg-ivory-canvas text-warm-ink">
      <MobileTopBar overlay threshold={260} />

      {/* الغلاف */}
      <section className="relative h-[min(54vh,450px)] min-h-[340px] w-full overflow-hidden bg-wine-night">
        <img
          src={settings.heroImage || DEFAULT_HERO_IMAGE}
          alt=""
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-wine-night/40 via-wine-night/10 to-wine-night/95" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-10 text-center">
          <BrandMark label="شعار آيريس" className="h-16 text-champagne-gold drop-shadow-[0_4px_18px_rgba(42,3,13,0.6)]" />
          <span dir="ltr" className="mt-3 font-serif-brand text-[32px] uppercase leading-none tracking-[0.3em] text-ivory-canvas">
            IRIS
          </span>
          <span className="mt-2 font-headline-sm text-[1.125rem] font-medium text-champagne-gold">دار آيريس للمجوهرات الراقية</span>
        </div>
      </section>

      <main className="relative z-10 -mt-5 flex-1 rounded-t-[28px] bg-ivory-canvas px-gutter-mobile pb-32 pt-5">
        {/* مزايا الشراء */}
        <ul className="mb-6 grid grid-cols-3 gap-2">
          {FEATURES.map((f) => (
            <li key={f.icon} className="flex flex-col items-center gap-1 text-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
                <Icon name={f.icon} className="text-[19px]" />
              </span>
              <span className="font-label-sm text-label-sm leading-tight text-on-surface-variant">{f.label}</span>
            </li>
          ))}
        </ul>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-royal-gold/60" />
          <h1 className="font-headline-sm text-headline-sm font-bold text-deep-oxblood">تسوّقي حسب القسم</h1>
          <div className="h-px flex-1 bg-gradient-to-l from-royal-gold/60 to-transparent" />
        </div>

        {tiles.length > 0 ? (
          <CategoryGrid tiles={tiles} />
        ) : (
          <p className="rounded-2xl bg-surface-container-lowest p-6 text-center font-body-md text-body-md text-muted-rosewood shadow-luxury">
            يجري تجهيز الأقسام، عودي قريباً.
          </p>
        )}

        {offers > 0 && (
          <Link
            to="/collections/offers"
            className="mt-3 flex items-center justify-between rounded-[20px] bg-imperial-burgundy px-5 py-4 text-ivory-canvas shadow-[0_10px_28px_rgba(78,24,37,0.25)]"
          >
            <span className="flex items-center gap-3">
              <Icon name="sell" className="text-[22px] text-champagne-gold" />
              <span className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold">العروض</span>
                <span className="font-label-sm text-label-sm text-champagne-gold/85">قطع مختارة بأسعار خاصة</span>
              </span>
            </span>
            <Icon name="arrow_back" className="text-[22px] text-champagne-gold" />
          </Link>
        )}

        <footer className="mt-10 flex flex-col items-center gap-2 text-center">
          <BrandMark className="h-10 text-imperial-burgundy/80" />
          <p className="font-label-sm text-label-sm text-muted-rosewood">دار آيريس للمجوهرات © {new Date().getFullYear()}</p>
          <div className="flex items-center gap-4 font-label-md text-label-md text-imperial-burgundy">
            <Link to="/contact" className="-my-2 inline-flex min-h-[40px] items-center">تواصل معنا</Link>
            <span className="text-[7px] text-royal-gold">◆</span>
            <Link to="/policies/shipping" className="-my-2 inline-flex min-h-[40px] items-center">الشحن والاستبدال</Link>
            <span className="text-[7px] text-royal-gold">◆</span>
            <Link to="/track-order" className="-my-2 inline-flex min-h-[40px] items-center">تتبع طلبك</Link>
          </div>
        </footer>
      </main>

      <MobileTabBar active="home" />
    </div>
  );
}
