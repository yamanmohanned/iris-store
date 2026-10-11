import { Link } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { MOBILE_BTN_LIGHT, MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { cn } from '@/lib/cn';

const PILLARS = [
  {
    title: 'جودة مختارة',
    text: 'ذهب عيار 18 و21 مختوم بدمغة العيار الرسمية، وأحجار كريمة تُرفق بشهادتها عند توفرها.',
  },
  {
    title: 'تغليف أنيق',
    text: 'تصل كل قطعة في صندوق الدار المخملي، جاهزة للإهداء من لحظة وصولها.',
  },
  {
    title: 'خدمة قريبة',
    text: 'نتصل بكِ لتأكيد كل طلب، وتدفعين عند الاستلام بعد معاينة القطعة.',
  },
];

const FACTS = [
  { icon: 'verified', label: 'ذهب مدموغ عيار 18 و21' },
  { icon: 'local_shipping', label: 'توصيل لكل المحافظات' },
  { icon: 'payments', label: 'الدفع عند الاستلام' },
  { icon: 'autorenew', label: 'استبدال خلال 7 أيام' },
];

/** «قصة الدار» على الهاتف — نسخة مختصرة وواضحة بدل تصميم الديسكتوب الطويل. */
export default function AboutMobile() {
  return (
    <MobilePage title="قصة الدار" back>
      <section className="relative overflow-hidden rounded-[22px] bg-wine-night shadow-[0_14px_36px_rgba(42,3,13,0.22)]">
        <img src="/images/stitch/169.jpg" alt="" className="aspect-[4/5] w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-wine-night via-wine-night/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-label-md text-label-md text-champagne-gold">حكاية دار آيريس</p>
          <h1 className="mt-1 font-headline-lg text-headline-lg font-semibold leading-snug text-ivory-canvas">
            نختار بعناية…
            <br />
            ونغلّف بحب
          </h1>
        </div>
      </section>

      <p className="mt-5 font-body-md text-body-md leading-[1.9] text-on-surface-variant">
        آيريس دار مجوهرات تنتقي القلائد والخواتم والأساور والأقراط من الذهب والأحجار الكريمة بتصاميم راقية، وتوصلها مغلّفة بأناقة إلى باب
        بيتكِ في جميع المحافظات.
      </p>

      <blockquote className="mt-6 rounded-2xl bg-parchment px-5 py-6 text-center">
        <BrandMark className="h-7 text-royal-gold" />
        <p className="mt-3 font-headline-sm text-headline-sm font-semibold leading-relaxed text-deep-oxblood">
          المجوهرات ليست زينة عابرة، بل ذاكرة تُصاغ من نقاء الذهب ويحفظها الزمن في قلوب من نحب.
        </p>
      </blockquote>

      <section className="mt-7">
        <MobileSectionTitle>ما يميز دار آيريس</MobileSectionTitle>
        <ol className={cn(MOBILE_CARD, 'flex flex-col p-0')}>
          {PILLARS.map((p, i) => (
            <li key={p.title} className="flex gap-4 border-b border-hairline-burgundy px-4 py-4 last:border-b-0">
              <span dir="ltr" className="font-serif-brand text-[1.75rem] leading-none text-royal-gold">
                0{i + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-label-lg text-label-lg font-bold text-deep-oxblood">{p.title}</h3>
                <p className="mt-1 font-body-sm text-body-sm leading-relaxed text-muted-rosewood">{p.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ul className="mt-4 grid grid-cols-2 gap-3">
        {FACTS.map((f) => (
          <li key={f.label} className={cn(MOBILE_CARD, 'flex flex-col items-start gap-2 p-3.5')}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
              <Icon name={f.icon} className="text-[19px]" />
            </span>
            <span className="font-label-md text-label-md font-semibold leading-snug text-deep-oxblood">{f.label}</span>
          </li>
        ))}
      </ul>

      <section className="mt-7 overflow-hidden rounded-[22px] bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-5 text-center shadow-[0_14px_36px_rgba(42,3,13,0.22)]">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-champagne-gold">اكتشفي تشكيلة آيريس</h2>
        <p className="mt-1 font-body-sm text-body-sm leading-relaxed text-rose-mist">
          قطع مختارة لكل مناسبة، بأسعار واضحة ودفع عند الاستلام.
        </p>
        <Link to="/categories" className={cn(MOBILE_BTN_LIGHT, 'mt-4')}>
          تصفّحي الأقسام
          <Icon name="arrow_back" className="text-[20px]" />
        </Link>
        <Link to="/contact" className="mt-3 inline-flex min-h-[40px] items-center gap-1 font-label-md text-label-md text-champagne-gold">
          تواصلي معنا
          <Icon name="chevron_left" className="text-[18px]" />
        </Link>
      </section>
    </MobilePage>
  );
}
