import type { CSSProperties } from 'react';
import { useCatalog } from '@/data/catalog';
import type { Branding } from '@/lib/branding';
import { cn } from '@/lib/cn';

/** شعار الدار (Vector Smart Object) — ملف أبيض شفاف يُستخدم قناعاً ليأخذ لون النص الحالي. */
export const BRAND_MARK_SRC = '/brand/iris-mark.png';
/** نسبة العرض إلى الارتفاع للشعار الأصلي (430×706). */
const MARK_RATIO = 430 / 706;

const maskOf = (src: string): CSSProperties => ({
  WebkitMaskImage: `url(${JSON.stringify(src)})`,
  maskImage: `url(${JSON.stringify(src)})`,
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  backgroundColor: 'currentColor',
});

const DEFAULT_MASK: CSSProperties = { ...maskOf(BRAND_MARK_SRC), aspectRatio: String(MARK_RATIO) };

const NO_BRANDING: Branding = {};

/** هوية المتجر من الإعدادات (فارغة = الشعار والخطوط الأصلية). */
export function useBranding(): Branding {
  return useCatalog().settings.branding ?? NO_BRANDING;
}

/**
 * رمز الشعار وحده. الحجم من الارتفاع (h-8 مثلاً) والعرض من نسبة الصورة.
 *  - الشعار الأصلي أو شعار مرفوع مع «تلوين»: يأخذ لون النص الحالي (text-royal-gold…).
 *  - شعار مرفوع بلا تلوين: يُعرض بألوانه كما هو؛ onDark يختار نسخة الخلفيات الداكنة إن وُجدت.
 */
export function BrandMark({
  className,
  label,
  onDark,
  branding,
}: {
  className?: string;
  label?: string;
  onDark?: boolean;
  /** معاينة هوية لم تُحفظ بعد (صفحة الهوية) */
  branding?: Branding;
}) {
  const saved = useBranding();
  const b = branding ?? saved;
  const a11y = { role: label ? 'img' : undefined, 'aria-label': label, 'aria-hidden': label ? undefined : true } as const;
  const logo = (onDark && b.logoDark) || b.logo;

  if (!logo) return <span {...a11y} className={cn('inline-block h-8 shrink-0', className)} style={DEFAULT_MASK} />;

  if (b.logoTint) {
    // صورة مخفية تحدد العرض من نسبتها الطبيعية، والقناع فوقها يلوّنها بلون النص
    return (
      <span {...a11y} className={cn('relative inline-block h-8 shrink-0', className)}>
        <img src={logo} alt="" className="invisible h-full w-auto max-w-none" />
        <span className="absolute inset-0" style={maskOf(logo)} />
      </span>
    );
  }
  // شعار ملوّن بلا نسخة للخلفيات الداكنة: نعرضه أبيض هناك حتى لا يختفي (يرفع المالك نسخة داكنة ليتحكم بها)
  const silhouette = onDark && !b.logoDark;
  return (
    <img
      src={logo}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      className={cn('inline-block h-8 w-auto shrink-0 object-contain', silhouette && 'brightness-0 invert', className)}
    />
  );
}

/** كلمة IRIS بجانب الشعار — تختفي إن أوقفها المالك مع شعار مرفوع يحمل الاسم. */
export function BrandWordmark({ className, branding }: { className?: string; branding?: Branding }) {
  const saved = useBranding();
  const b = branding ?? saved;
  if (b.logo && b.showWordmark === false) return null;
  return (
    <span dir="ltr" className={cn('font-serif-brand font-normal uppercase', className)}>
      IRIS
    </span>
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
      <BrandMark className={cn(markSize, tone === 'light' ? 'text-imperial-burgundy' : 'text-champagne-gold')} onDark={tone === 'dark'} />
      <span className="flex flex-col items-start">
        <BrandWordmark className={cn('tracking-[0.22em]', wordSize, tone === 'light' ? 'text-imperial-burgundy' : 'text-champagne-gold')} />
        {subtitle && (
          <span className={cn('mt-1 font-headline-sm text-xs font-semibold', tone === 'light' ? 'text-antique-gold' : 'text-royal-gold')}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
