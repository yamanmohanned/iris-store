import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { readJSON, writeJSON } from './storage';

const KEY = 'iris.orders.v1';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'قيد المراجعة',
  confirmed: 'مؤكد',
  preparing: 'قيد التجهيز',
  shipped: 'جارٍ الشحن',
  delivered: 'تم التسليم',
  cancelled: 'ملغى',
  returned: 'مُرتجع',
};

export type PaymentMethod = 'cod' | 'zaincash' | 'card';

export const paymentLabels: Record<PaymentMethod, string> = {
  cod: 'الدفع عند الاستلام',
  zaincash: 'زين كاش',
  card: 'بطاقة مصرفية',
};

export interface OrderLine {
  productId: string;
  name: string;
  sku: string;
  image: string;
  qty: number;
  price: number;
  options?: { metal?: string; size?: string };
}

export interface Order {
  id: number;
  createdAt: string;
  status: OrderStatus;
  customer: { name: string; phone: string; email?: string };
  delivery: { governorate: string; district: string; neighborhood: string; landmark: string; details?: string; notes?: string };
  payment: PaymentMethod;
  lines: OrderLine[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
}

/** ما يرسله المتجر للخادم؛ الأسعار والمجاميع يحسبها الخادم من الكتالوج (لا يُوثق بأسعار المتصفح). */
export interface NewOrderInput {
  customer: Order['customer'];
  delivery: Order['delivery'];
  payment: PaymentMethod;
  lines: Array<Pick<OrderLine, 'productId' | 'qty' | 'options'>>;
  couponCode?: string;
}

interface OrdersContextValue {
  /** طلبات هذا الزبون (المرسلة من هذا الجهاز) */
  orders: Order[];
  getOrder: (id: number | string | undefined) => Order | undefined;
  /** يرسل الطلب إلى المتجر. يرمي خطأ برسالة عربية عند الفشل. */
  placeOrder: (input: NewOrderInput) => Promise<Order>;
  /** يجلب الحالة الحالية لطلب من الخادم (للتتبع) ويحدّث النسخة المحلية. */
  trackOrder: (id: number | string, phone: string) => Promise<Order>;
}

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(() => readJSON<Order[]>(KEY, []));
  useEffect(() => writeJSON(KEY, orders), [orders]);

  const getOrder = useCallback((id: number | string | undefined) => orders.find((o) => String(o.id) === String(id)), [orders]);

  const remember = useCallback((order: Order) => setOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]), []);

  const placeOrder = useCallback(
    async (input: NewOrderInput) => {
      const res = await api<{ order: Order }>('orders', { method: 'POST', body: input });
      remember(res.order);
      return res.order;
    },
    [remember],
  );

  const trackOrder = useCallback(async (id: number | string, phone: string) => {
    const res = await api<{ order: Order }>('orders/track', { query: { id: String(id).replace(/\D/g, ''), phone } });
    setOrders((prev) => (prev.some((o) => o.id === res.order.id) ? prev.map((o) => (o.id === res.order.id ? res.order : o)) : prev));
    return res.order;
  }, []);

  const value = useMemo(() => ({ orders, getOrder, placeOrder, trackOrder }), [orders, getOrder, placeOrder, trackOrder]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>');
  return ctx;
}
