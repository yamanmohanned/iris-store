/**
 * الطلبات: الأسعار تُحسب هنا من الكتالوج (لا يُوثق بالسعر القادم من المتصفح)، والكمية تُحجز من المخزون.
 * نفس منطق route_order_create و route_order_status في PHP.
 */
import { loadCatalog } from './catalog.ts';
import { fail, type Json, type Kv } from './base.ts';

const STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'];
const RELEASED = ['cancelled', 'returned'];

export const phone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (d.startsWith('00964')) d = d.slice(5);
  else if (d.startsWith('964')) d = d.slice(3);
  if (d.length === 10 && d[0] === '7') d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
};

export function createOrders(kv: Kv) {
  const store = async (): Promise<Json> => (await kv.getJSON('orders')) ?? { next: 1055, orders: [] };

  async function create(b: Json): Promise<Json> {
    const tel = phone(b.customer?.phone);
    if (!b.customer?.name || String(b.customer.name).trim().length < 2) fail('يرجى إدخال الاسم الكامل للمستلم.');
    if (!tel) fail('رقم الهاتف غير صحيح (مثال: 07701234567).');
    if (!b.delivery?.governorate || !b.delivery?.district || !b.delivery?.landmark) fail('عنوان التوصيل ناقص.');
    const cat = await loadCatalog(kv);
    const shown = new Set(cat.categories.filter((c: Json) => !c.hidden).map((c: Json) => c.slug));
    const lines: Json[] = [];
    for (const l of Array.isArray(b.lines) ? b.lines.slice(0, 30) : []) {
      const p = cat.products.find((x: Json) => x.id === l?.productId);
      if (!p || p.hidden || !shown.has(p.category)) fail('إحدى القطع لم تعد متوفرة في المتجر. حدّث السلة وحاول مجدداً.', 409);
      const qty = Math.max(1, Math.min(10, Math.round(Number(l.qty) || 1)));
      if (qty > p.stock) fail(`الكمية المطلوبة من «${p.shortName}» غير متوفرة حالياً (المتوفر: ${p.stock}).`, 409);
      lines.push({ productId: p.id, name: p.shortName, sku: p.sku, image: p.image, qty, price: p.price, ...(l.options ? { options: l.options } : {}) });
      p.stock -= qty;
    }
    if (!lines.length) fail('السلة فارغة أو تحتوي قطعاً أكثر من المسموح.');
    const s = cat.settings ?? {};
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    const code = String(b.couponCode ?? '').toUpperCase();
    if (code && !s.coupons?.[code]) fail(`القسيمة ${code} لم تعد صالحة. أزلها من السلة وحاول مجدداً.`, 409);
    const discount = code ? Math.round((subtotal * s.coupons[code].percent) / 100) : 0;
    const after = subtotal - discount;
    const shipping = s.freeShippingThreshold > 0 && after >= s.freeShippingThreshold ? 0 : s.shippingFee;
    const all = await store();
    const order = {
      id: all.next,
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: {
        name: String(b.customer.name).trim().slice(0, 120),
        phone: tel,
        ...(b.customer.email ? { email: String(b.customer.email).slice(0, 160) } : {}),
      },
      delivery: b.delivery,
      payment: b.payment === 'cod' || !b.payment ? 'cod' : String(b.payment),
      lines,
      subtotal,
      discount,
      shipping,
      total: after + shipping,
      ...(code ? { couponCode: code } : {}),
    };
    await kv.setJSON('orders', { next: all.next + 1, orders: [order, ...all.orders] });
    await kv.setJSON('catalog', cat);
    return order;
  }

  async function setStatus(b: Json): Promise<Json> {
    if (!STATUSES.includes(String(b.status))) fail('حالة الطلب غير معروفة.');
    const all = await store();
    const order = all.orders.find((o: Json) => o.id === Number(b.id));
    if (!order) fail('الطلب غير موجود.', 404);
    const was = order.status;
    order.status = b.status;
    order.updatedAt = new Date().toISOString();
    await kv.setJSON('orders', all);
    // الإلغاء/الإرجاع يعيد الكمية للمخزون، والتراجع عنه يحجزها من جديد
    if (RELEASED.includes(was) !== RELEASED.includes(order.status)) {
      const sign = RELEASED.includes(order.status) ? 1 : -1;
      const cat = await loadCatalog(kv);
      for (const l of order.lines) {
        const p = cat.products.find((x: Json) => x.id === l.productId);
        if (p) p.stock = Math.max(0, Number(p.stock) + sign * Number(l.qty));
      }
      await kv.setJSON('catalog', cat);
    }
    return order;
  }

  async function track(rawId: string | null, rawPhone: string | null): Promise<Json> {
    const id = Number(String(rawId ?? '').replace(/\D/g, ''));
    const tel = phone(rawPhone);
    if (!id || !tel) fail('يرجى إدخال رقم الطلب ورقم الهاتف المستخدم فيه.');
    const order = (await store()).orders.find((o: Json) => o.id === id && o.customer.phone === tel);
    if (!order) fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
    return order;
  }

  return { create, list: async () => (await store()).orders as Json[], setStatus, track };
}
