import { lazy, type JSX } from 'react';
import type { RouteObject } from 'react-router';
import { RequireAccess } from '@/components/admin/RequireAccess';
import { Responsive } from '@/components/common/Responsive';

/**
 * شاشات التصميم الأصلية (Stitch) ببيانات وهمية: تبقى للمقارنة مع التصميم أثناء التطوير فقط (scripts/qa/app-vs-design.mjs).
 * routes.tsx لا يستدعي mockupRoutes() إلا حين import.meta.env.DEV، فلا تدخل الحزمة المنشورة ولا تُفتح من الإنترنت:
 * فيها «مستشار متصل الآن» ورقم هاتف وهمي ونماذج لا ترسل شيئاً، وهذا يخالف قاعدة المحتوى الصادق.
 */
export type MockupRoutes = {
  adaptive: RouteObject[];
  mobileOnly: RouteObject[];
  top: RouteObject[];
  admin: RouteObject[];
};

export function mockupRoutes(): MockupRoutes {
  const SplashScreen = lazy(() => import('@/pages/mobile/onboarding/SplashScreen'));
  const NotificationsInbox = lazy(() => import('@/pages/mobile/inbox/NotificationsInbox'));
  const InAppChat = lazy(() => import('@/pages/mobile/chat/InAppChat'));
  const SystemUpdates = lazy(() => import('@/pages/mobile/system/SystemUpdates'));
  const NoConnection = lazy(() => import('@/pages/mobile/system/NoConnection'));
  const ReturnItems = lazy(() => import('@/pages/mobile/returns/ReturnItems'));
  const ReturnRequestDesktop = lazy(() => import('@/pages/store/returns/ReturnRequestDesktop'));
  const MaintenancePage = lazy(() => import('@/pages/store/system/MaintenancePage'));
  const OwnerDashboard = lazy(() => import('@/pages/admin/dashboard/OwnerDashboard'));
  const EmployeeDashboard = lazy(() => import('@/pages/admin/dashboard/EmployeeDashboard'));
  const ReturnProcessing = lazy(() => import('@/pages/admin/orders/ReturnProcessing'));
  const InventoryOverview = lazy(() => import('@/pages/admin/inventory/InventoryOverview'));
  const StockMovements = lazy(() => import('@/pages/admin/inventory/StockMovements'));
  const StockAdjustment = lazy(() => import('@/pages/admin/inventory/StockAdjustment'));
  const StockCount = lazy(() => import('@/pages/admin/inventory/StockCount'));
  const PurchasingBatches = lazy(() => import('@/pages/admin/purchasing/PurchasingBatches'));
  const NewPurchase = lazy(() => import('@/pages/admin/purchasing/NewPurchase'));
  const SuppliersList = lazy(() => import('@/pages/admin/suppliers/SuppliersList'));
  const SupplierProfile = lazy(() => import('@/pages/admin/suppliers/SupplierProfile'));
  const CustomersList = lazy(() => import('@/pages/admin/customers/CustomersList'));
  const CustomerProfile = lazy(() => import('@/pages/admin/customers/CustomerProfile'));
  const UnifiedInbox = lazy(() => import('@/pages/admin/inbox/UnifiedInbox'));
  const PaymentsBalances = lazy(() => import('@/pages/admin/finance/PaymentsBalances'));
  const Expenses = lazy(() => import('@/pages/admin/finance/Expenses'));
  const AccountingPnl = lazy(() => import('@/pages/admin/finance/AccountingPnl'));
  const AccountingSettings = lazy(() => import('@/pages/admin/finance/AccountingSettings'));
  const Coupons = lazy(() => import('@/pages/admin/marketing/Coupons'));
  const StorefrontContent = lazy(() => import('@/pages/admin/storefront/StorefrontContent'));
  const ReportsHub = lazy(() => import('@/pages/admin/reports/ReportsHub'));
  const SalesByChannel = lazy(() => import('@/pages/admin/reports/SalesByChannel'));
  const AuditLog = lazy(() => import('@/pages/admin/system/AuditLog'));
  const SystemHealth = lazy(() => import('@/pages/admin/system/SystemHealth'));
  const MasterArchive = lazy(() => import('@/pages/admin/system/MasterArchive'));
  const NotificationCenter = lazy(() => import('@/pages/admin/system/NotificationCenter'));

  const ownerOnly = (element: JSX.Element) => <RequireAccess owner>{element}</RequireAccess>;

  return {
    adaptive: [{ path: 'returns/new', element: <Responsive desktop={<ReturnRequestDesktop />} mobile={<ReturnItems />} /> }],
    mobileOnly: [
      { path: 'welcome', element: <SplashScreen /> },
      { path: 'notifications', element: <NotificationsInbox /> },
      { path: 'chat', element: <InAppChat /> },
      { path: 'offline', element: <NoConnection /> },
      { path: 'system-updates', element: <SystemUpdates /> },
    ],
    top: [
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'admin/stock-count', element: <StockCount /> },
    ],
    admin: (
      [
        ['dashboard', <OwnerDashboard />],
        ['employee', <EmployeeDashboard />],
        ['returns/:returnId', <ReturnProcessing />],
        ['inventory', <InventoryOverview />],
        ['inventory/movements', <StockMovements />],
        ['inventory/adjust', <StockAdjustment />],
        ['purchases', <PurchasingBatches />],
        ['purchases/new', <NewPurchase />],
        ['suppliers', <SuppliersList />],
        ['suppliers/:supplierId', <SupplierProfile />],
        ['customers', <CustomersList />],
        ['customers/:customerId', <CustomerProfile />],
        ['inbox', <UnifiedInbox />],
        ['payments', <PaymentsBalances />],
        ['expenses', <Expenses />],
        ['accounting', <AccountingPnl />],
        ['accounting/settings', <AccountingSettings />],
        ['coupons', <Coupons />],
        ['storefront', <StorefrontContent />],
        ['reports', <ReportsHub />],
        ['reports/sales-by-channel', <SalesByChannel />],
        ['audit-log', <AuditLog />],
        ['system-health', <SystemHealth />],
        ['archive', <MasterArchive />],
        ['notifications', <NotificationCenter />],
      ] as Array<[string, JSX.Element]>
    ).map(([path, element]) => ({ path, element: ownerOnly(element) })),
  };
}
