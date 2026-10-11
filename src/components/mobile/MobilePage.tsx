import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { MobileTabBar, type MobileTab } from './MobileTabBar';
import { MOBILE_TOP_OFFSET, MobileTopBar } from './MobileTopBar';

/**
 * هيكل موحّد لصفحات الهاتف: الشريط العلوي + المحتوى بهوامش ثابتة + شريط التبويب السفلي.
 * كل الشاشات تستخدمه حتى تتطابق المسافات والعناوين والخلفية بين صفحة وأخرى.
 */
export function MobilePage({
  title,
  back,
  tab,
  end,
  footer,
  children,
  className,
}: {
  title?: string;
  back?: boolean | string;
  /** التبويب النشط في الشريط السفلي؛ false = بلا شريط (مثل صفحة المنتج وإتمام الطلب) */
  tab?: MobileTab | false;
  end?: ReactNode;
  /** شريط إجراءات ثابت أسفل الصفحة (يظهر فوق شريط التبويب إن وُجد) */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-ivory-canvas text-warm-ink">
      <MobileTopBar title={title} back={back} end={end} />
      <main className={cn('flex-1 px-gutter-mobile', MOBILE_TOP_OFFSET, tab === false ? 'pb-10' : 'pb-32', className)}>
        <div className="pt-4">{children}</div>
      </main>
      {footer}
      {tab !== false && <MobileTabBar active={tab} />}
    </div>
  );
}

/** عنوان قسم داخل صفحة الهاتف (نفس الحجم والوزن واللون في كل مكان). */
export function MobileSectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  /** رابط جانبي صغير مثل «عرض الكل» */
  action?: { to: string; label: string };
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 font-headline-sm text-[1.125rem] font-semibold leading-snug text-deep-oxblood">
        <span aria-hidden className="text-[8px] text-royal-gold">
          ◆
        </span>
        {children}
      </h2>
      {action && (
        <Link to={action.to} className="-my-2 flex min-h-[40px] shrink-0 items-center gap-0.5 font-label-md text-label-md text-antique-gold">
          {action.label}
          <Icon name="chevron_left" className="text-[18px]" />
        </Link>
      )}
    </div>
  );
}

/** بطاقة بيضاء موحّدة لمحتوى الصفحات. */
export const MOBILE_CARD = 'rounded-2xl bg-surface-container-lowest p-4 shadow-[0_0_0_1px_rgba(78,24,37,0.05),0_6px_20px_rgba(42,3,13,0.05)]';

/** أزرار موحّدة */
export const MOBILE_BTN_PRIMARY =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-imperial-burgundy px-5 font-label-lg text-label-lg font-semibold text-ivory-canvas shadow-[0_8px_20px_rgba(78,24,37,0.22)] transition-colors active:translate-y-px hover:bg-burgundy-600 disabled:bg-surface-container-high disabled:text-muted-rosewood disabled:shadow-none';
/** زر فاتح فوق البطاقات الداكنة (العنابية) */
export const MOBILE_BTN_LIGHT =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-ivory-canvas px-5 font-label-lg text-label-lg font-semibold text-imperial-burgundy shadow-[0_8px_20px_rgba(42,3,13,0.25)] transition-colors active:translate-y-px hover:bg-blush-surface';
export const MOBILE_BTN_SECONDARY =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-surface-container-lowest px-5 font-label-lg text-label-lg font-semibold text-imperial-burgundy shadow-[0_0_0_1px_rgba(78,24,37,0.18)] transition-colors active:translate-y-px hover:bg-blush-surface';
