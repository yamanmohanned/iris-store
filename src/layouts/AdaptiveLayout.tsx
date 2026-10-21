import { useIsMobile } from '@/hooks/useMediaQuery';
import { MobileFrame } from './MobileFrame';
import { StoreLayout } from './StoreLayout';

/**
 * للصفحات التي لها تصميمان (ديسكتوب + موبايل): على الهاتف إطار الموبايل،
 * وعلى الشاشات الأكبر تخطيط المتجر.
 */
export function AdaptiveLayout() {
  return useIsMobile() ? <MobileFrame /> : <StoreLayout />;
}
