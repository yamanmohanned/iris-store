import { Outlet, useLocation } from 'react-router';
import { ChatWidget } from '@/components/store/ChatWidget';
import { MiniCartDrawer } from '@/components/store/MiniCartDrawer';
import { ScrollProgress } from '@/components/store/ScrollProgress';
import { SearchOverlay } from '@/components/store/SearchOverlay';
import { HEADER_HEIGHT, StoreHeader } from '@/components/store/StoreHeader';
import { StoreFooter } from '@/components/store/StoreFooter';
import { useRevealOnScroll } from '@/hooks/useReveal';

/**
 * تخطيط المتجر على الديسكتوب: ترويسة ثابتة + محتوى + تذييل + درج السلة + البحث + المحادثة.
 * على الهاتف يُستخدم MobileFrame بدلاً منه (AdaptiveLayout) وكل صفحة ترسم شريطيها عبر MobilePage.
 */
export function StoreLayout() {
  const { pathname } = useLocation();
  useRevealOnScroll();

  const overlay = pathname === '/';
  return (
    <div className="flex min-h-screen flex-col bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-rose-mist selection:text-imperial-burgundy">
      <ScrollProgress />
      <StoreHeader />
      <div aria-hidden className="shrink-0" style={{ height: overlay ? HEADER_HEIGHT.overlay : HEADER_HEIGHT.solid }} />
      <div className="flex-1">
        <Outlet />
      </div>
      <StoreFooter />
      <MiniCartDrawer />
      <SearchOverlay />
      <ChatWidget />
    </div>
  );
}
