import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { useAdminAuth } from '@/state/adminAuth';

/**
 * تخطيط لوحة الإدارة: شريط جانبي ثابت 280px (يمين) على الشاشات الكبيرة،
 * ودرج منزلق مع شريط علوي على الهاتف. محمي بجلسة المالك على الخادم.
 */
export function AdminLayout() {
  const { admin, stage } = useAdminAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  if (stage === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ivory-canvas" role="status" aria-label="جارٍ التحقق من الجلسة">
        <BrandMark className="h-14 animate-pulse text-imperial-burgundy" />
      </div>
    );
  }
  if (!admin) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen bg-ivory-canvas font-body-md text-body-md text-on-surface antialiased">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="pt-safe sticky top-0 z-30 flex h-14 items-center justify-between bg-wine-night px-3 text-champagne-gold shadow-md lg:hidden">
        <button
          type="button"
          aria-label="القائمة"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-deep-oxblood"
        >
          <Icon name="menu" className="text-[24px]" />
        </button>
        <Link to="/admin" className="flex items-center gap-2">
          <BrandMark className="h-6 text-champagne-gold" />
          <span className="font-headline-sm text-base">لوحة الإدارة</span>
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener"
          aria-label="عرض المتجر"
          className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-deep-oxblood"
        >
          <Icon name="storefront" className="text-[22px]" />
        </a>
      </header>
      <div className="lg:pr-[280px]">
        <Outlet />
      </div>
    </div>
  );
}
