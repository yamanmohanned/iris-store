import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { useAdminAuth } from '@/state/adminAuth';
import { useAdminOrders } from '@/state/adminOrders';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

/** صفحات إدارة المتجر الفعلية (مربوطة بالخادم). */
const STORE_ITEMS: NavItem[] = [
  { to: '/admin', label: 'نظرة عامة', icon: 'space_dashboard', end: true },
  { to: '/admin/orders', label: 'الطلبات', icon: 'receipt_long' },
  { to: '/admin/categories', label: 'الأقسام', icon: 'category' },
  { to: '/admin/products', label: 'المنتجات', icon: 'diamond' },
  { to: '/admin/settings', label: 'إعدادات المتجر', icon: 'tune' },
];

/** شاشات التصميم الأصلية — واجهات ببيانات تجريبية لم تُربط بالخادم بعد. */
const DEMO_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'لوحة المالك التفصيلية', icon: 'dashboard' },
  { to: '/admin/inbox', label: 'صندوق الوارد', icon: 'forum' },
  { to: '/admin/inventory', label: 'المخزون', icon: 'inventory_2' },
  { to: '/admin/purchases', label: 'المشتريات', icon: 'shopping_cart_checkout' },
  { to: '/admin/suppliers', label: 'الموردون', icon: 'local_shipping' },
  { to: '/admin/customers', label: 'العملاء', icon: 'groups' },
  { to: '/admin/coupons', label: 'الكوبونات', icon: 'sell' },
  { to: '/admin/storefront', label: 'واجهة المتجر', icon: 'storefront' },
  { to: '/admin/expenses', label: 'المصاريف', icon: 'request_quote' },
  { to: '/admin/payments', label: 'المدفوعات', icon: 'payments' },
  { to: '/admin/accounting', label: 'المحاسبة', icon: 'account_balance' },
  { to: '/admin/reports', label: 'التقارير', icon: 'monitoring' },
  { to: '/admin/staff', label: 'الموظفون', icon: 'badge', end: true },
  { to: '/admin/audit-log', label: 'سجل التدقيق', icon: 'fact_check' },
  { to: '/admin/system-health', label: 'صحة النظام', icon: 'health_and_safety' },
];

function Item({ item, badge, onNavigate }: { item: NavItem; badge?: number; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between rounded-lg px-space-md py-2 transition-all duration-150',
          isActive
            ? 'border-r-[3px] border-royal-gold bg-deep-oxblood pr-[calc(theme(spacing.space-md)-3px)] font-bold text-champagne-gold shadow-inner'
            : 'font-label-md text-label-md text-rose-mist/80 hover:bg-deep-oxblood/60 hover:text-champagne-gold',
        )
      }
    >
      <span className="flex items-center gap-3">
        <Icon name={item.icon} className="text-[20px] opacity-80" />
        <span>{item.label}</span>
      </span>
      {badge ? (
        <span className="rounded-full bg-royal-gold px-2 py-0.5 font-label-sm text-label-sm font-bold text-wine-night">{badge}</span>
      ) : null}
    </NavLink>
  );
}

/**
 * الشريط الجانبي للوحة الإدارة (280px يمين الصفحة). على الشاشات الصغيرة يصبح درجاً منزلقاً
 * يُفتح من زر القائمة في الشريط العلوي (انظر layouts/AdminLayout).
 */
export function AdminSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { admin, signOut } = useAdminAuth();
  const { pending } = useAdminOrders();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [demoOpen, setDemoOpen] = useState(() => DEMO_ITEMS.some((i) => pathname.startsWith(i.to)));

  return (
    <>
      {open && (
        <button type="button" aria-label="إغلاق القائمة" onClick={onClose} className="fixed inset-0 z-40 bg-wine-night/50 lg:hidden" />
      )}
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-[280px] select-none flex-col justify-between bg-wine-night shadow-[0_8px_30px_rgba(42,3,13,0.22)] transition-transform duration-300 lg:translate-x-0',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <Link to="/admin" onClick={onClose} className="flex h-20 shrink-0 items-center px-space-lg">
            <div className="flex items-center gap-space-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-deep-oxblood ring-1 ring-royal-gold/30">
                <BrandMark className="h-7 text-champagne-gold" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-wide text-champagne-gold">IRIS | آيريس</span>
                <span className="font-label-sm text-label-sm text-royal-gold">لوحة إدارة المتجر</span>
              </div>
            </div>
          </Link>
          <div className="px-space-lg">
            <div className="h-px bg-hairline-gold" />
          </div>
          <nav className="flex-1 space-y-4 overflow-y-auto px-space-sm py-space-sm" aria-label="القائمة الرئيسية للإدارة">
            <div className="space-y-1">
              <p className="px-space-md pb-1 pt-2 font-label-sm text-label-sm tracking-wider text-royal-gold/70">إدارة المتجر</p>
              {STORE_ITEMS.map((item) => (
                <Item key={item.to} item={item} badge={item.to === '/admin/orders' ? pending : undefined} onNavigate={onClose} />
              ))}
              <a
                href="/"
                target="_blank"
                rel="noopener"
                className="flex items-center gap-3 rounded-lg px-space-md py-2 font-label-md text-label-md text-rose-mist/80 transition-colors hover:bg-deep-oxblood/60 hover:text-champagne-gold"
              >
                <Icon name="open_in_new" className="text-[20px] opacity-80" />
                عرض المتجر
              </a>
            </div>
            <div className="space-y-1">
              <button
                type="button"
                aria-expanded={demoOpen}
                onClick={() => setDemoOpen((v) => !v)}
                className="flex w-full items-center justify-between px-space-md pb-1 pt-2 font-label-sm text-label-sm tracking-wider text-royal-gold/70 hover:text-royal-gold"
              >
                <span>شاشات تجريبية (بيانات وهمية)</span>
                <Icon name={demoOpen ? 'expand_less' : 'expand_more'} className="text-[18px]" />
              </button>
              {demoOpen && DEMO_ITEMS.map((item) => <Item key={item.to} item={item} onNavigate={onClose} />)}
            </div>
          </nav>
        </div>

        <div className="m-space-sm rounded-xl bg-deep-oxblood/80 p-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary">
              <Icon name="person" className="text-[20px] text-champagne-gold" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-label-lg text-label-lg text-champagne-gold">{admin?.name ?? 'ضيف'}</span>
              <span className="truncate font-label-sm text-label-sm text-rose-mist/70">{admin?.role ?? ''}</span>
            </div>
            <button
              type="button"
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              onClick={() => {
                void signOut().finally(() => navigate('/admin/login'));
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-rose-mist/70 transition-colors hover:bg-wine-night hover:text-champagne-gold"
            >
              <Icon name="logout" className="text-[18px]" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
