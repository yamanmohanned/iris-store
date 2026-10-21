import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { BrandLogo } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { useWindowScroll } from '@/hooks/useScroll';
import { cn } from '@/lib/cn';
import { useCart } from '@/state/cart';
import { useUi } from '@/state/ui';
import { useWishlist } from '@/state/wishlist';

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

/** روابط الترويسة: الرئيسية + أقسام المالك (أول 6 بترتيبه) + العروض. */
function useStoreNav(): NavItem[] {
  const { visibleCategories } = useCatalog();
  return [
    { to: '/', label: 'الرئيسية', end: true },
    ...visibleCategories.slice(0, 6).map((c) => ({ to: `/collections/${c.slug}`, label: c.name })),
    { to: '/collections/offers', label: 'العروض' },
  ];
}

/** ارتفاع الترويسة (px) لكل حالة — يُستخدم لإزاحة المحتوى أسفل الترويسة الثابتة. */
export const HEADER_HEIGHT = { solid: 66, overlay: 124 } as const;

/**
 * ترويسة المتجر.
 *  - الصفحة الرئيسية: شفافة فوق البطل مع شريط إعلانات، وتتحول لخلفية داكنة عند التمرير
 *    وتختفي عند التمرير للأسفل وتعود عند التمرير للأعلى (كما في سكربت التصميم).
 *  - بقية الصفحات: شريط Deep Oxblood ثابت بخط ذهبي رفيع.
 */
export function StoreHeader() {
  const { pathname } = useLocation();
  const { y, direction } = useWindowScroll();
  const { count, openDrawer } = useCart();
  const { openSearch, menuOpen, setMenuOpen } = useUi();
  const { ids: wishIds } = useWishlist();
  const nav = useStoreNav();

  const overlay = pathname === '/';
  const scrolled = y > 80;
  const transparent = overlay && !scrolled;
  const hidden = overlay && y > 400 && direction === 'down';

  useEffect(() => setMenuOpen(false), [pathname, setMenuOpen]);

  const iconBtn = cn(
    'relative rounded-full p-2 transition-all',
    transparent ? 'text-on-surface-variant hover:bg-blush-surface/70 hover:text-imperial-burgundy' : 'text-champagne-gold hover:text-white',
  );

  return (
    <>
      {overlay && (
        <div
          className={cn(
            'fixed inset-x-0 top-0 z-50 overflow-hidden border-b border-[#C9A24B]/45 bg-crown-burgundy text-champagne-gold transition-all duration-300',
            scrolled && 'pointer-events-none -translate-y-full opacity-0',
          )}
        >
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-6">
            <p className="flex items-center justify-center gap-3 text-center font-label-sm text-label-sm tracking-wide">
              <span>توصيل لجميع المحافظات</span>
              <span className="text-[8px] text-royal-gold">◆</span>
              <span>الدفع عند الاستلام</span>
              <span className="text-[8px] text-royal-gold">◆</span>
              <span>استبدال خلال 7 أيام</span>
            </p>
          </div>
        </div>
      )}

      <header
        className={cn(
          'fixed inset-x-0 z-40 transition-all duration-[350ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
          transparent
            ? 'top-9 border-b border-transparent bg-transparent'
            : 'top-0 bg-crown-burgundy shadow-[0_12px_32px_rgba(42,3,13,0.35)]',
          hidden && '-translate-y-[120%]',
        )}
      >
        {!transparent && <div className="h-0.5 w-full bg-gradient-to-r from-royal-gold/20 via-royal-gold to-royal-gold/20" />}
        <div
          className={cn(
            'mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-6 transition-all duration-[350ms] lg:px-10',
            transparent ? 'h-[88px]' : 'h-16 border-b border-royal-gold/30',
          )}
        >
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              aria-label="القائمة"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
              className={cn(iconBtn, 'lg:hidden')}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} className="text-[22px] leading-none" />
            </button>
            <Link
              to="/"
              aria-label="آيريس — الصفحة الرئيسية"
              className={cn('group flex origin-right items-center transition-transform duration-300', !transparent && 'scale-[0.92]')}
            >
              <BrandLogo tone={transparent ? 'light' : 'dark'} size={transparent ? 'lg' : 'md'} />
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-7 lg:flex lg:gap-8" aria-label="التنقل الرئيسي">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cn(
                    'relative py-1.5 font-label-lg text-label-lg transition-colors',
                    transparent
                      ? isActive
                        ? 'font-semibold text-imperial-burgundy'
                        : 'text-on-surface-variant hover:text-imperial-burgundy'
                      : isActive
                        ? 'font-semibold text-champagne-gold'
                        : 'text-champagne-gold/80 hover:text-champagne-gold',
                    isActive && "after:absolute after:-bottom-1 after:left-0 after:right-0 after:h-[2px] after:rounded-full after:bg-royal-gold after:content-['']",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-1 lg:gap-2">
            <button type="button" aria-label="بحث" onClick={openSearch} className={iconBtn}>
              <Icon name="search" className="text-[22px] leading-none" />
            </button>
            <Link to="/wishlist" aria-label="المفضلة" className={cn(iconBtn, 'hidden sm:inline-flex')}>
              <Icon name="favorite" className="text-[22px] leading-none" />
              {wishIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-royal-gold px-1 font-label-sm text-[10px] font-bold text-deep-oxblood">
                  {wishIds.length}
                </span>
              )}
            </Link>
            <button type="button" aria-label="حقيبة التسوق" onClick={openDrawer} className={iconBtn}>
              <Icon name="shopping_bag" className="text-[22px] leading-none" />
              {count > 0 && (
                <span className="absolute left-0 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-royal-gold px-1 font-label-sm text-[10px] font-bold text-deep-oxblood ring-[1.5px] ring-ivory-canvas">
                  {count}
                </span>
              )}
            </button>
            <span className={cn('mx-1 hidden h-4 w-px sm:block', transparent ? 'bg-royal-gold/40' : 'bg-royal-gold/30')} />
            <Link to="/account" aria-label="حسابي" className={iconBtn}>
              <Icon name="person" className="text-[22px] leading-none" />
            </Link>
          </div>
        </div>
        {transparent && <div className="h-px w-full bg-gradient-to-r from-transparent via-royal-gold/45 to-transparent opacity-0" />}

        {menuOpen && (
          <div className="border-t border-royal-gold/30 bg-crown-burgundy lg:hidden">
            <nav className="mx-auto flex max-w-[1440px] flex-col px-6 py-3" aria-label="قائمة الموبايل">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end ?? false}
                  className={({ isActive }) =>
                    cn(
                      'border-b border-royal-gold/15 py-3 font-label-lg text-label-lg',
                      isActive ? 'font-semibold text-champagne-gold' : 'text-champagne-gold/80',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link to="/wishlist" className="py-3 font-label-lg text-label-lg text-champagne-gold/80">
                المفضلة
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
