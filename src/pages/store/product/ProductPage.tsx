import { useParams } from 'react-router';
import { getProduct, isProductVisible, useCatalog } from '@/data/catalog';
import NotFoundPage from '@/pages/store/system/NotFoundPage';
import { ProductView } from './ProductView';

/** `/products/:slug` — تفاصيل المنتج للديسكتوب. */
export default function ProductPage() {
  const { slug } = useParams();
  useCatalog();
  const product = getProduct(slug);
  if (!product || !isProductVisible(product)) return <NotFoundPage />;
  return <ProductView key={product.id} product={product} />;
}
