import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import NotFoundPage from '@/pages/store/system/NotFoundPage';

/**
 * سياسات المتجر (`/policies/:topic`) — كانت روابطها في التذييل والسلة والدفع تؤدي إلى 404.
 * النصوص مأخوذة مما يعلنه المتجر في الرئيسية والأسئلة الشائعة؛ يراجعها المالك قبل الإطلاق.
 */
interface Policy {
  title: string;
  /** عنوان مختصر لشريط الهاتف العلوي */
  short: string;
  icon: string;
  sections: Array<{ heading: string; body: string[] }>;
}

const POLICIES: Record<string, Policy> = {
  shipping: {
    title: 'سياسة الشحن والاستبدال',
    short: 'الشحن والاستبدال',
    icon: 'local_shipping',
    sections: [
      {
        heading: 'التوصيل',
        body: [
          'نوصل الطلبات إلى جميع محافظات العراق. يستغرق التوصيل داخل بغداد من يوم إلى يومين، ولباقي المحافظات من 2 إلى 4 أيام عمل.',
          'تُغلَّف كل قطعة في صندوق الدار المخملي وتُسلَّم باليد للمستلم المذكور في الطلب.',
        ],
      },
      {
        heading: 'الدفع عند الاستلام',
        body: ['يمكنك الدفع نقداً عند الاستلام في كل المحافظات، مع حق معاينة الصندوق والتأكد من مطابقة القطعة قبل الدفع.'],
      },
      {
        heading: 'الاستبدال والاسترجاع',
        body: [
          'الاستبدال متاح خلال 7 أيام من تاريخ الاستلام، بشرط بقاء القطعة بحالتها الأصلية غير المستخدمة وداخل تغليفها مع بطاقة الضمان.',
          'لطلب استبدال أو استرجاع تواصل معنا مع ذكر رقم الطلب، وسنرتّب معك موعد الاستلام والبديل المناسب.',
        ],
      },
    ],
  },
  care: {
    title: 'دليل العناية بالمقتنيات',
    short: 'العناية بالمجوهرات',
    icon: 'spa',
    sections: [
      {
        heading: 'الحفظ',
        body: ['احفظي كل قطعة منفصلة في صندوقها أو في كيس قماشي ناعم حتى لا تحتك القطع ببعضها.'],
      },
      {
        heading: 'الارتداء',
        body: ['ارتدي المجوهرات بعد العطور ومستحضرات التجميل، وانزعيها قبل السباحة والرياضة والأعمال المنزلية.'],
      },
      {
        heading: 'التنظيف',
        body: ['امسحي القطعة بقطعة قماش ناعمة جافة بعد الاستخدام. للتنظيف العميق يمكن استخدام ماء فاتر وصابون لطيف ثم التجفيف جيداً.'],
      },
    ],
  },
  authenticity: {
    title: 'الضمان والأصالة',
    short: 'الضمان والأصالة',
    icon: 'verified',
    sections: [
      {
        heading: 'الدمغة والعيار',
        body: ['كل قطعة مختومة بدمغة العيار الرسمية، ويُذكر نوع المعدن وعياره في صفحة المنتج وفي الفاتورة.'],
      },
      {
        heading: 'الشهادات',
        body: ['القطع المرصعة بأحجار كريمة تُرفق بشهادة توضح نوع الحجر ومواصفاته عند توفرها.'],
      },
    ],
  },
  'size-guide': {
    title: 'دليل المقاسات',
    short: 'دليل المقاسات',
    icon: 'straighten',
    sections: [
      {
        heading: 'الخواتم',
        body: [
          'لفّي خيطاً حول الإصبع، علّمي نقطة الالتقاء ثم قيسي الطول بالمليمتر. محيط 52 ملم يقابل المقاس 12 تقريباً، وكل 1 ملم إضافي يقابل نصف مقاس.',
        ],
      },
      {
        heading: 'القلائد',
        body: ['40 سم تستقر عند قاعدة العنق، و45 سم (الأكثر طلباً) تنزل قليلاً تحت الترقوة، و50 سم تناسب الياقات المفتوحة.'],
      },
      {
        heading: 'الأساور',
        body: ['قيسي محيط المعصم وأضيفي 1.5 إلى 2 سم للحصول على مقاس مريح.'],
      },
    ],
  },
};

const TOPIC_ORDER = ['shipping', 'care', 'authenticity', 'size-guide'];

