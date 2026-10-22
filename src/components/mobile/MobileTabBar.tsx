import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { useCart } from '@/state/cart';

export type MobileTab = 'home' | 'categories' | 'cart' | 'contact' | 'account';

const TABS: Array<{ id: MobileTab; to: string; label: string; icon: string }> = [
  { id: 'home', to: '/', label: 'الرئيسية', icon: 'home' },
  { id: 'categories', to: '/categories', label: 'الأقسام', icon: 'grid_view' },
  { id: 'cart', to: '/cart', label: 'السلة', icon: 'shopping_bag' },
  { id: 'contact', to: '/contact', label: 'تواصل', icon: 'chat' },
  { id: 'account', to: '/account', label: 'حسابي', icon: 'person' },
];

/** شريط التبويب السفلي العائم لكل شاشات الهاتف الرئيسية. */
export function MobileTabBar({ active }: { active?: MobileTab }) {
  const { count } = useCart();
  return (
    <nav aria-label="التنقل السفلي" className="pointer-events-none fixed inset-x-3 bottom-3 z-50 pb-safe">
      <div className="pointer-events-auto mx-auto flex max-w-[440px] items-stretch justify-around rounded-[22px] bg-surface-container-lowest/95 px-1.5 py-1 shadow-[0_0_0_1px_rgba(78,24,37,0.06),0_12px_32px_rgba(42,3,13,0.14)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors',
                isActive ? 'text-imperial-burgundy' : 'text-muted-rosewood active:text-imperial-burgundy',
              )}
            >
              <span className="relative flex items-center justify-center">
                <Icon name={tab.icon} fill={isActive} className="text-[23px]" />
                {tab.id === 'cart' && count > 0 && (
                  <span className="absolute -right-2.5 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-imperial-burgundy px-1 text-[10px] font-bold leading-none text-ivory-canvas ring-2 ring-surface-container-lowest tabular-nums">
                    {count}
                  </span>
                )}
              </span>
              <span className={cn('font-label-sm text-label-sm', isActive && 'font-bold')}>{tab.label}</span>
              <span className={cn('absolute top-0 h-[3px] w-6 rounded-b-full transition-colors', isActive ? 'bg-royal-gold' : 'bg-transparent')} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
