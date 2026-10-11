import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useCatalog } from '@/data/catalog';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { CollectionView } from './CollectionView';

const SPECIAL: Record<string, { title: string; description: string }> = {
  offers: {
    title: 'العروض',
    description: 'قطع مختارة بتخفيضات موسمية محدودة، مع الحفاظ على عيار الذهب وشهادة الأصالة الملكية لكل قطعة.',
  },
  all: {
    title: 'كل المجوهرات',
    description: 'مجموعة دار آيريس الكاملة من القلائد والخواتم والأساور والأقراط ومجموعات الإهداء الملكية.',
  },
};

/** صفحة القسم للديسكتوب: `/collections/:slug` (الأقسام والمنتجات من كتالوج المالك). */
export default function CollectionPage() {
  const { slug = 'all' } = useParams();
  const { visibleCategories, visibleProducts } = useCatalog();

  const meta = useMemo(() => {
    const special = SPECIAL[slug];
    if (special) {
      const items = slug === 'offers' ? visibleProducts.filter((p) => p.oldPrice && p.oldPrice > p.price) : visibleProducts;
      return { ...special, items, breadcrumb: special.title };
    }
    const cat = visibleCategories.find((c) => c.slug === slug);
    if (!cat) return null;
    return {
      title: cat.title,
      description: cat.description,
      items: visibleProducts.filter((p) => p.category === cat.slug),
      breadcrumb: cat.name,
    };
  }, [slug, visibleCategories, visibleProducts]);

  if (!meta) return <NotFoundPage />;
  // key يعيد تهيئة حالة الفلاتر عند تغيير القسم
  return <CollectionView key={slug} {...meta} />;
}
