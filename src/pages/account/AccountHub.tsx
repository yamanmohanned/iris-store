import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { BrandMark } from '@/components/common/BrandLogo';
import { Icon } from '@/components/common/Icon';
import { MOBILE_CARD, MobilePage, MobileSectionTitle } from '@/components/mobile/MobilePage';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber, piecesCount } from '@/lib/format';
import { useCart } from '@/state/cart';
import { orderStatusLabels, useOrders } from '@/state/orders';
import { useWishlist } from '@/state/wishlist';

const HELP = [
  { to: '/policies/shipping', icon: 'local_shipping', label: 'الشحن والاستبدال' },
  { to: '/policies/size-guide', icon: 'straighten', label: 'دليل المقاسات' },
  { to: '/policies/care', icon: 'auto_awesome', label: 'العناية بالإكسسوارات' },
  { to: '/policies/authenticity', icon: 'verified', label: 'الخامات والجودة' },
  { to: '/faq', icon: 'help', label: 'الأسئلة الشائعة' },
  { to: '/contact', icon: 'chat', label: 'تواصل معنا' },
];

/**
 * «حسابي» — لا توجد حسابات زبائن على الخادم بعد، لذلك تعرض الصفحة ما يخص هذا الجهاز فعلاً:
 * الطلبات المرسلة منه، المفضلة، السلة، وروابط المساعدة. (كانت تعرض ملفاً شخصياً تجريبياً لزبونة وهمية.)
 */
export default function AccountHub() {
  const mobile = useIsMobile();
  const content = <AccountContent />;
  if (mobile) {
    return (
      <MobilePage title="حسابي" tab="account">
        {content}
      </MobilePage>
    );
  }
  return (
    <main className="min-h-[70vh] bg-ivory-canvas px-gutter py-space-2xl">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-space-lg font-headline-lg text-headline-lg font-bold text-deep-oxblood">حسابي</h1>
        {content}
      </div>
    </main>
  );
}

function AccountContent() {
  const { orders } = useOrders();
  const wishlist = useWishlist();
  const cart = useCart();

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-imperial-burgundy via-burgundy-800 to-deep-oxblood p-5 text-ivory-canvas shadow-[0_14px_36px_rgba(42,3,13,0.22)]">
        <BrandMark onDark className="pointer-events-none absolute -left-4 -top-2 h-36 text-white opacity-[0.06]" />
        <h2 className="relative font-headline-md text-headline-md font-semibold text-champagne-gold">أهلاً بكِ في آيريس ستور</h2>
        <p className="relative mt-1.5 max-w-[420px] font-body-sm text-body-sm leading-relaxed text-rose-mist">
          تابعي طلباتكِ، واحفظي القطع التي أعجبتكِ للرجوع إليها لاحقاً.
        </p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat to="/track-order" icon="receipt_long" value={orders.length} label="طلباتي" />
        <Stat to="/wishlist" icon="favorite" value={wishlist.ids.length} label="المفضلة" />
        <Stat to="/cart" icon="shopping_bag" value={cart.count} label="السلة" />
      </section>

      <section>
        <MobileSectionTitle action={orders.length ? { to: '/track-order', label: 'تتبع طلب' } : undefined}>طلباتي</MobileSectionTitle>
        {orders.length > 0 ? (
          <div className={cn(MOBILE_CARD, 'flex flex-col p-0')}>
            {orders.slice(0, 5).map((o) => {
              const pieces = o.lines.reduce((n, l) => n + l.qty, 0);
              return (
                <Row
                  key={o.id}
                  to={`/track-order?order=${o.id}`}
                  icon="receipt_long"
                  title={`طلب رقم ${o.id}`}
                  subtitle={`${formatDate(o.createdAt)} · ${piecesCount(pieces)} · ${formatNumber(o.total)} د.ع`}
                  badge={orderStatusLabels[o.status]}
                />
              );
            })}
          </div>
        ) : (
          <div className={cn(MOBILE_CARD, 'flex flex-col gap-3')}>
            <p className="font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
              لا توجد طلبات من هذا الجهاز بعد. لمتابعة طلب سابق استخدمي رقم الطلب ورقم الهاتف.
            </p>
            <Link
              to="/track-order"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-blush-surface font-label-lg text-label-lg font-semibold text-imperial-burgundy"
            >
              <Icon name="local_shipping" className="text-[19px]" />
              تتبع طلب
            </Link>
          </div>
        )}
      </section>

      <section>
        <MobileSectionTitle>المساعدة</MobileSectionTitle>
        <div className={cn(MOBILE_CARD, 'flex flex-col p-0')}>
          {HELP.map((h) => (
            <Row key={h.to} to={h.to} icon={h.icon} title={h.label} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ to, icon, value, label }: { to: string; icon: string; value: number; label: string }) {
  return (
    <Link to={to} className={cn(MOBILE_CARD, 'flex flex-col items-center gap-1 px-2 py-3.5 text-center active:bg-blush-surface')}>
      <Icon name={icon} className="text-[22px] text-imperial-burgundy" />
      <span className="font-headline-sm text-headline-sm font-bold leading-none text-deep-oxblood tabular-nums">{value}</span>
      <span className="font-label-md text-label-md text-muted-rosewood">{label}</span>
    </Link>
  );
}

function Row({ to, icon, title, subtitle, badge }: { to: string; icon: string; title: string; subtitle?: string; badge?: ReactNode }) {
  return (
    <Link to={to} className="flex min-h-[56px] items-center gap-3 border-b border-hairline-burgundy px-4 py-3 last:border-b-0 active:bg-blush-surface/60">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
        <Icon name={icon} className="text-[20px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-label-lg text-label-lg font-semibold text-deep-oxblood">{title}</span>
        {subtitle && <span className="truncate font-label-md text-label-md text-muted-rosewood tabular-nums">{subtitle}</span>}
      </span>
      {badge && (
        <span className="shrink-0 rounded-full bg-parchment px-2.5 py-0.5 font-label-sm text-label-sm font-semibold text-antique-gold">{badge}</span>
      )}
      <Icon name="chevron_left" className="text-[22px] text-muted-rosewood" />
    </Link>
  );
}
