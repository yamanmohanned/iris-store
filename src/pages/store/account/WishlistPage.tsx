import { useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '@/components/common/Icon';
import { MOBILE_BTN_PRIMARY, MOBILE_CARD, MobilePage } from '@/components/mobile/MobilePage';
import { ProductMiniCard } from '@/components/mobile/ProductRail';
import { QuickAddSheet } from '@/components/mobile/QuickAddSheet';
import { ProductCard } from '@/components/store/ProductCard';
import { isProductVisible, useCatalog } from '@/data/catalog';
import type { Product } from '@/data/types';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import { piecesCount } from '@/lib/format';
import { useWishlist } from '@/state/wishlist';

/** المفضلة (`/wishlist`) — كان الرابط في الترويسة والسلة يؤدي إلى صفحة 404. */
export default function WishlistPage() {
  const { ids } = useWishlist();
  const catalog = useCatalog();
  const mobile = useIsMobile();
  const items = ids.map((id) => catalog.byId.get(id)).filter((p): p is Product => !!p && isProductVisible(p));

  if (mobile) return <WishlistMobile items={items} />;

  return (
    <main className="w-full bg-ivory-canvas">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-12">
        <h1 className="mb-8 font-headline-xl text-headline-xl font-bold text-deep-oxblood">المفضلة</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface-container-lowest px-6 py-14 text-center shadow-luxury">
            <Icon name="favorite" className="text-[40px] text-rose-mist" />
            <p className="font-headline-sm text-headline-sm text-warm-ink">قائمة المفضلة فارغة</p>
            <p className="max-w-sm font-body-sm text-body-sm text-muted-rosewood">
              اضغطي على رمز القلب في أي قطعة لحفظها هنا والعودة إليها لاحقاً.
            </p>
            <Link
              to="/collections/all"
              className="mt-2 rounded-xl bg-imperial-burgundy px-5 py-2.5 font-label-lg text-label-lg text-ivory-canvas hover:bg-burgundy-600"
            >
              تصفّح القطع
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-gutter lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/** المفضلة على الهاتف: نفس بطاقات الهاتف المصغّرة مع إضافة سريعة وزر إزالة. */
function WishlistMobile({ items }: { items: Product[] }) {
  const { remove } = useWishlist();
  const [quick, setQuick] = useState<Product | null>(null);

  return (
    <MobilePage title="المفضلة" back="/account" tab="account">
      {items.length === 0 ? (
        <section className={cn(MOBILE_CARD, 'flex flex-col items-center px-6 py-10 text-center')}>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blush-surface text-imperial-burgundy">
            <Icon name="favorite" className="text-[30px]" />
          </span>
          <h1 className="mt-3 font-headline-sm text-headline-sm font-semibold text-deep-oxblood">قائمة المفضلة فارغة</h1>
          <p className="mt-1 max-w-[280px] font-body-sm text-body-sm leading-relaxed text-muted-rosewood">
            اضغطي على رمز القلب في أي قطعة لحفظها هنا والعودة إليها لاحقاً.
          </p>
          <Link to="/categories" className={cn(MOBILE_BTN_PRIMARY, 'mt-5 max-w-[260px]')}>
            تصفّحي الأقسام
            <Icon name="arrow_back" className="text-[20px]" />
          </Link>
        </section>
      ) : (
        <>
          <p className="mb-3 font-label-md text-label-md text-muted-rosewood">
            {items.length === 2 ? 'قطعتان محفوظتان' : `${piecesCount(items.length)} محفوظة`}
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {items.map((p) => (
              <div key={p.id} className="relative">
                <ProductMiniCard product={p} onAdd={() => setQuick(p)} />
                <button
                  type="button"
                  aria-label={`إزالة ${p.shortName} من المفضلة`}
                  onClick={() => remove(p.id)}
                  className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ivory-canvas/90 text-imperial-burgundy shadow-[0_2px_8px_rgba(42,3,13,0.18)] backdrop-blur active:scale-90"
                >
                  <Icon name="favorite" fill className="text-[20px]" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      <QuickAddSheet product={quick} onClose={() => setQuick(null)} />
    </MobilePage>
  );
}
