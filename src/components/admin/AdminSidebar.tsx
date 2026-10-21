import { Link, NavLink, useNavigate } from 'react-router';
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
  visible: boolean;
  badge?: number;
}

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
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
      {item.badge ? (
        <span className="rounded-full bg-royal-gold px-2 py-0.5 font-label-sm text-label-sm font-bold text-wine-night">{item.badge}</span>
      ) : null}
    </NavLink>
  );
}

/**
 * الشريط الجانبي للوحة الإدارة (280px يمين الصفحة). على الشاشات الصغيرة يصبح درجاً منزلقاً
 * يُفتح من زر القائمة في الشريط العلوي (انظر layouts/AdminLayout). يعرض لكل حساب ما يملك صلاحيته فقط.
 */
export function AdminSidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { admin, signOut, can, isOwner } = useAdminAuth();
  const { pending } = useAdminOrders(can('orders'));
  const navigate = useNavigate();

  const groups: Array<{ title: string; items: NavItem[] }> = [
    { title: 'الرئيسية', items: [{ to: '/admin', label: 'نظرة عامة', icon: 'space_dashboard', end: true, visible: true }] },
    {
      title: 'المبيعات',
      items: [{ to: '/admin/orders', label: 'الطلبات', icon: 'receipt_long', visible: can('orders'), badge: pending }],
    },
    {
      title: 'الكتالوج',
      items: [
        { to: '/admin/categories', label: 'الأقسام', icon: 'category', visible: can('categories') },
        { to: '/admin/products', label: 'المنتجات', icon: 'diamond', visible: can('products') },
        { to: '/admin/instagram', label: 'الاستيراد من إنستغرام', icon: 'photo_library', visible: can('products', 'edit') },
      ],
    },
    {
      title: 'الإدارة',
      items: [
        { to: '/admin/staff', label: 'فريق العمل', icon: 'badge', visible: isOwner },
        { to: '/admin/settings', label: 'الإعدادات', icon: 'tune', visible: true },
      ],
    },
  ];

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
                <BrandMark className="h-7 text-champagne-gold" onDark />
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
          <nav className="flex-1 space-y-3 overflow-y-auto px-space-sm py-space-sm" aria-label="القائمة الرئيسية للإدارة">
            {groups.map((g) => {
              const items = g.items.filter((i) => i.visible);
              if (!items.length) return null;
              return (
                <div key={g.title} className="space-y-1">
                  <p className="px-space-md pb-1 pt-2 font-label-sm text-label-sm tracking-wider text-royal-gold/70">{g.title}</p>
                  {items.map((item) => (
                    <Item key={item.to} item={item} onNavigate={onClose} />
                  ))}
                </div>
              );
            })}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 rounded-lg px-space-md py-2 font-label-md text-label-md text-rose-mist/80 transition-colors hover:bg-deep-oxblood/60 hover:text-champagne-gold"
            >
              <Icon name="open_in_new" className="text-[20px] opacity-80" />
              عرض المتجر
            </a>
          </nav>
        </div>

        <div className="m-space-sm rounded-xl bg-deep-oxblood/80 p-space-md">
          <div className="flex items-center gap-space-sm">
            <Link
              to="/admin/settings/account"
              onClick={onClose}
              title="حسابي"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary font-headline-sm text-champagne-gold"
            >
              {admin?.name.trim().charAt(0) || <Icon name="person" className="text-[20px]" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-label-lg text-label-lg text-champagne-gold">{admin?.name ?? 'ضيف'}</span>
              <span className="truncate font-label-sm text-label-sm text-rose-mist/70">{admin?.title ?? ''}</span>
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
