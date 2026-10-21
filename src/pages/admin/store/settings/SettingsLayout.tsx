import type { ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { useAdminAuth } from '@/state/adminAuth';

interface Tab {
  to: string;
  label: string;
  hint: string;
  icon: string;
  visible: boolean;
  danger?: boolean;
}

function useTabs(): Tab[] {
  const { can, isOwner } = useAdminAuth();
  return [
    { to: 'store', label: 'المتجر والتوصيل', hint: 'التوصيل، التواصل، الغلاف، القسائم', icon: 'storefront', visible: can('settings') },
    { to: 'branding', label: 'الهوية', hint: 'الشعار والخطوط', icon: 'palette', visible: can('settings') },
    { to: 'account', label: 'حسابي', hint: 'كلمة المرور', icon: 'account_circle', visible: true },
    { to: 'instagram', label: 'إنستغرام', hint: 'ربط الحساب للاستيراد', icon: 'photo_library', visible: isOwner },
    { to: 'reset', label: 'إعادة الضبط', hint: 'إرجاع المتجر لحالته الأولى', icon: 'restart_alt', visible: isOwner, danger: true },
  ];
}

/** الإعدادات: قائمة أقسام جانبية (أفقية على الهاتف) وكل قسم صفحة مستقلة. */
export default function SettingsLayout() {
  const tabs = useTabs().filter((t) => t.visible);
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <h1 className="mb-5 font-headline-lg text-headline-md font-bold text-deep-oxblood md:text-headline-lg">الإعدادات</h1>
      <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-start">
        <nav
          aria-label="أقسام الإعدادات"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0 2xl:sticky 2xl:top-6 2xl:w-64 2xl:shrink-0 2xl:flex-col 2xl:gap-1 2xl:overflow-visible 2xl:rounded-2xl 2xl:bg-surface-container-lowest 2xl:p-2 2xl:shadow-luxury"
        >
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-3 rounded-full px-4 py-2 transition-colors 2xl:rounded-xl 2xl:px-3 2xl:py-2.5',
                  isActive
                    ? t.danger
                      ? 'bg-semantic-error text-white'
                      : 'bg-imperial-burgundy text-ivory-canvas'
                    : t.danger
                      ? 'bg-blush-surface text-semantic-error hover:bg-semantic-error-bg 2xl:bg-transparent'
                      : 'bg-blush-surface text-warm-ink hover:bg-rose-mist 2xl:bg-transparent 2xl:hover:bg-blush-surface',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={t.icon} className="text-[20px]" />
                  <span className="flex flex-col">
                    <span className="font-label-lg text-label-lg font-semibold">{t.label}</span>
                    <span className={cn('hidden font-label-sm text-label-sm 2xl:block', isActive ? 'opacity-80' : 'text-muted-rosewood')}>
                      {t.hint}
                    </span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

/** /admin/settings ← أول قسم يملك الحساب صلاحيته. */
export function SettingsIndex() {
  const first = useTabs().find((t) => t.visible);
  const { search } = useLocation();
  return <Navigate to={`${first?.to ?? 'account'}${search}`} replace />;
}

/** رأس كل قسم إعدادات: عنوان، وصف، وأزرار الحفظ. */
export function SettingsHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="font-headline-md text-headline-sm font-bold text-deep-oxblood md:text-headline-md">{title}</h2>
        {description && <p className="mt-1 max-w-2xl font-body-sm text-body-sm text-muted-rosewood">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
