import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { useMobileScrollY } from '@/hooks/useScroll';
import { cn } from '@/lib/cn';
import { useCart } from '@/state/cart';

/** ارتفاع الشريط العلوي (h-16) + المنطقة الآمنة — المحتوى تحته يبدأ بهذه المسافة. */
export const MOBILE_TOP_OFFSET = 'pt-[calc(4rem+env(safe-area-inset-top,0px))]';

/** زر دائري بنفس المقاس في كل الشرائط (44px لمسة مريحة). */
export function topBarButtonClass(solid = true): string {
  return cn(
    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all active:scale-95',
    solid
      ? 'text-warm-ink hover:bg-blush-surface'
      : 'bg-wine-night/45 text-ivory-canvas shadow-[0_4px_16px_rgba(42,3,13,0.25)] ring-1 ring-white/15 backdrop-blur-md',
  );
}

/**
 * الشريط العلوي الموحّد لكل شاشات الهاتف:
 *  - يمين: رجوع (في الصفحات الداخلية) أو بحث (في صفحات التبويبات)
 *  - الوسط: عنوان الصفحة أو شعار الدار
 *  - يسار: البحث + السلة، أو محتوى مخصص (`end`)
 *  - overlay: شفاف فوق صورة الغلاف ويتحول إلى شريط عاجي عند التمرير (نمط المنيو المرجعي).
 */
export function MobileTopBar({
  title,
  back,
  overlay = false,
  threshold = 180,
  end,
  onBack,
}: {
  title?: string;
  /** زر رجوع؛ نص = المسار البديل إن لم يوجد سجل تصفح */
  back?: boolean | string;
  overlay?: boolean;
  /** مسافة التمرير التي يصبح بعدها الشريط مصمتاً */
  threshold?: number;
  /** محتوى بديل للطرف الأيسر (الافتراضي: البحث + السلة)؛ false = بلا أزرار (مثل إتمام الطلب) */
  end?: ReactNode | false;
  /** سلوك رجوع مخصص (مثل الرجوع للخطوة السابقة في إتمام الطلب) */
  onBack?: () => void;
}) {
  const y = useMobileScrollY();
  const solid = !overlay || y > threshold;
  const navigate = useNavigate();
  const location = useLocation();
  const { count } = useCart();
  const onCart = location.pathname === '/cart';

  const goBack = () => {
    if (onBack) return onBack();
    if (location.key === 'default') navigate(typeof back === 'string' ? back : '/');
    else navigate(-1);
  };

  const btn = topBarButtonClass(solid);

  return (
    <header
      className={cn(
        'pt-safe fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300',
        solid ? 'bg-ivory-canvas/95 shadow-[0_1px_0_rgba(78,24,37,0.08),0_6px_20px_rgba(42,3,13,0.05)] backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="flex h-16 items-center justify-between gap-2 px-2">
        <div className="flex w-[96px] items-center gap-0.5">
          {back ? (
            <button type="button" aria-label="رجوع" onClick={goBack} className={btn}>
              <Icon name="arrow_forward" className="text-[22px]" />
            </button>
          ) : (
            <Link to="/search" aria-label="بحث" className={btn}>
              <Icon name="search" className="text-[22px]" />
            </Link>
          )}
        </div>

        <Link
          to="/"
          aria-label="آيريس — الرئيسية"
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center gap-2 transition-all duration-300',
            solid ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
          )}
        >
          {title ? (
            <span className="truncate font-headline-sm text-[1.125rem] font-semibold leading-tight text-deep-oxblood">{title}</span>
          ) : (
            <>
              <BrandMark className="h-7 text-imperial-burgundy" />
              <span dir="ltr" className="font-serif-brand text-xl uppercase tracking-[0.22em] text-imperial-burgundy">
                IRIS
              </span>
            </>
          )}
        </Link>

        <div className="flex w-[96px] items-center justify-end gap-0.5">
          {end === false ? null : end ?? (
            <>
              {back && (
                <Link to="/search" aria-label="بحث" className={btn}>
                  <Icon name="search" className="text-[22px]" />
                </Link>
              )}
              {!onCart && (
                <Link to="/cart" aria-label={count > 0 ? `السلة (${count})` : 'السلة'} className={btn}>
                  <Icon name="shopping_bag" className="text-[22px]" />
                  {count > 0 && (
                    <span className="absolute left-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-royal-gold px-1 font-label-sm text-[11px] font-bold leading-none text-wine-night ring-2 ring-ivory-canvas tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
