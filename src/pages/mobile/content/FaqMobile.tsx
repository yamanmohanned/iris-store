import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { WhatsAppLink } from '@/components/common/WhatsAppLink';
import { FaqAccordionItem } from '@/components/mobile/FaqAccordion';
import { MOBILE_BTN_LIGHT, MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { useCatalog } from '@/data/catalog';
import { faqGroups, filterFaq } from '@/data/faq';
import { cn } from '@/lib/cn';

/** الأسئلة الشائعة على الهاتف: بحث فعلي + أقسام + أسئلة قابلة للطي + طريق واضح للتواصل. */
export default function FaqMobile() {
  const { settings } = useCatalog();
  const groups = useMemo(() => faqGroups(settings), [settings]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string | null>(null);

  const searched = filterFaq(groups, query);
  const shown = active ? searched.filter((g) => g.id === active) : searched;

  return (
    <MobilePage title="الأسئلة الشائعة" back="/contact" tab="contact">
      <p className="mb-4 font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
        إجابات سريعة عن الطلب والتوصيل والدفع والاستبدال والمقاسات.
      </p>

      <label className="flex h-12 items-center gap-2 rounded-xl bg-surface-container-lowest px-3.5 shadow-[0_0_0_1px_rgba(78,24,37,0.1)] focus-within:shadow-[0_0_0_2px_rgba(78,24,37,0.35)]">
        <Icon name="search" className="text-[20px] text-antique-gold" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحثي في الأسئلة… مثل: الاستبدال"
          aria-label="البحث في الأسئلة الشائعة"
          className="w-full bg-transparent font-body-md text-body-md text-warm-ink outline-none placeholder:text-muted-rosewood/60"
        />
        {query && (
          <button
            type="button"
            aria-label="مسح البحث"
            onClick={() => setQuery('')}
            className="-ml-1 flex h-9 w-9 items-center justify-center text-muted-rosewood"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </label>

      <div
        className="-mx-gutter-mobile mt-3 flex gap-2 overflow-x-auto px-gutter-mobile pb-1 [scrollbar-width:none]"
        role="tablist"
        aria-label="أقسام الأسئلة"
      >
        {[{ id: null, title: 'الكل' }, ...groups].map((g) => {
          const on = active === g.id;
          return (
            <button
              key={g.id ?? 'all'}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(g.id)}
              className={cn(
                'h-9 shrink-0 rounded-full px-4 font-label-md text-label-md transition-colors',
                on ? 'bg-imperial-burgundy font-semibold text-ivory-canvas' : 'bg-blush-surface text-warm-ink active:bg-rose-mist',
              )}
            >
              {g.title}
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className={cn(MOBILE_CARD, 'mt-5 flex flex-col items-center gap-1.5 py-8 text-center')}>
          <Icon name="search_off" className="text-[36px] text-rose-mist" />
          <p className="font-label-lg text-label-lg font-semibold text-deep-oxblood">لا توجد أسئلة مطابقة</p>
          <p className="font-body-sm text-body-sm text-muted-rosewood">جرّبي كلمة أخرى أو اسألينا مباشرة.</p>
        </div>
      ) : (
        shown.map((g) => (
          <section key={g.id} className="mt-6">
            <MobileSectionTitle>{g.title}</MobileSectionTitle>
            <div className={cn(MOBILE_CARD, 'py-1')}>
              {g.items.map((item, i) => (
                <FaqAccordionItem key={`${item.q}|${query}`} item={item} defaultOpen={Boolean(query) && i === 0} />
              ))}
            </div>
          </section>
        ))
      )}

      <section className="mt-8 overflow-hidden rounded-[22px] bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-5 text-center text-ivory-canvas shadow-[0_14px_36px_rgba(42,3,13,0.22)]">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-champagne-gold">لم تجدي إجابتكِ؟</h2>
        <p className="mt-1 font-body-sm text-body-sm leading-relaxed text-rose-mist">
          اسألينا عن أي قطعة أو مقاس أو طلب، ويسعدنا الرد عليكِ.
        </p>
        <WhatsAppLink className={cn(MOBILE_BTN_LIGHT, 'mt-4')}>
          <WhatsAppIcon className="h-5 w-5 text-[#1F8F4E]" />
          راسلينا
        </WhatsAppLink>
        <Link to="/contact" className="mt-3 inline-flex min-h-[40px] items-center gap-1 font-label-md text-label-md text-champagne-gold">
          كل طرق التواصل
          <Icon name="chevron_left" className="text-[18px]" />
        </Link>
      </section>
    </MobilePage>
  );
}
