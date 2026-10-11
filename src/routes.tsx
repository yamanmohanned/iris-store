import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { Root } from '@/app/Root';
import { Responsive } from '@/components/common/Responsive';
import { AdaptiveLayout } from '@/layouts/AdaptiveLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { MobileFrame } from '@/layouts/MobileFrame';
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
const StoreSettingsAdmin = lazy(() => import('@/pages/admin/store/StoreSettingsAdmin'));
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
const StaffManagement = lazy(() => import('@/pages/admin/staff/StaffManagement'));
const PermissionsMatrix = lazy(() => import('@/pages/admin/staff/PermissionsMatrix'));
const AuditLog = lazy(() => import('@/pages/admin/system/AuditLog'));
const SystemHealth = lazy(() => import('@/pages/admin/system/SystemHealth'));
const MasterArchive = lazy(() => import('@/pages/admin/system/MasterArchive'));
const NotificationCenter = lazy(() => import('@/pages/admin/system/NotificationCenter'));
const SocialChannels = lazy(() => import('@/pages/admin/settings/SocialChannels'));
const CurrencyOrders = lazy(() => import('@/pages/admin/settings/CurrencyOrders'));

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

const admin: RouteObject[] = [
  // إدارة المتجر الفعلية (مربوطة بالخادم)
  { index: true, element: <AdminOverview /> },
  { path: 'orders', element: <OrdersAdmin /> },
  { path: 'orders/:orderId', element: <OrdersAdmin /> },
  { path: 'categories', element: <CategoriesAdmin /> },
  { path: 'products', element: <ProductsAdmin /> },
  { path: 'products/new', element: <ProductEditor /> },
  { path: 'products/:productId', element: <ProductEditor /> },
  { path: 'settings', element: <StoreSettingsAdmin /> },
  // شاشات التصميم الأصلية ببيانات تجريبية
  { path: 'dashboard', element: <OwnerDashboard /> },
  { path: 'employee', element: <EmployeeDashboard /> },
  { path: 'returns/:returnId', element: <ReturnProcessing /> },
  { path: 'inventory', element: <InventoryOverview /> },
  { path: 'inventory/movements', element: <StockMovements /> },
  { path: 'inventory/adjust', element: <StockAdjustment /> },
  { path: 'purchases', element: <PurchasingBatches /> },
  { path: 'purchases/new', element: <NewPurchase /> },
  { path: 'suppliers', element: <SuppliersList /> },
  { path: 'suppliers/:supplierId', element: <SupplierProfile /> },
  { path: 'customers', element: <CustomersList /> },
  { path: 'customers/:customerId', element: <CustomerProfile /> },
  { path: 'inbox', element: <UnifiedInbox /> },
  { path: 'payments', element: <PaymentsBalances /> },
  { path: 'expenses', element: <Expenses /> },
  { path: 'accounting', element: <AccountingPnl /> },
  { path: 'accounting/settings', element: <AccountingSettings /> },
  { path: 'coupons', element: <Coupons /> },
  { path: 'storefront', element: <StorefrontContent /> },
  { path: 'reports', element: <ReportsHub /> },
  { path: 'reports/sales-by-channel', element: <SalesByChannel /> },
  { path: 'staff', element: <StaffManagement /> },
  { path: 'staff/permissions', element: <PermissionsMatrix /> },
  { path: 'audit-log', element: <AuditLog /> },
  { path: 'system-health', element: <SystemHealth /> },
  { path: 'archive', element: <MasterArchive /> },
  { path: 'notifications', element: <NotificationCenter /> },
  { path: 'settings/social', element: <SocialChannels /> },
  { path: 'settings/currency', element: <CurrencyOrders /> },
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
