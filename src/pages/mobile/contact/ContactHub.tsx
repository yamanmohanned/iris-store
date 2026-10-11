import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { FaqAccordionItem } from '@/components/mobile/FaqAccordion';
import { MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { useCatalog } from '@/data/catalog';
import { faqGroups, topFaq } from '@/data/faq';
import { cn } from '@/lib/cn';
import { useContactLinks } from '@/lib/contact';

const LINKS = [
  { to: '/track-order', icon: 'local_shipping', label: 'تتبع طلبك' },
  { to: '/policies/shipping', icon: 'autorenew', label: 'الشحن والاستبدال' },
  { to: '/policies/size-guide', icon: 'straighten', label: 'دليل المقاسات' },
  { to: '/faq', icon: 'help', label: 'الأسئلة الشائعة' },
];

/** «تواصل معنا» على الهاتف: قنوات التواصل الحقيقية من إعدادات المتجر + روابط المساعدة + أسئلة سريعة. */
export default function ContactHub() {
  const contact = useContactLinks();
  const faq = topFaq(faqGroups(useCatalog().settings));
  const whatsapp = contact.whatsapp('مرحباً دار آيريس، لدي استفسار');
  const hasChannels = Boolean(whatsapp || contact.instagram);

  return (
    <MobilePage title="تواصل معنا" tab="contact">
      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-5 text-ivory-canvas shadow-[0_14px_36px_rgba(42,3,13,0.22)]">
        <div className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full bg-royal-gold/10 blur-2xl" />
        <h1 className="relative font-headline-md text-headline-md font-semibold text-champagne-gold">نحن هنا لمساعدتكِ</h1>
        <p className="relative mt-1.5 font-body-sm text-body-sm leading-relaxed text-rose-mist">
          اسألينا عن أي قطعة أو مقاس أو طلب، ويسعدنا الرد عليكِ.
        </p>
        <p className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 font-label-md text-label-md text-champagne-gold">
          <Icon name="schedule" className="text-[17px]" />
          يومياً 10:00 ص – 10:00 م
        </p>
      </section>

      <section className="mt-6">
        <MobileSectionTitle>قنوات التواصل</MobileSectionTitle>
        {hasChannels ? (
          <div className={cn(MOBILE_CARD, 'flex flex-col p-0')}>
            {whatsapp && (
              <ChannelRow
                href={whatsapp}
                icon={<WhatsAppIcon className="h-[22px] w-[22px]" />}
                iconClass="bg-[#E3F4EA] text-[#1F8F4E]"
                title="واتساب"
                subtitle={contact.phoneDisplay ?? ''}
                ltrSubtitle
              />
            )}
            {contact.phone && (
              <ChannelRow
                href={contact.phone}
                icon={<Icon name="call" className="text-[21px]" />}
                iconClass="bg-blush-surface text-imperial-burgundy"
                title="اتصال هاتفي"
                subtitle={contact.phoneDisplay ?? ''}
                ltrSubtitle
              />
            )}
            {contact.instagram && (
              <ChannelRow
                href={contact.instagram}
                icon={<Icon name="photo_camera" className="text-[21px]" />}
                iconClass="bg-parchment text-antique-gold"
                title="إنستغرام"
                subtitle={`@${contact.instagramHandle}`}
                ltrSubtitle
              />
            )}
          </div>
        ) : (
          <p className={cn(MOBILE_CARD, 'font-body-sm text-body-sm leading-relaxed text-muted-rosewood')}>
            لمتابعة طلب قائم استخدمي «تتبع طلبك» برقم الطلب ورقم الهاتف، وستجدين إجابات أغلب الأسئلة في الأسفل.
          </p>
        )}
      </section>

      <section className="mt-6">
        <MobileSectionTitle>روابط سريعة</MobileSectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={cn(MOBILE_CARD, 'flex items-center gap-2.5 p-3.5 active:bg-blush-surface')}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
                <Icon name={l.icon} className="text-[19px]" />
              </span>
              <span className="font-label-lg text-label-lg font-semibold leading-tight text-deep-oxblood">{l.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <MobileSectionTitle action={{ to: '/faq', label: 'كل الأسئلة' }}>أسئلة شائعة</MobileSectionTitle>
        <div className={cn(MOBILE_CARD, 'py-1')}>
          {faq.map((item, i) => (
            <FaqAccordionItem key={item.q} item={item} defaultOpen={i === 0} />
          ))}
        </div>
      </section>
    </MobilePage>
  );
}

function ChannelRow({
  href,
  icon,
  iconClass,
  title,
  subtitle,
  ltrSubtitle,
}: {
  href: string;
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  ltrSubtitle?: boolean;
}) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className="flex min-h-[64px] items-center gap-3 border-b border-hairline-burgundy px-4 py-3 last:border-b-0 active:bg-blush-surface/60"
    >
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full', iconClass)}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-label-lg text-label-lg font-semibold text-deep-oxblood">{title}</span>
        <span dir={ltrSubtitle ? 'ltr' : undefined} className="truncate text-right font-label-md text-label-md text-muted-rosewood tabular-nums">
          {subtitle}
        </span>
      </span>
      <Icon name="chevron_left" className="text-[22px] text-muted-rosewood" />
    </a>
  );
}
