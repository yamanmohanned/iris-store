import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { useContactLinks } from '@/lib/contact';
import { useToast } from '@/state/toast';

const TOPICS = ['استفسار عن قطعة', 'المقاسات', 'متابعة طلب', 'الاستبدال والاسترجاع', 'أخرى'];

const LINKS = [
  { to: '/track-order', icon: 'local_shipping', label: 'تتبع طلبك', note: 'برقم الطلب ورقم الهاتف' },
  { to: '/policies/shipping', icon: 'autorenew', label: 'الشحن والاستبدال', note: 'التوصيل والاستبدال خلال 7 أيام' },
  { to: '/policies/size-guide', icon: 'straighten', label: 'دليل المقاسات', note: 'قياس الخاتم والقلادة والسوار' },
  { to: '/faq', icon: 'help', label: 'الأسئلة الشائعة', note: 'إجابات سريعة لأغلب الأسئلة' },
];

const INPUT =
  'w-full rounded-xl border-0 bg-ivory-canvas px-4 py-3 font-body-md text-body-md text-warm-ink shadow-[inset_0_0_0_1px_rgba(78,24,37,0.12)] placeholder:text-muted-rosewood/60 focus:outline-none focus:shadow-[inset_0_0_0_2px_rgba(78,24,37,0.4)]';

/**
 * Stitch screen 0813f4ea984e4708bef331c5596b972a «IRIS | تواصل معنا»
 * القنوات من إعدادات المتجر فقط. كانت الصفحة تعرض عنوان «بوتيك» وخريطة غير موجودين، وصالة VIP ونقلاً مصفحاً،
 * ونموذجاً يُظهر «تم الاستلام وسنتصل خلال 60 دقيقة» دون أن يُرسل شيئاً — الآن الرسالة تُجهَّز وتُفتح في واتساب الدار.
 */
