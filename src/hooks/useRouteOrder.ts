import { useParams, useSearchParams } from 'react-router';
import { useOrders, type Order } from '@/state/orders';

/**
 * يقرأ الطلب المطلوب من المسار (`/order-success/:orderId`) أو من `?order=1054`
 * وإلا يعيد أحدث طلب (لصفحات التتبع المباشر).
 */
export function useRouteOrder(): Order | undefined {
  const { orderId } = useParams();
  const [search] = useSearchParams();
  const { getOrder, orders } = useOrders();
  const id = orderId ?? search.get('order') ?? undefined;
  return id ? getOrder(id) : orders[0];
}
