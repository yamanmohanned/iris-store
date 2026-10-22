import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { ProductCard } from '@/components/store/ProductCard';
import { featuredPicks, useCatalog } from '@/data/catalog';
import { useIsMobile } from '@/hooks/useMediaQuery';
import NotFoundMobile from '@/pages/mobile/system/NotFoundMobile';

/**
 * صفحة غير موجودة — تُعرض أيضاً لرابط منتج/قسم/طلب غير صحيح، لذا تختار تصميم الهاتف بنفسها
 * (كانت تعرض تصميم الديسكتوب داخل إطار الهاتف بلا شريط علوي).
 */
export default function NotFoundPage() {
  return useIsMobile() ? <NotFoundMobile /> : <NotFoundDesktop />;
}

/**
 * Stitch screen c9b417adf4c349aba6dc35b3c5976d95 «IRIS | 404 — الصفحة غير موجودة»
 * بحث فعلي، روابط الأقسام الحقيقية، وقطع من الكتالوج بدل بطاقات ثابتة وروابط «#».
 */
function NotFoundDesktop() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { visibleCategories, visibleProducts } = useCatalog();
  const picks = featuredPicks(visibleProducts, 4);

  return (
    <main className="w-full min-h-screen">
      <div className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-1/4 w-[560px] h-[560px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 -left-32 w-[480px] h-[480px] rounded-full bg-royal-gold/10 blur-[140px]" />
        <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin py-space-xl lg:py-space-2xl">
          <nav
            aria-label="مسار التصفح"
            className="flex items-center gap-space-xs text-label-sm font-label-sm text-muted-rosewood mb-space-xl"
          >
            <Link to="/" className="hover:text-imperial-burgundy transition-colors">
              الرئيسية
            </Link>
            <Icon name="chevron_left" className="text-[14px] text-antique-gold/70" />
            <span className="text-on-surface font-semibold">صفحة غير موجودة</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl lg:gap-gutter items-center">
            <div className="lg:col-span-7 flex flex-col items-start text-right">
              <span
                dir="ltr"
                className="block font-serif-brand text-[104px] lg:text-[144px] leading-none text-antique-gold opacity-90 select-none"
              >
                404
              </span>
              <h1 className="text-headline-xl font-headline-xl text-deep-oxblood font-bold mt-space-xs mb-space-sm">الصفحة غير موجودة</h1>
              <div className="w-full max-w-md my-space-sm flex items-center">
                <div className="w-full h-px bg-royal-gold/40" />
                <span className="px-2 text-royal-gold text-[10px] select-none">◆</span>
                <div className="w-16 h-px bg-royal-gold/40" />
              </div>
              <p className="text-body-lg font-body-lg text-warm-ink/80 max-w-xl leading-relaxed mt-space-sm mb-space-lg">
                ربما تغيّر الرابط أو لم تعد القطعة معروضة. ابحث عنها باسمها أو رقمها، أو تصفّح أقسام المتجر.
              </p>

              <form
                role="search"
                className="w-full max-w-lg mb-space-lg"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = query.trim();
                  navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
                }}
              >
                <label htmlFor="nf-search" className="block text-label-md font-label-md text-antique-gold font-medium mb-space-xs">
                  البحث في المتجر
                </label>
                <div className="relative flex items-center bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_rgba(42,3,13,0.06)] p-1.5 transition-all focus-within:shadow-[0_8px_32px_rgba(78,24,37,0.14)]">
                  <Icon name="search" className="text-antique-gold mx-space-sm" />
                  <input
                    id="nf-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-transparent text-body-md font-body-md text-warm-ink placeholder:text-muted-rosewood/60 focus:outline-none px-space-xs"
                    placeholder="اسم القطعة أو رقمها، مثل: قلادة البجعة"
                  />
                  <button
                    className="px-space-lg py-space-sm bg-imperial-burgundy hover:bg-burgundy-600 text-on-primary rounded-lg text-label-md font-label-md font-semibold transition-colors active:translate-y-[1px]"
                    type="submit"
                  >
                    بحث
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
                <Link
                  to="/"
                  className="inline-flex items-center gap-space-sm px-space-xl py-3.5 bg-imperial-burgundy hover:bg-burgundy-600 text-on-primary rounded-xl text-label-lg font-label-lg font-medium shadow-[0_8px_24px_rgba(78,24,37,0.22)] transition-all duration-300 active:translate-y-[1px] group"
                >
                  العودة للرئيسية
                  <Icon name="arrow_back" className="text-[18px] transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-space-sm px-space-lg py-3.5 bg-surface-container-low hover:bg-blush-surface text-imperial-burgundy rounded-xl text-label-lg font-label-lg font-medium transition-colors active:translate-y-[1px]"
                >
                  <Icon name="support_agent" className="text-[20px] text-antique-gold" />
                  تواصل معنا
                </Link>
              </div>

              {visibleCategories.length > 0 && (
                <div className="flex items-center gap-space-sm flex-wrap mt-space-xl pt-space-md">
                  <span className="text-label-md font-label-md text-muted-rosewood">الأقسام:</span>
                  {visibleCategories.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/collections/${c.slug}`}
                      className="px-3.5 py-1.5 bg-surface-container rounded-full text-label-md font-label-md text-on-surface-variant hover:text-deep-oxblood hover:bg-surface-container-high transition-colors"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 flex flex-col items-center lg:items-end justify-center">
              <div className="relative w-full max-w-[420px]">
                <div className="absolute -inset-3 bg-parchment/60 rounded-t-[220px] rounded-b-[28px] -rotate-1 shadow-inner" />
                <div className="relative overflow-hidden bg-wine-night rounded-t-[210px] rounded-b-[24px] shadow-[0_24px_64px_rgba(42,3,13,0.22)] p-2">
                  <div className="relative rounded-t-[200px] rounded-b-[18px] overflow-hidden aspect-[4/5] bg-deep-oxblood">
                    <img className="w-full h-full object-cover" alt="" src="/images/stitch/126.jpg" />
                    <div className="absolute inset-0 bg-gradient-to-t from-wine-night/70 via-transparent to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {picks.length > 0 && (
            <section className="mt-space-3xl pt-space-2xl">
              <div className="flex flex-col items-center text-center mb-space-2xl">
                <span className="text-label-md font-label-md text-antique-gold tracking-widest font-semibold mb-space-xs">
                  مختارات آيريس
                </span>
                <h2 className="text-headline-lg font-headline-lg text-deep-oxblood font-bold">قطع قد تعجبك</h2>
                <div className="w-56 my-space-md flex items-center">
                  <div className="w-full h-px bg-royal-gold/40" />
                  <span className="px-2 text-royal-gold text-[10px]">◆</span>
                  <div className="w-full h-px bg-royal-gold/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-lg">
                {picks.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