export default function ContactPage() {
  const contact = useContactLinks();
  const wa = contact.whatsapp('مرحباً دار آيريس، لدي استفسار');
  const hasChannels = Boolean(wa || contact.instagram);

  return (
    <main className="w-full min-h-screen bg-ivory-canvas">
      <section className="relative w-full overflow-hidden py-space-2xl md:py-space-3xl">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-rose-mist/35 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/2 left-[-15%] h-[600px] w-[600px] rounded-full bg-champagne-gold/20 blur-[140px]" />
        <div className="relative z-10 mx-auto max-w-7xl px-gutter">
          <nav aria-label="مسار التصفح" className="mb-space-lg flex items-center gap-2 font-label-md text-label-md text-muted-rosewood">
            <Link to="/" className="hover:text-primary transition-colors">
              الرئيسية
            </Link>
            <Icon name="chevron_left" className="text-[14px] text-royal-gold" />
            <span className="font-semibold text-primary">تواصل معنا</span>
          </nav>

          <div className="mb-space-2xl max-w-3xl">
            <span className="mb-space-md inline-flex items-center gap-space-xs rounded-full bg-blush-surface px-space-md py-space-xs font-label-md text-label-md font-medium text-antique-gold">
              <Icon name="support_agent" className="text-[18px]" />
              تواصل مباشر مع الدار
            </span>
            <h1 className="font-headline-xl text-headline-xl font-bold text-warm-ink">نحن هنا لمساعدتك</h1>
            <p className="mt-space-sm font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
              اسألنا عن أي قطعة أو مقاس أو طلب، ويسعدنا الرد عليك يومياً من 10 صباحاً حتى 10 مساءً.
            </p>
          </div>

          <div className="grid grid-cols-1 items-start gap-space-xl lg:grid-cols-12">
            <div className="flex flex-col gap-space-md lg:col-span-5">
              {wa && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-space-lg text-ivory-canvas shadow-[0_16px_40px_rgba(42,3,13,0.25)]">
                  <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-royal-gold/10 blur-2xl" />
                  <div className="relative flex items-center gap-space-sm">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ivory-canvas text-[#1F8F4E]">
                      <WhatsAppIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <h2 className="font-headline-sm text-headline-sm font-semibold text-champagne-gold">المحادثة عبر واتساب</h2>
                      <p dir="ltr" className="text-right font-label-lg text-label-lg text-rose-mist tabular-nums">
                        {contact.phoneDisplay}
                      </p>
                    </div>
                  </div>
                  <p className="relative mt-space-sm font-body-sm text-body-sm leading-relaxed text-rose-mist">
                    أسرع طريقة للسؤال عن قطعة أو مقاس أو متابعة طلب.
                  </p>
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    className="relative mt-space-md inline-flex items-center gap-2 rounded-xl bg-ivory-canvas px-space-lg py-3 font-label-lg text-label-lg font-semibold text-imperial-burgundy transition-colors hover:bg-blush-surface"
                  >
                    ابدأ المحادثة
                    <Icon name="arrow_back" className="text-[18px]" />
                  </a>
                </div>
              )}

              {contact.phone && (
                <ChannelCard href={contact.phone} icon={<Icon name="call" className="text-[22px]" />} title="اتصال هاتفي">
                  <span dir="ltr" className="tabular-nums">
                    {contact.phoneDisplay}
                  </span>
                </ChannelCard>
              )}
              {contact.instagram && (
                <ChannelCard href={contact.instagram} external icon={<Icon name="photo_camera" className="text-[22px]" />} title="إنستغرام">
                  <span dir="ltr">@{contact.instagramHandle}</span>
                </ChannelCard>
              )}

              <div className="flex items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_8px_30px_rgba(42,3,13,0.05)]">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-parchment text-antique-gold">
                  <Icon name="schedule" className="text-[22px]" />
                </span>
                <div>
                  <p className="font-label-md text-label-md text-muted-rosewood">أوقات الرد</p>
                  <p className="font-label-lg text-label-lg font-semibold text-warm-ink">يومياً 10:00 ص – 10:00 م</p>
                </div>
              </div>

              {!hasChannels && (
                <p className="rounded-2xl bg-surface-container-lowest p-space-md font-body-md text-body-md leading-relaxed text-on-surface-variant shadow-[0_8px_30px_rgba(42,3,13,0.05)]">
                  لمتابعة طلب قائم استخدم «تتبع طلبك» برقم الطلب ورقم الهاتف، وستجد إجابات أغلب الأسئلة في صفحة الأسئلة الشائعة.
                </p>
              )}
            </div>

            <div className="lg:col-span-7">
              {wa ? (
                <WhatsAppComposer />
              ) : (
                <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
                  {LINKS.map((l) => (
                    <QuickLink key={l.to} {...l} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {wa && (
            <div className="mt-space-2xl grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
              {LINKS.map((l) => (
                <QuickLink key={l.to} {...l} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function ChannelCard({
  href,
  external,
  icon,
  title,
  children,
}: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="group flex items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_8px_30px_rgba(42,3,13,0.05)] transition-shadow hover:shadow-[0_12px_36px_rgba(42,3,13,0.1)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-label-lg text-label-lg font-semibold text-warm-ink">{title}</span>
        <span className="block text-right font-label-md text-label-md text-muted-rosewood">{children}</span>
      </span>
      <Icon name="chevron_left" className="text-[22px] text-muted-rosewood transition-transform group-hover:-translate-x-1" />
    </a>
  );
}

function QuickLink({ to, icon, label, note }: (typeof LINKS)[number]) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-space-sm rounded-2xl bg-surface-container-lowest p-space-md shadow-[0_8px_30px_rgba(42,3,13,0.05)] transition-shadow hover:shadow-[0_12px_36px_rgba(42,3,13,0.1)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
        <Icon name={icon} className="text-[22px]" />
      </span>
      <span className="min-w-0">
        <span className="block font-label-lg text-label-lg font-semibold text-warm-ink group-hover:text-imperial-burgundy">{label}</span>
        <span className="block font-label-md text-label-md text-muted-rosewood">{note}</span>
      </span>
    </Link>
  );
}

/** نموذج يجهّز رسالة واتساب للدار (لا يوجد بريد أو صندوق رسائل على الخادم). */
function WhatsAppComposer() {
  const contact = useContactLinks();
  const toast = useToast();
  const [name, setName] = useState('');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [orderNo, setOrderNo] = useState('');
  const [message, setMessage] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.show('يرجى كتابة الاسم والرسالة', 'error');
      return;
    }
    const text = [
      'مرحباً دار آيريس،',
      `الاسم: ${name.trim()}`,
      `الموضوع: ${topic}`,
      orderNo.trim() ? `رقم الطلب: ${orderNo.trim()}` : '',
      '',
      message.trim(),
    ]
      .filter((l, i) => l || i === 4)
      .join('\n');
    const url = contact.whatsapp(text);
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-[0_12px_40px_rgba(42,3,13,0.08)] lg:p-space-xl"
    >
      <h2 className="font-headline-lg text-headline-lg font-bold text-warm-ink">اكتب رسالتك</h2>
      <p className="mt-1 font-body-md text-body-md text-on-surface-variant">نجهّز رسالتك وتُفتح في واتساب الدار جاهزة للإرسال.</p>

      <div className="mt-space-lg grid grid-cols-1 gap-space-md sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md font-semibold text-warm-ink">الاسم *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="اسمك الكريم" className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-label-md text-label-md font-semibold text-warm-ink">
            رقم الطلب <span className="font-normal text-muted-rosewood">(اختياري)</span>
          </span>
          <input
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            inputMode="numeric"
            dir="ltr"
            placeholder="1055"
            className={`${INPUT} text-right`}
          />
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-label-md text-label-md font-semibold text-warm-ink">الموضوع</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className={INPUT}>
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="font-label-md text-label-md font-semibold text-warm-ink">الرسالة *</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="اكتب سؤالك عن القطعة أو المقاس أو الطلب…"
            className={`${INPUT} resize-none`}
          />
        </label>
      </div>

      <button
        type="submit"
        className="mt-space-lg inline-flex w-full items-center justify-center gap-2 rounded-xl bg-imperial-burgundy px-space-xl py-3.5 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_8px_24px_rgba(78,24,37,0.22)] transition-colors hover:bg-burgundy-600 active:translate-y-px sm:w-auto"
      >
        <WhatsAppIcon className="h-5 w-5 text-champagne-gold" />
        المتابعة إلى واتساب
      </button>
    </form>
  );
}
