import { Link, useLocation } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { useCart } from '@/state/cart';

/**
 * زر الرجوع إلى السلة (أو إلى خطوة إتمام الطلب) في صفحات السياسات والأسئلة.
 * يظهر حين جاء الزائر من السلة/الدفع أو في سلته قطع؛ السلة محفوظة فلا يعيد ملأها.
 */
export function ReturnToCart({ className }: { className?: string }) {
  const { state } = useLocation() as { state?: { from?: string } | null };
  const { items } = useCart();
  const from = state?.from ?? '';
  const toCheckout = from.startsWith('/checkout');
  if (!toCheckout && from !== '/cart' && items.length === 0) return null;
  const count = items.reduce((n, l) => n + l.qty, 0);
  return (
    <Link
      to={toCheckout ? from : '/cart'}
      className={cn(
        'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-imperial-burgundy px-4 font-label-lg text-label-lg text-ivory-canvas shadow-[0_6px_18px_rgba(78,24,37,0.22)] transition-colors hover:bg-burgundy-600',
        className,
      )}
    >
      <Icon name="arrow_forward" className="text-[18px] text-champagne-gold" />
      {toCheckout ? 'رجوع إلى إتمام الطلب' : 'رجوع إلى السلة'}
      {count > 0 && <span className="rounded-full bg-champagne-gold/25 px-2 font-label-sm text-label-sm text-champagne-gold">{count}</span>}
    </Link>
  );
}
