import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useContactLinks } from '@/lib/contact';
import AboutMobile from '@/pages/mobile/content/AboutMobile';

export default function AboutPage() {
  return useIsMobile() ? <AboutMobile /> : <AboutDesktop />;
}

const PILLARS = [
  {
    icon: 'diamond',
    title: 'قطع مختارة',
    text: 'قلائد وخواتم وتطقيمات كبلز وإكسسوارات بطلاء ثابت، نختارها قطعة قطعة ونعرضها بصور وفيديو من القطع نفسها.',
  },
  {
    icon: 'sell',
    title: 'أسعار واضحة',
    text: 'السعر مكتوب في صفحة كل قطعة، وأجور التوصيل تظهر في السلة قبل أن تؤكدي الطلب.',
  },
  {
    icon: 'support_agent',
    title: 'خدمة قريبة',
    text: 'نتصل بكِ لتأكيد كل طلب، وتدفعين عند الاستلام بعد التأكد من القطعة. ونرد على رسائلكِ في إنستغرام وواتساب.',
  },
];

const FACTS = [
  { icon: 'local_shipping', label: 'توصيل لجميع محافظات العراق' },
  { icon: 'payments', label: 'الدفع عند الاستلام' },
  { icon: 'autorenew', label: 'استبدال خلال 7 أيام' },
  { icon: 'location_on', label: 'بغداد — العراق' },
];

/** «من نحن» للديسكتوب — ما يقدمه المتجر فعلاً، بصور القطع الحقيقية. */
function AboutDesktop() {
  const contact = useContactLinks();
  return (
    <main className="w-full">
      <section className="mx-auto grid max-w-[1200px] grid-cols-12 items-center gap-12 px-gutter py-space-3xl">
        <div className="col-span-6">
          <p className="mb-3 flex items-center gap-2 font-label-md text-label-md text-antique-gold">
            <span className="h-px w-8 bg-royal-gold" />
            من نحن
          </p>
          <h1 className="font-display-lg text-display-lg leading-tight text-warm-ink">
            التفاصيل الصغيرة
            <br />
            <span className="text-imperial-burgundy">تصنع الفرق</span>
          </h1>
          <p className="mt-6 max-w-xl font-body-xl text-body-xl leading-relaxed text-on-surface-variant">
            آيريس ستور متجر إكسسوارات من بغداد. نختار القلائد والخواتم وتطقيمات الكبلز والهدايا بعناية، ونهتم بالتفاصيل الصغيرة لأنها هي
            التي تجعل القطعة تشبهكِ. نوصل لجميع محافظات العراق، والدفع عند الاستلام.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              to="/collections/all"
              className="inline-flex items-center gap-2 rounded-xl bg-imperial-burgundy px-7 py-3.5 font-label-lg text-label-lg text-ivory-canvas shadow-[0_8px_24px_rgba(78,24,37,0.22)] hover:bg-burgundy-600"
            >
              تصفّحي القطع
              <Icon name="arrow_back" className="text-[18px]" />
            </Link>
            {contact.instagram && (
              <a
                href={contact.instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 font-label-lg text-label-lg text-imperial-burgundy hover:bg-blush-surface"
              >
                <Icon name="photo_camera" className="text-[18px] text-royal-gold" />
                <span dir="ltr">@{contact.instagramHandle}</span>
              </a>
            )}
          </div>
        </div>
        <div className="col-span-6 grid grid-cols-2 gap-4">
          <img
            src="/images/instagram/swan-box.jpg"
            alt="قلادة البجعة"
            className="aspect-[3/4] w-full rounded-t-[120px] rounded-b-2xl object-cover shadow-[0_20px_48px_rgba(42,3,13,0.16)]"
          />
          <img
            src="/images/instagram/couple-rings-set.jpg"
            alt="تطقيم خواتم كبلز"
            className="mt-12 aspect-[3/4] w-full rounded-t-[120px] rounded-b-2xl object-cover shadow-[0_20px_48px_rgba(42,3,13,0.16)]"
          />
        </div>
      </section>

      <section className="bg-parchment py-space-3xl">
        <div className="mx-auto grid max-w-[1200px] grid-cols-3 gap-6 px-gutter">
          {PILLARS.map((p) => (
            <article key={p.title} className="rounded-2xl bg-surface-container-lowest p-6 shadow-luxury">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blush-surface text-imperial-burgundy">
                <Icon name={p.icon} className="text-[24px]" />
              </span>
              <h2 className="mt-4 font-headline-sm text-headline-sm font-bold text-deep-oxblood">{p.title}</h2>
              <p className="mt-2 font-body-md text-body-md leading-relaxed text-muted-rosewood">{p.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-gutter py-space-2xl">
        <ul className="grid grid-cols-4 gap-4">
          {FACTS.map((f) => (
            <li key={f.label} className="flex items-center gap-3 rounded-2xl bg-blush-surface/60 px-4 py-4">
              <Icon name={f.icon} className="text-[22px] text-royal-gold" />
              <span className="font-label-lg text-label-lg font-semibold text-warm-ink">{f.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
