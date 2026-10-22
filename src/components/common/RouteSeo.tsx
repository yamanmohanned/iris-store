import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useCatalog } from '@/data/catalog';
import { applySeo, buildSeo, siteOrigin } from '@/lib/seo';

/**
 * يضبط عنوان الصفحة ووصفها وبطاقة المشاركة والبيانات المنظمة عند كل تنقل أو تحديث للكتالوج.
 * يوضع داخل CatalogProvider حتى لا يكتب بيانات أولية قبل وصول الكتالوج الحقيقي.
 */
export function RouteSeo() {
  const { pathname } = useLocation();
  const catalog = useCatalog();
  useEffect(() => {
    applySeo(buildSeo(pathname, catalog, siteOrigin()), siteOrigin());
  }, [pathname, catalog]);
  return null;
}
