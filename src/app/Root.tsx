import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { BrandingRuntime } from '@/components/common/BrandingRuntime';
import { LegacyHandlers } from '@/components/common/LegacyHandlers';
import { PlaceholderLinkGuard, ScrollToTop } from '@/components/common/PageEffects';
import { RouteSeo } from '@/components/common/RouteSeo';
import { AmbientBackdrop } from '@/components/store/AmbientBackdrop';
import { AdminAuthProvider } from '@/state/adminAuth';
import { AuthProvider } from '@/state/auth';
import { CartProvider } from '@/state/cart';
import { CatalogProvider } from '@/state/catalog';
import { CheckoutProvider } from '@/state/checkout';
import { OrdersProvider } from '@/state/orders';
import { ToastProvider } from '@/state/toast';
import { UiProvider } from '@/state/ui';
import { WishlistProvider } from '@/state/wishlist';

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory-canvas" role="status" aria-label="جارٍ التحميل">
      <BrandMark className="h-14 animate-pulse text-imperial-burgundy" />
    </div>
  );
}

/** جذر التطبيق: المزوّدات العامة + سلوكيات عامة (تمرير، روابط، معالجات قديمة). */
export function Root() {
  return (
    <ToastProvider>
      <UiProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <WishlistProvider>
              <CartProvider>
                <OrdersProvider>
                  <CheckoutProvider>
                    <ScrollToTop />
                    <PlaceholderLinkGuard />
                    <LegacyHandlers />
                    <BrandingRuntime />
                    <AmbientBackdrop />
                    <CatalogProvider fallback={<PageLoader />}>
                      <RouteSeo />
                      <Suspense fallback={<PageLoader />}>
                        <Outlet />
                      </Suspense>
                    </CatalogProvider>
                  </CheckoutProvider>
                </OrdersProvider>
              </CartProvider>
            </WishlistProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </UiProvider>
    </ToastProvider>
  );
}
