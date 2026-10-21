import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { searchProducts } from '@/data/catalog';
import { CollectionView } from './CollectionView';

/** نتائج البحث للديسكتوب: `/search?q=…` (نفس واجهة القسم). */
export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') ?? '').trim();
  const items = useMemo(() => searchProducts(q), [q]);

  return (
    <CollectionView
      key={q}
      title={q ? `نتائج البحث عن «${q}»` : 'البحث'}
      breadcrumb="نتائج البحث"
      description={q ? `قطع تطابق «${q}» في الاسم أو رقم القطعة أو الوصف.` : 'اكتبي اسم القطعة أو رقمها في مربع البحث للوصول إليها مباشرة.'}
      items={items}
      promo={false}
      emptyHint="لا توجد قطع مطابقة، جرّبي رقم القطعة أو اسماً أقصر."
    />
  );
}
