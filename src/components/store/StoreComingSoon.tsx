import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { cn } from '@/lib/cn';
import { useContactLinks } from '@/lib/contact';

/**
 * المتجر بلا منتجات ظاهرة بعد (مثلاً بعد «إعادة الضبط ← متجر فارغ»): رسالة لطيفة وروابط
 * التواصل من الإعدادات بدل صفحة فارغة أو أقسام بلا قطع.
 */
export function StoreComingSoon({ className }: { className?: string }) {
  const contact = useContactLinks();
  const whatsapp = contact.whatsapp('مرحباً آيريس، أود الاستفسار عن القطع المتوفرة');
  return (
    <section
      className={cn(
        'flex flex-col items-center gap-4 rounded-[28px] bg-surface-container-lowest px-6 py-12 text-center shadow-luxury',
        className,
      )}
    >
      <BrandMark className="h-14 text-imperial-burgundy" />
      <h2 className="font-headline-md text-headline-md font-bold text-deep-oxblood">نجهّز المجموعة الأولى</h2>
      <p className="max-w-md font-body-md text-body-md leading-relaxed text-muted-rosewood">
        القطع في طريقها إلى المتجر. تابعينا لتري الجديد أولاً بأول، أو راسلينا لتسألي عن قطعة رأيتِها.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {contact.instagram && (
          <a
            href={contact.instagram}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-imperial-burgundy px-5 font-label-lg text-label-lg text-ivory-canvas"
          >
            <Icon name="photo_camera" className="text-[18px] text-champagne-gold" />
            <span dir="ltr">@{contact.instagramHandle}</span>
          </a>
        )}
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blush-surface px-5 font-label-lg text-label-lg text-imperial-burgundy"
          >
            <WhatsAppIcon className="h-[18px] w-[18px]" />
            واتساب
          </a>
        )}
      </div>
    </section>
  );
}
