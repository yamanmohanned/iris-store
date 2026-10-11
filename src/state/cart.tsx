import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProduct, useCatalog } from '@/data/catalog';
import type { CartLine, Product } from '@/data/types';
import { readJSON, writeJSON } from './storage';

const STORAGE_KEY = 'iris.cart.v1';
const COUPON_KEY = 'iris.cart.coupon.v1';

export interface CartItem extends CartLine {
  key: string;
  product: Product;
  /** false عندما نفد المنتج — يُستبعد من الإجمالي */
  available: boolean;
  lineTotal: number;
}

interface CartContextValue {
  items: CartItem[];
  /** عدد القطع الإجمالي */
  count: number;
  subtotal: number;
  /** الخصم (مجموع الفرق بين السعر القديم والحالي) */
  savings: number;
  shipping: number;
  total: number;
  /** القسيمة المفعّلة (إن وُجدت) */
  coupon: { code: string; percent: number; label: string } | null;
  discount: number;
  /** المبلغ المتبقي للوصول إلى الشحن المجاني (0 = مؤهل) */
  freeShippingRemaining: number;
  /** نسبة التقدم نحو الشحن المجاني 0..100 */
  freeShippingProgress: number;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  add: (productId: string, qty?: number, options?: CartLine['options']) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export const MAX_QTY = 10;

export function lineKey(line: Pick<CartLine, 'productId' | 'options'>): string {
  return [line.productId, line.options?.metal ?? '', line.options?.size ?? ''].join('::');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => readJSON<CartLine[]>(STORAGE_KEY, []));
  const catalog = useCatalog();
  const { coupons, shippingFee, freeShippingThreshold } = catalog.settings;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(() => readJSON<string | null>(COUPON_KEY, null));

  useEffect(() => writeJSON(STORAGE_KEY, lines), [lines]);
  useEffect(() => writeJSON(COUPON_KEY, couponCode), [couponCode]);

  const applyCoupon = useCallback(
    (code: string) => {
      const key = code.trim().toUpperCase();
      if (!coupons[key]) return false;
      setCouponCode(key);
      return true;
    },
    [coupons],
  );
  const removeCoupon = useCallback(() => setCouponCode(null), []);

  const add = useCallback<CartContextValue['add']>((productId, qty = 1, options) => {
    const product = getProduct(productId);
    if (!product || product.stock <= 0) return;
    setLines((prev) => {
      const key = lineKey({ productId, options });
      const existing = prev.find((l) => lineKey(l) === key);
      const cap = Math.min(MAX_QTY, product.stock);
      if (existing) return prev.map((l) => (lineKey(l) === key ? { ...l, qty: Math.min(cap, l.qty + qty) } : l));
      return [...prev, { productId, qty: Math.min(cap, qty), options }];
    });
  }, []);

  const remove = useCallback((key: string) => setLines((prev) => prev.filter((l) => lineKey(l) !== key)), []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (lineKey(l) !== key) return [l];
        if (qty <= 0) return [];
        const cap = Math.min(MAX_QTY, getProduct(l.productId)?.stock ?? MAX_QTY);
        return [{ ...l, qty: Math.min(cap, qty) }];
      }),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const items: CartItem[] = lines.flatMap((l) => {
      const product = getProduct(l.productId);
      if (!product) return [];
      const available = product.stock > 0 && !product.hidden;
      return [{ ...l, key: lineKey(l), product, available, lineTotal: available ? product.price * l.qty : 0 }];
    });
    const active = items.filter((i) => i.available);
    const count = active.reduce((n, i) => n + i.qty, 0);
    const subtotal = active.reduce((s, i) => s + i.lineTotal, 0);
    const savings = active.reduce((s, i) => s + Math.max(0, ((i.product.oldPrice ?? i.product.price) - i.product.price) * i.qty), 0);
    const couponInfo = couponCode && coupons[couponCode] ? { code: couponCode, ...coupons[couponCode] } : null;
    const discount = couponInfo ? Math.round((subtotal * couponInfo.percent) / 100) : 0;
    const afterDiscount = subtotal - discount;
    const hasFree = freeShippingThreshold > 0;
    const freeShippingRemaining = hasFree ? Math.max(0, freeShippingThreshold - afterDiscount) : 0;
    const shipping = active.length === 0 || (hasFree && freeShippingRemaining === 0) ? 0 : shippingFee;
    return {
      items,
      count,
      subtotal,
      savings,
      shipping,
      total: afterDiscount + shipping,
      coupon: couponInfo,
      discount,
      freeShippingRemaining,
      freeShippingProgress: hasFree ? Math.min(100, Math.round((afterDiscount / freeShippingThreshold) * 100)) : 100,
      applyCoupon,
      removeCoupon,
      add,
      remove,
      setQty,
      clear,
      drawerOpen,
      openDrawer,
      closeDrawer,
    };
  }, [
    lines,
    couponCode,
    coupons,
    shippingFee,
    freeShippingThreshold,
    catalog,
    applyCoupon,
    removeCoupon,
    add,
    remove,
    setQty,
    clear,
    drawerOpen,
    openDrawer,
    closeDrawer,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
