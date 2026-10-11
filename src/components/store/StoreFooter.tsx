import { Link } from 'react-router';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { useCatalog } from '@/data/catalog';
import { useContactLinks } from '@/lib/contact';

/** روابط خدمة العملاء — كلها صفحات تعمل فعلاً (كانت تعد بمواعيد استشارة وتصميم مخصص وشحن مدرّع). */
const SERVICE_LINKS = [
  { to: '/track-order', label: 'تتبع طلبك' },
  { to: '/faq', label: 'الأسئلة الشائعة' },
  { to: '/policies/shipping', label: 'الشحن والاستبدال' },
  { to: '/policies/size-guide', label: 'دليل المقاسات' },
  { to: '/policies/care', label: 'العناية بالمجوهرات' },
  { to: '/policies/authenticity', label: 'الضمان والأصالة' },
];

export function StoreFooter() {
  const { visibleCategories } = useCatalog();
  const shopLinks = visibleCategories.slice(0, 7).map((c) => ({ to: `/collections/${c.slug}`, label: c.name }));
  const contact = useContactLinks();
  const whatsapp = contact.whatsapp('مرحباً دار آيريس، لدي استفسار');

  return (
    <footer className="mt-auto w-full border-t border-royal-gold/30 bg-wine-night text-champagne-gold/90">
      <div className="mx-auto max-w-[1440px] px-6 pb-10 pt-16 lg:px-10">
        <div className="grid grid-cols-1 gap-10 border-b border-royal-gold/20 pb-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-4 lg:col-span-4">
            <BrandLogo tone="dark" size="lg" subtitle="دار المجوهرات الراقية" />
            <p className="max-w-sm pt-2 font-body-sm text-body-sm leading-relaxed text-champagne-gold/70">
              قلائد وخواتم وأساور وأقراط مختارة بعناية، مغلّفة بأناقة وتصل إلى باب بيتك في جميع المحافظات.
            </p>
            <div className="flex items-center gap-2 pt-2 text-royal-gold">
              <Icon name="verified" className="text-[18px]" />
              <span className="font-label-md text-label-md text-champagne-gold/80">ذهب مدموغ بالعيار الرسمي</span>
            </div>
          </div>

          <nav aria-label="أقسام المتجر" className="space-y-3 lg:col-span-2">
            <h3 className="mb-4 font-headline-sm text-headline-sm font-medium text-champagne-gold">المتجر</h3>
            <ul className="space-y-2.5 font-body-sm text-body-sm text-champagne-gold/75">
              {shopLinks.map((l) => (
                <li key={l.to} className="transition-colors hover:text-white">
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
              <li className="transition-colors hover:text-white">
                <Link to="/about">قصة الدار</Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="خدمة العملاء" className="space-y-3 lg:col-span-3">
            <h3 className="mb-4 font-headline-sm text-headline-sm font-medium text-champagne-gold">خدمة العملاء</h3>
            <ul className="space-y-2.5 font-body-sm text-body-sm text-champagne-gold/75">
              {SERVICE_LINKS.map((l) => (
                <li key={l.to} className="transition-colors hover:text-white">
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-4 lg:col-span-3">
            <h3 className="mb-1 font-headline-sm text-headline-sm font-medium text-champagne-gold">تواصل معنا</h3>
            <p className="font-body-sm text-body-sm text-champagne-gold/70">
              اسألنا عن أي قطعة أو مقاس أو طلب — يومياً من 10 صباحاً حتى 10 مساءً.
            </p>
            <ul className="space-y-2.5 font-body-sm text-body-sm">
              {whatsapp && (
                <li>
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-champagne-gold/85 transition-colors hover:text-white"
                  >
                    <WhatsAppIcon className="h-[18px] w-[18px] text-royal-gold" />
                    واتساب
                    <span dir="ltr" className="text-champagne-gold/60 tabular-nums">
                      {contact.phoneDisplay}
                    </span>
                  </a>
                </li>
              )}
              {contact.instagram && (
                <li>
                  <a
                    href={contact.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-champagne-gold/85 transition-colors hover:text-white"
                  >
                    <Icon name="photo_camera" className="text-[18px] text-royal-gold" />
                    إنستغرام
                    <span dir="ltr" className="text-champagne-gold/60">
                      @{contact.instagramHandle}
                    </span>
                  </a>
                </li>
              )}
              <li>
                <Link to="/contact" className="inline-flex items-center gap-2 text-champagne-gold/85 transition-colors hover:text-white">
                  <Icon name="chat" className="text-[18px] text-royal-gold" />
                  صفحة التواصل
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 font-body-sm text-body-sm text-champagne-gold/60 md:flex-row">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-royal-gold/30 bg-deep-oxblood px-3 py-1 font-label-md text-label-md text-champagne-gold">
              <Icon name="payments" className="text-[16px] text-royal-gold" />
              الدفع عند الاستلام في جميع المحافظات
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-royal-gold/30 bg-deep-oxblood px-3 py-1 font-label-md text-label-md text-champagne-gold">
              <Icon name="autorenew" className="text-[16px] text-royal-gold" />
              استبدال خلال 7 أيام
            </span>
          </div>
          <p className="font-body-sm text-body-sm">© {new Date().getFullYear()} دار آيريس للمجوهرات الراقية. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}
