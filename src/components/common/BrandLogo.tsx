import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/** شعار الدار (Vector Smart Object) — ملف أبيض شفاف يُستخدم قناعاً ليأخذ لون النص الحالي. */
export const BRAND_MARK_SRC = '/brand/iris-mark.png';
/** نسبة العرض إلى الارتفاع للشعار الأصلي (430×706). */
const MARK_RATIO = 430 / 706;

const MASK: CSSProperties = {
  WebkitMaskImage: `url(${BRAND_MARK_SRC})`,
  maskImage: `url(${BRAND_MARK_SRC})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  backgroundColor: 'currentColor',
  aspectRatio: String(MARK_RATIO),
};

/**
 * رمز الشعار وحده. اللون من `currentColor` (text-royal-gold، text-imperial-burgundy…)
 * والحجم من الارتفاع (h-8 مثلاً) — العرض يُحسب من النسبة الأصلية.
 */
export function BrandMark({ className, label }: { className?: string; label?: string }) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block h-8 shrink-0', className)}
      style={MASK}
    />
  );
}

type Tone = 'dark' | 'light';

/**
 * الشعار الكامل: الرمز + «IRIS» + «آيريس».
 *  - tone="light": على خلفية فاتحة (رمز عنابي، نص عنابي/ذهبي عتيق).
 *  - tone="dark": على خلفية داكنة (رمز ونص بالذهب الشمباني).
 */
export function BrandLogo({
  tone = 'light',
  size = 'md',
  subtitle = 'آيريس',
  className,
}: {
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string | null;
  className?: string;
}) {
  const markSize = { sm: 'h-7', md: 'h-9', lg: 'h-12' }[size];
  const wordSize = { sm: 'text-xl', md: 'text-2xl', lg: 'text-[32px]' }[size];
  return (
    <span className={cn('inline-flex items-center gap-2.5 leading-none', className)}>
      <BrandMark className={cn(markSize, tone === 'light' ? 'text-imperial-burgundy' : 'text-champagne-gold')} />
      <span className="flex flex-col items-start">
        <span
          dir="ltr"
          className={cn(
            'font-serif-brand font-normal uppercase tracking-[0.22em]',
            wordSize,
            tone === 'light' ? 'text-imperial-burgundy' : 'text-champagne-gold',
          )}
        >
          IRIS
        </span>
        {subtitle && (
          <span className={cn('mt-1 font-headline-sm text-xs font-semibold', tone === 'light' ? 'text-antique-gold' : 'text-royal-gold')}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
