import type { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/useMediaQuery';

/** يعرض تصميم الموبايل على الشاشات الصغيرة وتصميم الديسكتوب على غيرها. */
export function Responsive({ desktop, mobile }: { desktop: ReactNode; mobile: ReactNode }) {
  return <>{useIsMobile() ? mobile : desktop}</>;
}
