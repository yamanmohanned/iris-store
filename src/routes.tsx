import { lazy, type JSX } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Root } from '@/app/Root';
import { RequireAccess } from '@/components/admin/RequireAccess';
import { Responsive } from '@/components/common/Responsive';
import { AdaptiveLayout } from '@/layouts/AdaptiveLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { MobileFrame } from '@/layouts/MobileFrame';
import type { Section } from '@/lib/permissions';
import { useCart } from '@/state/cart';

/* ───────── Storefront · desktop ───────── */
const HomePage = lazy(() => import('@/pages/store/home/HomePage'));
const CollectionPage = lazy(() => import('@/pages/store/collection/CollectionPage'));
const SearchPage = lazy(() => import('@/pages/store/collection/SearchPage'));
const ProductPage = lazy(() => import('@/pages/store/product/ProductPage'));
const CartPage = lazy(() => import('@/pages/store/cart/CartPage'));
const OrderSuccessDesktop = lazy(() => import('@/pages/store/order/OrderSuccessDesktop'));
const TrackOrderPage = lazy(() => import('@/pages/store/order/TrackOrderPage'));
const AboutPage = lazy(() => import('@/pages/store/content/AboutPage'));
const ContactPage = lazy(() => import('@/pages/store/content/ContactPage'));
const FaqPage = lazy(() => import('@/pages/store/content/FaqPage'));
const NotFoundPage = lazy(() => import('@/pages/store/system/NotFoundPage'));
const MaintenancePage = lazy(() => import('@/pages/store/system/MaintenancePage'));
const ReturnRequestDesktop = lazy(() => import('@/pages/store/returns/ReturnRequestDesktop'));
const PolicyPage = lazy(() => import('@/pages/store/content/PolicyPage'));
const WishlistPage = lazy(() => import('@/pages/store/account/WishlistPage'));

/* ───────── Storefront · shared ───────── */
// حسابي: لا توجد حسابات زبائن على الخادم بعد — صفحة واحدة صادقة بدل ملف شخصي وهمي وشاشات دخول لا تعمل
const AccountHub = lazy(() => import('@/pages/account/AccountHub'));

/* ───────── Storefront · mobile ───────── */
const SplashScreen = lazy(() => import('@/pages/mobile/onboarding/SplashScreen'));
const MobileHome = lazy(() => import('@/pages/mobile/home/MobileHome'));
const CategoriesTab = lazy(() => import('@/pages/mobile/categories/CategoriesTab'));
const MobileCategory = lazy(() => import('@/pages/mobile/collection/MobileCategory'));
const ProductMobile = lazy(() => import('@/pages/mobile/product/ProductMobile'));
const MobileSearch = lazy(() => import('@/pages/mobile/search/MobileSearch'));
const CartMobile = lazy(() => import('@/pages/mobile/cart/CartMobile'));
const CartEmptyMobile = lazy(() => import('@/pages/mobile/cart/CartEmptyMobile'));
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'));
const OrderSuccessMobile = lazy(() => import('@/pages/mobile/order/OrderSuccessMobile'));
const NotificationsInbox = lazy(() => import('@/pages/mobile/inbox/NotificationsInbox'));
const InAppChat = lazy(() => import('@/pages/mobile/chat/InAppChat'));
const ContactHub = lazy(() => import('@/pages/mobile/contact/ContactHub'));
const ReturnItems = lazy(() => import('@/pages/mobile/returns/ReturnItems'));
const SystemUpdates = lazy(() => import('@/pages/mobile/system/SystemUpdates'));
const NoConnection = lazy(() => import('@/pages/mobile/system/NoConnection'));

/* ───────── Admin ───────── */
const AdminLogin = lazy(() => import('@/pages/admin/auth/AdminLogin'));
const OwnerDashboard = lazy(() => import('@/pages/admin/dashboard/OwnerDashboard'));
const EmployeeDashboard = lazy(() => import('@/pages/admin/dashboard/EmployeeDashboard'));
const AdminOverview = lazy(() => import('@/pages/admin/store/AdminOverview'));
const OrdersAdmin = lazy(() => import('@/pages/admin/store/OrdersAdmin'));
const CategoriesAdmin = lazy(() => import('@/pages/admin/store/CategoriesAdmin'));
const ProductsAdmin = lazy(() => import('@/pages/admin/store/ProductsAdmin'));
const ProductEditor = lazy(() => import('@/pages/admin/store/ProductEditor'));
const InstagramImport = lazy(() => import('@/pages/admin/store/instagram/InstagramImport'));
const StaffAdmin = lazy(() => import('@/pages/admin/store/StaffAdmin'));
const SettingsLayout = lazy(() => import('@/pages/admin/store/settings/SettingsLayout'));
const SettingsIndex = lazy(() => import('@/pages/admin/store/settings/SettingsLayout').then((m) => ({ default: m.SettingsIndex })));
const StoreSettingsTab = lazy(() => import('@/pages/admin/store/settings/StoreSettingsTab'));
const BrandingSettings = lazy(() => import('@/pages/admin/store/settings/BrandingSettings'));
const AccountSettings = lazy(() => import('@/pages/admin/store/settings/AccountSettings'));
const InstagramSettings = lazy(() => import('@/pages/admin/store/settings/InstagramSettings'));
const ResetSettings = lazy(() => import('@/pages/admin/store/settings/ResetSettings'));
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

