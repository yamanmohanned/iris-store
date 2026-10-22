import { useLocation } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { cn } from '@/lib/cn';

/**
 * خلفية حيّة هادئة خلف المتجر: نقش شبكي خفيف ينساب ببطء، توهجان دافئان، وعلامة مائية كبيرة
 * لشعار المتجر (المرفوع من «الهوية» إن وُجد). تظهر في المساحات الواسعة لأن الصفحات شفافة،
 * والأشرطة الملونة (العنابي، الرق…) تبقى مصمتة فوقها. الأنماط في effects.css (ambient-*).
 *  - contained: داخل عنصر معيّن (position: relative + overflow: hidden) بدل الصفحة كلها.
 */
export function AmbientBackdrop({ contained = false }: { contained?: boolean }) {
  const { pathname } = useLocation();
  if (!contained && pathname.startsWith('/admin')) return null;
  return (
    <div aria-hidden className={cn('pointer-events-none inset-0 -z-10 overflow-hidden', contained ? 'absolute' : 'fixed')}>
      <div className="ambient-lattice" />
      <div className="ambient-glow-a" />
      <div className="ambient-glow-b" />
      <div className="ambient-mark">
        <BrandMark className="h-[78vh] max-w-[62vw] text-imperial-burgundy" />
      </div>
    </div>
  );
}
