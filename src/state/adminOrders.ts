import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { api } from '@/lib/api';
import type { Order, OrderStatus } from './orders';

/**
 * طلبات المتجر للوحة الإدارة (من الخادم). مخزن مشترك حتى يتزامن عدّاد الشريط الجانبي
 * مع صفحة الطلبات، ويُحدَّث تلقائياً كل دقيقة لالتقاط الطلبات الجديدة.
 */
interface State {
  orders: Order[];
  loading: boolean;
  error: string | null;
  loadedAt: number;
}

let state: State = { orders: [], loading: false, error: null, loadedAt: 0 };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

async function load(): Promise<void> {
  if (state.loading) return;
  set({ loading: true });
  try {
    const res = await api<{ orders: Order[] }>('orders');
    set({ orders: res.orders, error: null, loadedAt: Date.now() });
  } catch (e) {
    set({ error: e instanceof Error ? e.message : 'تعذر تحميل الطلبات.' });
  } finally {
    set({ loading: false });
  }
}

const REFRESH_MS = 60_000;

export function useAdminOrders() {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );

  useEffect(() => {
    if (Date.now() - state.loadedAt > 5_000) void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const setStatus = useCallback(async (id: number, status: OrderStatus) => {
    const res = await api<{ order: Order }>('orders/status', { method: 'POST', body: { id, status } });
    set({ orders: state.orders.map((o) => (o.id === id ? res.order : o)) });
    return res.order;
  }, []);

  return { ...snap, refresh: load, setStatus, pending: snap.orders.filter((o) => o.status === 'pending').length };
}