/** السلة: تصميم «ممتلئة» أو «فارغة» بحسب المحتوى. */
function CartRoute() {
  const { items } = useCart();
  const filled = items.length > 0;
  return <Responsive desktop={<CartPage />} mobile={filled ? <CartMobile /> : <CartEmptyMobile />} />;
}

const adaptive: RouteObject[] = [
  { index: true, element: <Responsive desktop={<HomePage />} mobile={<MobileHome />} /> },
  { path: 'collections/:slug', element: <Responsive desktop={<CollectionPage />} mobile={<MobileCategory />} /> },
  { path: 'products/:slug', element: <Responsive desktop={<ProductPage />} mobile={<ProductMobile />} /> },
  { path: 'cart', element: <CartRoute /> },
  { path: 'order-success/:orderId', element: <Responsive desktop={<OrderSuccessDesktop />} mobile={<OrderSuccessMobile />} /> },
  { path: 'track-order', element: <TrackOrderPage /> },
  { path: 'account', element: <AccountHub /> },
  { path: 'account/orders', element: <TrackOrderPage /> },
  { path: 'login', element: <Navigate to="/account" replace /> },
  { path: 'verify', element: <Navigate to="/account" replace /> },
  { path: 'returns/new', element: <Responsive desktop={<ReturnRequestDesktop />} mobile={<ReturnItems />} /> },
  { path: 'contact', element: <Responsive desktop={<ContactPage />} mobile={<ContactHub />} /> },
  { path: 'checkout', element: <CheckoutPage step="contact" /> },
  { path: 'checkout/delivery', element: <CheckoutPage step="delivery" /> },
  { path: 'checkout/payment', element: <CheckoutPage step="payment" /> },
  { path: 'checkout/review', element: <CheckoutPage step="review" /> },
  { path: 'search', element: <Responsive desktop={<SearchPage />} mobile={<MobileSearch />} /> },
  { path: 'wishlist', element: <WishlistPage /> },
  // صفحات نصية: كل صفحة تختار تصميم الهاتف بنفسها (MobilePage) لأنها تُعرض أيضاً من صفحات أخرى (مثل 404)
  { path: 'about', element: <AboutPage /> },
  { path: 'faq', element: <FaqPage /> },
  { path: 'policies/:topic', element: <PolicyPage /> },
  { path: '404', element: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
];

const mobileOnly: RouteObject[] = [
  { path: 'welcome', element: <SplashScreen /> },
  { path: 'categories', element: <CategoriesTab /> },
  { path: 'notifications', element: <NotificationsInbox /> },
  { path: 'chat', element: <InAppChat /> },
  { path: 'offline', element: <NoConnection /> },
  { path: 'system-updates', element: <SystemUpdates /> },
];

/** صفحة تحتاج صلاحية: الخادم يرفض الطلبات أصلاً، وهذا يعرض رسالة واضحة بدل صفحة معطلة. */
const guard = (element: JSX.Element, section: Section, level: 'view' | 'edit' = 'view') => (
  <RequireAccess section={section} level={level}>
    {element}
  </RequireAccess>
);
const ownerOnly = (element: JSX.Element) => <RequireAccess owner>{element}</RequireAccess>;

const admin: RouteObject[] = [
  // إدارة المتجر الفعلية (مربوطة بالخادم، وكل صفحة بحسب صلاحية الحساب)
  { index: true, element: <AdminOverview /> },
  { path: 'orders', element: guard(<OrdersAdmin />, 'orders') },
  { path: 'orders/:orderId', element: guard(<OrdersAdmin />, 'orders') },
  { path: 'categories', element: guard(<CategoriesAdmin />, 'categories') },
  { path: 'products', element: guard(<ProductsAdmin />, 'products') },
  { path: 'products/new', element: guard(<ProductEditor />, 'products', 'edit') },
  { path: 'products/:productId', element: guard(<ProductEditor />, 'products') },
  { path: 'instagram', element: guard(<InstagramImport />, 'products', 'edit') },
  { path: 'staff', element: ownerOnly(<StaffAdmin />) },
  {
    path: 'settings',
    element: <SettingsLayout />,
    children: [
      { index: true, element: <SettingsIndex /> },
      { path: 'store', element: guard(<StoreSettingsTab />, 'settings') },
      { path: 'branding', element: guard(<BrandingSettings />, 'settings') },
      { path: 'account', element: <AccountSettings /> },
      { path: 'instagram', element: ownerOnly(<InstagramSettings />) },
      { path: 'reset', element: ownerOnly(<ResetSettings />) },
    ],
  },
  // شاشات التصميم الأصلية ببيانات تجريبية: غير موجودة في القائمة، وللمالك فقط
  ...(
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
];

export const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { element: <AdaptiveLayout />, children: adaptive },
      { element: <MobileFrame />, children: mobileOnly },
      { path: 'maintenance', element: <MaintenancePage /> },
      { path: 'admin/login', element: <AdminLogin /> },
      { path: 'admin/2fa', element: <Navigate to="/admin/login" replace /> },
      { path: 'admin/password-reset', element: <Navigate to="/admin/login" replace /> },
      { path: 'admin/stock-count', element: <StockCount /> },
      { path: 'admin', element: <AdminLayout />, children: admin },
    ],
  },
]);
