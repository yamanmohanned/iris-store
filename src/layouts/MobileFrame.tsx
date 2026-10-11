import type { ReactNode } from 'react';
import { Outlet } from 'react-router';
import { useRevealOnScroll } from '@/hooks/useReveal';

/**
 * إطار شاشات الموبايل.
 *  - على الهاتف: يملأ الشاشة كاملة (التمرير على المستند).
 *  - على الشاشات الأكبر: عمود بعرض 480px محاكٍ لشاشة الهاتف؛ العناصر `fixed` داخله تبقى محصورة
 *    فيه (transform ينشئ containing block) والتمرير يتم داخل الإطار.
 */
export function MobileFrame({ children }: { children?: ReactNode }) {
  useRevealOnScroll();
  return (
    <div className="min-h-screen bg-surface md:bg-wine-night">
      <div
        data-scroll-root
        className="relative min-h-screen bg-surface font-body-md text-body-md text-on-surface antialiased md:mx-auto md:h-[100dvh] md:max-w-[480px] md:transform-gpu md:overflow-y-auto md:border-x md:border-royal-gold/30 md:shadow-[0_0_80px_rgba(0,0,0,0.45)]"
      >
        {children ?? <Outlet />}
      </div>
    </div>
  );
}
