import { useMemo } from 'react';
import { useParams } from 'react-router';
import { useCatalog } from '@/data/catalog';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { CollectionView } from './CollectionView';

const SPECIAL: Record<string, { title: string; description: string }> = {
  offers: {
    title: 'العروض',
    description: 'قطع مختارة بأسعار مخفّضة لفترة محدودة.',
  },
  all: {
    title: 'كل المنتجات',
    description: 'كل قطع آيريس ستور: قلائد وتطقيمات كبلز وإكسسوارات بطلاء ثابت.',
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
