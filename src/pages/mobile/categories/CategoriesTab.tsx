import { CategoryGrid } from '@/components/mobile/CategoryGrid';
import { MobileTabBar } from '@/components/mobile/MobileTabBar';
import { MobileTopBar } from '@/components/mobile/MobileTopBar';
import { useCatalog } from '@/data/catalog';

/**
 * تبويب «الأقسام» على الهاتف: كل أقسام المالك بنفس بطاقات الرئيسية
 * (كانت الشاشة الأصلية نصاً ثابتاً من التصميم لا يتغير بإضافة قسم جديد).
 */
export default function CategoriesTab() {
  const { visibleCategories, visibleProducts } = useCatalog();
  const tiles = visibleCategories.map((category) => ({
    category,
    count: visibleProducts.filter((p) => p.category === category.slug).length,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <MobileTopBar title="الأقسام" />
      <main className="flex-1 px-gutter-mobile pb-32 pt-[calc(5rem+env(safe-area-inset-top,0px))]">
        <p className="mb-5 text-center font-label-md text-label-md text-antique-gold">اختاري القسم لعرض قطعه</p>
        {tiles.length > 0 ? (
          <CategoryGrid tiles={tiles} />
        ) : (
          <p className="rounded-2xl bg-surface-container-lowest p-6 text-center font-body-md text-body-md text-muted-rosewood shadow-luxury">
            يجري تجهيز الأقسام، عودي قريباً.
          </p>
        )}
      </main>
      <MobileTabBar active="categories" />
    </div>
  );
}
