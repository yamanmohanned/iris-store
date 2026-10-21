import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { WhatsAppLink } from '@/components/common/WhatsAppLink';
import { FaqCard } from '@/components/store/FaqCard';
import { useCatalog } from '@/data/catalog';
import { faqGroups, filterFaq } from '@/data/faq';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { arabicCount } from '@/lib/format';
import FaqMobile from '@/pages/mobile/content/FaqMobile';

const questionsCount = (n: number) => arabicCount(n, { one: 'سؤال واحد', two: 'سؤالان', few: 'أسئلة', many: 'سؤالاً' });

export default function FaqPage() {
  return useIsMobile() ? <FaqMobile /> : <FaqDesktop />;
}

/**
 * Stitch screen 21ced72b302345ba96b1722ee7bdf2ea «IRIS | الأسئلة الشائعة»
 * الأسئلة من src/data/faq.ts (نفس مصدر الهاتف): بحث يعمل، وأقسام تُصفّي، وإجابات تطابق ما يقدّمه المتجر فعلاً.
 */
function FaqDesktop() {
  const { settings } = useCatalog();
  const groups = useMemo(() => faqGroups(settings), [settings]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);

  const searched = filterFaq(groups, query);
  const shown = active ? searched.filter((g) => g.id === active) : searched;

  return (
    <main className="w-full bg-ivory-canvas min-h-screen">
      <section className="relative bg-burgundy-800 text-surface-container-lowest overflow-hidden">
        <div className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay">
          <svg className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <pattern height="60" id="faq-lattice" patternUnits="userSpaceOnUse" width="60">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="#E9D49C" strokeWidth="0.75" />
              <circle cx="30" cy="30" fill="none" r="4" stroke="#E9D49C" strokeWidth="0.5" />
            </pattern>
            <rect fill="url(#faq-lattice)" height="100%" width="100%" />
          </svg>
        </div>
        <div className="absolute -top-32 right-1/4 w-96 h-96 bg-burgundy-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-gutter py-space-3xl text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-wine-night/40 mb-space-md font-label-md text-label-md text-champagne-gold">
            <span className="w-1.5 h-1.5 rounded-full bg-champagne-gold" />
            مركز المساعدة
          </span>
          <h1 className="font-headline-xl text-headline-xl lg:text-display-lg text-champagne-gold mb-space-sm font-semibold">
            الأسئلة الشائعة
          </h1>
          <p className="font-body-lg text-body-lg text-rose-mist max-w-2xl leading-relaxed mb-space-xl">
            إجابات واضحة عن الطلب والتوصيل والدفع والاستبدال والعناية بالمجوهرات.
          </p>
          <div className="w-full max-w-2xl text-right">
            <label className="sr-only" htmlFor="faq-search">
              ابحث في الأسئلة
            </label>
            <div className="relative">
              <input
                id="faq-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في الأسئلة… مثل: الاستبدال، مقاس الخاتم، التوصيل"
                className="w-full bg-deep-oxblood/80 text-surface placeholder:text-rose-mist/60 rounded-xl pr-12 pl-4 py-3.5 font-body-md text-body-md shadow-[0_8px_30px_rgba(42,3,13,0.35)] focus:outline-none focus:ring-1 focus:ring-champagne-gold/60"
              />
              <Icon name="search" className="pointer-events-none absolute inset-y-0 right-4 my-auto text-royal-gold" />
            </div>
          </div>
        </div>
        <div className="w-full py-1">
          <div className="h-px w-full bg-hairline-gold" />
          <div className="h-px w-full mt-[3px] bg-hairline-gold" />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-gutter py-space-2xl">
        <nav aria-label="مسار التصفح" className="flex items-center gap-2 font-label-md text-label-md text-muted-rosewood mb-space-xl">
          <Link to="/" className="hover:text-primary transition-colors">
            الرئيسية
          </Link>
          <Icon name="chevron_left" className="text-[14px] text-royal-gold" />
          <span className="text-primary font-semibold">الأسئلة الشائعة</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <aside className="lg:col-span-4 w-full lg:sticky lg:top-28 space-y-space-lg">
            <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-[0_8px_30px_rgba(42,3,13,0.06)]">
              <div className="flex items-center justify-between pb-space-sm mb-space-sm">
                <span className="font-headline-sm text-headline-sm text-primary font-semibold">أقسام المساعدة</span>
                <Icon name="auto_stories" className="text-royal-gold" />
              </div>
              <ul className="space-y-1 font-body-md text-body-md">
                {[{ id: null, title: 'كل الأسئلة', icon: 'grid_view', items: groups.flatMap((g) => g.items) }, ...groups].map((g) => {
                  const on = active === g.id;
                  return (
                    <li key={g.id ?? 'all'}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setActive(g.id)}
                        className={cn(
                          'w-full text-right px-space-md py-3 rounded-lg flex items-center justify-between gap-space-sm transition-colors',
                          on
                            ? 'bg-blush-surface text-primary font-semibold'
                            : 'text-on-surface-variant hover:text-primary hover:bg-blush-surface/60',
                        )}
                      >
                        <span className="flex items-center gap-space-sm">
                          <span className={cn('w-1.5 h-6 rounded-full', on ? 'bg-royal-gold' : 'bg-transparent')} />
                          <Icon name={g.icon} className={cn('text-xl', on ? 'text-primary' : 'text-muted-rosewood')} />
                          {g.title}
                        </span>
                        <span className="font-label-md text-label-md text-muted-rosewood tabular-nums">{g.items.length}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="bg-wine-night rounded-xl p-space-md text-champagne-gold shadow-md overflow-hidden">
              <div className="relative w-full h-44 rounded-lg overflow-hidden mb-space-sm">
                <img className="w-full h-full object-cover" alt="" src="/images/instagram/moon-box.jpg" />
                <div className="absolute inset-0 bg-gradient-to-t from-wine-night via-transparent to-transparent" />
              </div>
              <h2 className="font-headline-sm text-headline-sm text-champagne-gold mb-1">جاهزة للإهداء</h2>
              <p className="font-body-sm text-body-sm text-rose-mist leading-relaxed">
                إن كان طلبكِ هدية اكتبي ذلك في ملاحظات الطلب، ونجهّزه بشكل يليق بالإهداء.
              </p>
            </div>
          </aside>

          <section className="lg:col-span-8 w-full space-y-space-2xl">
            {shown.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl p-space-2xl text-center shadow-[0_8px_30px_rgba(42,3,13,0.05)]">
                <Icon name="search_off" className="text-[40px] text-rose-mist" />
                <p className="mt-2 font-headline-sm text-headline-sm text-primary">لا توجد أسئلة مطابقة لـ «{query}»</p>
                <p className="mt-1 font-body-md text-body-md text-muted-rosewood">جرّب كلمة أخرى أو تواصل معنا مباشرة.</p>
              </div>
            ) : (
              shown.map((g) => (
                <div key={g.id} className="space-y-space-md">
                  <div className="flex items-end justify-between gap-space-md border-b border-hairline-gold/60 pb-space-sm">
                    <h2 className="flex items-center gap-space-sm font-headline-lg text-headline-lg text-primary font-semibold">
                      <Icon name={g.icon} className="text-[26px] text-antique-gold" />
                      {g.title}
                    </h2>
                    <span className="font-label-md text-label-md text-muted-rosewood">{questionsCount(g.items.length)}</span>
                  </div>
                  {g.items.map((item, i) => (
                    <FaqCard key={`${item.q}|${query}`} item={item} defaultOpen={(Boolean(query) || g === shown[0]) && i === 0} />
                  ))}
                </div>
              ))
            )}

            <div className="relative bg-surface-container-lowest rounded-2xl p-space-xl shadow-[0_12px_40px_rgba(42,3,13,0.08)] overflow-hidden">
              <div className="absolute inset-0 border border-royal-gold/30 rounded-2xl pointer-events-none" />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-space-lg text-right">
                <div className="space-y-space-xs max-w-lg">
                  <h2 className="font-headline-md text-headline-md text-primary font-semibold">لم تجد إجابتك؟</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                    اسألنا عن أي قطعة أو مقاس أو طلب، ويسعدنا الرد عليك.
                  </p>
                </div>
                <WhatsAppLink className="shrink-0 inline-flex items-center justify-center gap-space-sm px-space-lg py-3.5 rounded-xl bg-imperial-burgundy hover:bg-burgundy-600 text-surface-container-lowest font-label-lg text-label-lg transition-colors shadow-md active:translate-y-[1px]">
                  <WhatsAppIcon className="h-5 w-5 text-champagne-gold" />
                  راسلنا عبر واتساب
                </WhatsAppLink>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
