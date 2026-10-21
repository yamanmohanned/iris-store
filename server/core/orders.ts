/**
 * الطلبات: الأسعار تُحسب هنا من الكتالوج (لا يُوثق بالسعر القادم من المتصفح)، والكمية تُحجز من المخزون.
 * نفس منطق route_order_create و route_order_status في PHP.
 */
import { int, loadCatalog, str } from './catalog.ts';
import { fail, type Json, type Kv } from './base.ts';

const STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'];
const RELEASED = ['cancelled', 'returned'];
const PAYMENTS = ['cod', 'zaincash', 'card'];
/** طلبات جديدة لم يؤكدها المتجر بعد لنفس الهاتف خلال يوم — يمنع حجز المخزون بطلبات وهمية. */
export const MAX_OPEN_PER_PHONE = 3;
/** مجموع القطع في الطلب الواحد. */
export const MAX_PIECES = 50;
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export const phone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (d.startsWith('00964')) d = d.slice(5);
  else if (d.startsWith('964')) d = d.slice(3);
  if (d.length === 10 && d[0] === '7') d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
};

export function createOrders(kv: Kv) {
  const store = async (): Promise<Json> => (await kv.getJSON('orders')) ?? { next: 1055, orders: [] };

  /** نفس قواعد route_order_create في PHP: كل حقل بنوعه وطوله، ولا يُخزَّن شيء كما وصل. */
  async function create(b: Json): Promise<Json> {
    const c: Json = b.customer && typeof b.customer === 'object' ? b.customer : {};
    const d: Json = b.delivery && typeof b.delivery === 'object' ? b.delivery : {};
    const name = str(c.name, 80, true, 'اسم المستلم');
    if ([...name].length < 2) fail('يرجى إدخال الاسم الكامل للمستلم.');
    const tel = phone(c.phone);
    if (!tel) fail('رقم الهاتف غير صحيح (مثال: 07701234567).');
    const email = str(c.email, 120);
    if (email && !EMAIL.test(email)) fail('صيغة البريد الإلكتروني غير صحيحة.');
    const delivery: Json = {
      governorate: str(d.governorate, 40, true, 'المحافظة'),
      district: str(d.district, 80, true, 'المدينة أو القضاء'),
      neighborhood: str(d.neighborhood, 120, false, 'الحي'),
      landmark: str(d.landmark, 200, true, 'أقرب نقطة دالة'),
    };
    for (const [k, max] of [['details', 300], ['notes', 500]] as const) {
      const v = str(d[k], max);
      if (v) delivery[k] = v;
    }
    const payment = b.payment == null || b.payment === '' ? 'cod' : String(b.payment);
    if (!PAYMENTS.includes(payment)) fail('طريقة الدفع غير مدعومة.');
    const rawLines = Array.isArray(b.lines) ? b.lines : [];
    if (!rawLines.length || rawLines.length > 30) fail('السلة فارغة أو تحتوي قطعاً أكثر من المسموح.');
    const code = str(b.couponCode, 24).toUpperCase();

    const all = await store();
    const since = Date.now() - DAY_MS;
    const open = all.orders.filter((o: Json) => o.customer?.phone === tel && o.status === 'pending' && Date.parse(o.createdAt) > since).length;
    if (open >= MAX_OPEN_PER_PHONE)
      fail('لديكِ طلبات سابقة بهذا الرقم لم نجهّزها بعد. سنتواصل معكِ قريباً، أو راسلينا لإضافة القطع إلى طلبكِ.', 429);

    const cat = await loadCatalog(kv);
    const shown = new Set(cat.categories.filter((x: Json) => !x.hidden).map((x: Json) => x.slug));
    const lines: Json[] = [];
    let pieces = 0;
    for (const l of rawLines) {
      if (!l || typeof l !== 'object') fail('بيانات السلة غير صالحة.');
      const p = cat.products.find((x: Json) => x.id === String(l.productId ?? ''));
      if (!p) fail('إحدى القطع لم تعد متوفرة في المتجر. حدّث السلة وحاول مجدداً.', 409);
      if (p.hidden || !shown.has(p.category)) fail(`القطعة «${p.shortName}» لم تعد معروضة للبيع.`, 409);
      const qty = int(l.qty ?? 1, 1, 10, 'الكمية');
      pieces += qty;
      if (pieces > MAX_PIECES) fail(`الطلب الواحد حتى ${MAX_PIECES} قطعة. للطلبات الأكبر تواصلي معنا مباشرة.`);
      if (qty > p.stock) fail(`الكمية المطلوبة من «${p.shortName}» غير متوفرة حالياً (المتوفر: ${p.stock}).`, 409);
      const options: Json = {};
      for (const k of ['metal', 'size']) {
        const v = str(l.options && typeof l.options === 'object' ? l.options[k] : '', 80);
        if (v) options[k] = v;
      }
      lines.push({
        productId: p.id,
        name: p.shortName,
        sku: p.sku ?? '',
        image: p.image,
        qty,
        price: Number(p.price),
        ...(Object.keys(options).length ? { options } : {}),
      });
      p.stock -= qty;
    }
    const s = cat.settings ?? {};
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    if (code && !s.coupons?.[code]) fail(`القسيمة ${code} لم تعد صالحة. أزلها من السلة وحاول مجدداً.`, 409);
    const discount = code ? Math.round((subtotal * s.coupons[code].percent) / 100) : 0;
    const after = subtotal - discount;
    const shipping = s.freeShippingThreshold > 0 && after >= s.freeShippingThreshold ? 0 : s.shippingFee;
    const order = {
      id: all.next,
      createdAt: new Date().toISOString(),
      status: 'pending',
      customer: { name, phone: tel, ...(email ? { email } : {}) },
      delivery,
      payment,
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

  async function track(rawId: unknown, rawPhone: unknown): Promise<Json> {
    const id = Number(String(rawId ?? '').replace(/\D/g, ''));
    const tel = phone(rawPhone);
    if (!id || !tel) fail('يرجى إدخال رقم الطلب ورقم الهاتف المستخدم فيه.');
    const order = (await store()).orders.find((o: Json) => o.id === id && o.customer.phone === tel);
    if (!order) fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
    return order;
  }

  return { create, list: async () => (await store()).orders as Json[], setStatus, track };
}