export default function PolicyPage() {
  const { topic = 'shipping' } = useParams();
  const policy = POLICIES[topic];
  const mobile = useIsMobile();
  if (!policy) return <NotFoundPage />;
  if (mobile) return <PolicyMobile topic={topic} policy={policy} />;

  return (
    <main className="w-full bg-ivory-canvas">
      <div className="mx-auto w-full max-w-[960px] px-gutter-mobile py-10 md:px-6 md:py-16">
        <nav aria-label="مسار التصفح" className="mb-6 flex items-center gap-space-xs font-body-sm text-body-sm text-muted-rosewood">
          <Link to="/" className="hover:text-imperial-burgundy">
            الرئيسية
          </Link>
          <Icon name="chevron_left" className="text-[14px] text-royal-gold/70" />
          <span className="font-medium text-imperial-burgundy">{policy.title}</span>
        </nav>

        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-imperial-burgundy text-champagne-gold shadow-royal">
            <Icon name={policy.icon} className="text-[24px]" />
          </span>
          <h1 className="font-headline-xl-mobile text-headline-xl-mobile font-bold text-deep-oxblood md:font-headline-xl md:text-headline-xl">
            {policy.title}
          </h1>
        </div>

        <div className="mb-10 flex flex-wrap gap-2">
          {TOPIC_ORDER.map((key) => (
            <Link
              key={key}
              to={`/policies/${key}`}
              className={cn(
                'rounded-full px-4 py-1.5 font-label-md text-label-md transition-colors',
                key === topic ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-blush-surface text-warm-ink hover:bg-rose-mist',
              )}
            >
              {POLICIES[key].title}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-5">
          {policy.sections.map((s) => (
            <section key={s.heading} className="rounded-[20px] bg-surface-container-lowest p-6 shadow-luxury">
              <h2 className="mb-3 flex items-center gap-2 font-headline-sm text-headline-sm font-semibold text-deep-oxblood">
                <span className="text-[10px] text-royal-gold">◆</span>
                {s.heading}
              </h2>
              {s.body.map((p) => (
                <p key={p} className="font-body-md text-body-md leading-relaxed text-muted-rosewood">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl bg-parchment p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body-md text-body-md text-warm-ink">عندك سؤال لم تجد جوابه هنا؟</p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-xl bg-imperial-burgundy px-5 py-2.5 font-label-lg text-label-lg text-ivory-canvas hover:bg-burgundy-600"
          >
            تواصل معنا
            <Icon name="arrow_back" className="text-[18px] text-champagne-gold" />
          </Link>
        </div>
      </div>
    </main>
  );
}

/** السياسات على الهاتف: نفس النصوص داخل هيكل صفحات الهاتف الموحّد. */
function PolicyMobile({ topic, policy }: { topic: string; policy: Policy }) {
  const railRef = useRef<HTMLElement>(null);
  useEffect(() => {
    railRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [topic]);

  return (
    <MobilePage title={policy.short} back>
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-imperial-burgundy text-champagne-gold shadow-royal">
          <Icon name={policy.icon} className="text-[22px]" />
        </span>
        <h1 className="font-headline-md text-headline-md font-semibold leading-snug text-deep-oxblood">{policy.title}</h1>
      </div>

      <nav
        ref={railRef}
        aria-label="سياسات المتجر"
        className="-mx-gutter-mobile mb-5 flex gap-2 overflow-x-auto px-gutter-mobile pb-1 [scrollbar-width:none]"
      >
        {TOPIC_ORDER.map((key) => (
          <Link
            key={key}
            to={`/policies/${key}`}
            replace
            aria-current={key === topic ? 'page' : undefined}
            className={cn(
              'flex h-9 shrink-0 items-center rounded-full px-4 font-label-md text-label-md transition-colors',
              key === topic ? 'bg-imperial-burgundy font-semibold text-ivory-canvas' : 'bg-blush-surface text-warm-ink active:bg-rose-mist',
            )}
          >
            {POLICIES[key].short}
          </Link>
        ))}
      </nav>

      <div className="flex flex-col gap-4">
        {policy.sections.map((s) => (
          <section key={s.heading} className={MOBILE_CARD}>
            <MobileSectionTitle className="mb-2">{s.heading}</MobileSectionTitle>
            <div className="flex flex-col gap-2">
              {s.body.map((p) => (
                <p key={p} className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link to="/contact" className={cn(MOBILE_CARD, 'mt-5 flex items-center gap-3 bg-parchment active:bg-blush-surface')}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest text-imperial-burgundy">
          <Icon name="chat" className="text-[20px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-label-lg text-label-lg font-semibold text-deep-oxblood">عندكِ سؤال آخر؟</span>
          <span className="block font-label-md text-label-md text-muted-rosewood">تواصلي معنا ويسعدنا الرد عليكِ</span>
        </span>
        <Icon name="chevron_left" className="text-[22px] text-muted-rosewood" />
      </Link>
    </MobilePage>
  );
}
