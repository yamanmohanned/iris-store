import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { MOBILE_BTN_PRIMARY, MOBILE_BTN_SECONDARY, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { ProductRail } from '@/components/mobile/ProductRail';
import { featuredPicks, useCatalog } from '@/data/catalog';

/** صفحة غير موجودة على الهاتف (رابط قديم أو قطعة لم تعد معروضة): رسالة قصيرة + بحث + طريقان واضحان للعودة. */
export default function NotFoundMobile() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const picks = featuredPicks(useCatalog().visibleProducts);

  return (
    <MobilePage back="/">
      <section className="flex flex-col items-center px-2 pb-8 pt-6 text-center">
        <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-blush-surface">
          <BrandMark className="h-12 text-imperial-burgundy" />
          <span
            dir="ltr"
            className="absolute -bottom-2 rounded-full bg-imperial-burgundy px-2.5 py-0.5 font-label-sm text-label-sm font-bold tracking-wider text-champagne-gold"
          >
            404
          </span>
        </div>
        <h1 className="font-headline-md text-headline-md font-semibold text-deep-oxblood">الصفحة غير موجودة</h1>
        <p className="mt-1.5 max-w-[300px] font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
          ربما تغيّر الرابط أو لم تعد القطعة معروضة. ابحثي عنها أو تصفّحي الأقسام.
        </p>

        <form
          role="search"
          className="mt-5 flex h-12 w-full max-w-[340px] items-center gap-2 rounded-xl bg-surface-container-lowest px-3.5 shadow-[0_0_0_1px_rgba(78,24,37,0.1)] focus-within:shadow-[0_0_0_2px_rgba(78,24,37,0.35)]"
          onSubmit={(e) => {
            e.preventDefault();
            const q = query.trim();
            navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
          }}
        >
          <Icon name="search" className="text-[20px] text-antique-gold" />
          <input
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحثي باسم القطعة أو رقمها…"
            aria-label="بحث في المتجر"
            className="w-full bg-transparent font-body-md text-body-md text-warm-ink outline-none placeholder:text-muted-rosewood/60"
          />
        </form>

        <div className="mt-4 flex w-full max-w-[340px] flex-col gap-2.5">
          <Link to="/categories" className={MOBILE_BTN_PRIMARY}>
            تصفّحي الأقسام
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
          <Link to="/" className={MOBILE_BTN_SECONDARY}>
            العودة للرئيسية
          </Link>
        </div>
      </section>

      {picks.length > 0 && (
        <section>
          <MobileSectionTitle action={{ to: '/collections/all', label: 'عرض الكل' }}>قد يعجبكِ</MobileSectionTitle>
          <ProductRail products={picks} />
        </section>
      )}
    </MobilePage>
  );
}
