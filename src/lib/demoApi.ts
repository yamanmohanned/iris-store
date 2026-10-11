/**
 * وضع العرض التجريبي (VITE_DEMO=1) لاستضافة ثابتة مثل Netlify: نفس عقد واجهة PHP
 * لكن داخل المتصفح، والبيانات في localStorage لهذا المتصفح فقط. للاستعراض وأخذ الملاحظات، لا للبيع الفعلي.
 */
import seed from '@/data/seed.json';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const KEY = 'iris.demo.';
const read = <T>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(KEY + k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (k: string, v: unknown) => localStorage.setItem(KEY + k, JSON.stringify(v));

export const DEMO_USER = 'owner';
export const DEMO_PASSWORD = 'demo1234';
const admin = { username: DEMO_USER, name: 'مالك المتجر', role: 'المالك' };

class DemoError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
const fail = (message: string, status = 400): never => {
  throw new DemoError(message, status);
};

const catalog = (): Json => read('catalog', seed as Json);
const phone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (d.startsWith('964')) d = d.slice(3);
  if (d.length === 10 && d[0] === '7') d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
};

async function toDataUrl(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}

export async function demoApi(route: string, method: string, body: Json | undefined, query: Record<string, string> = {}, form?: FormData): Promise<Json> {
  const authed = read<boolean>('session', false);
  const needAdmin = ['POST catalog/save', 'POST upload', 'POST auth/password', 'GET orders', 'POST orders/status'].includes(`${method} ${route}`);
  if (needAdmin && !authed) fail('انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);

  switch (`${method} ${route}`) {
    case 'GET health':
      return { ok: true, server: 'browser', demoLogin: read('password', DEMO_PASSWORD) === DEMO_PASSWORD, browserOnly: true };
    case 'GET catalog':
      return { ok: true, catalog: catalog() };
    case 'POST catalog/save': {
      const saved = { ...body!.catalog, updatedAt: new Date().toISOString() };
      try {
        write('catalog', saved);
      } catch {
        fail('امتلأت مساحة التخزين التجريبية في المتصفح؛ احذف بعض الصور.');
      }
      return { ok: true, catalog: saved };
    }
    case 'POST upload': {
      const file = form?.get('file');
      if (!(file instanceof Blob)) fail('لم يصل أي ملف.');
      return { ok: true, url: await toDataUrl(file as Blob) };
    }
    case 'POST auth/login':
      if (String(body?.username).toLowerCase() !== DEMO_USER || body?.password !== read('password', DEMO_PASSWORD))
        fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
      write('session', true);
      return { ok: true, admin };
    case 'POST auth/logout':
      write('session', false);
      return { ok: true };
    case 'GET auth/me':
      return { ok: true, admin: authed ? admin : null };
    case 'POST auth/password':
      if (body?.current !== read('password', DEMO_PASSWORD)) fail('كلمة المرور الحالية غير صحيحة.');
      if (String(body?.next ?? '').length < 8) fail('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
      write('password', body!.next);
      return { ok: true };
    case 'POST orders': {
      const tel = phone(body?.customer?.phone);
      if (!tel) fail('رقم الهاتف غير صحيح (مثال: 07701234567).');
      const cat = catalog();
      const lines: Json[] = [];
      for (const l of body?.lines ?? []) {
        const p = cat.products.find((x: Json) => x.id === l.productId);
        if (!p || p.hidden) fail('إحدى القطع لم تعد متوفرة في المتجر.', 409);
        const qty = Math.max(1, Math.min(10, Number(l.qty) || 1));
        if (qty > p.stock) fail(`الكمية المطلوبة من «${p.shortName}» غير متوفرة حالياً.`, 409);
        p.stock -= qty;
        lines.push({ productId: p.id, name: p.shortName, sku: p.sku, image: p.image, qty, price: p.price, ...(l.options ? { options: l.options } : {}) });
      }
      const s = cat.settings ?? {};
      const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
      const code = String(body?.couponCode ?? '').toUpperCase();
      const discount = code && s.coupons?.[code] ? Math.round((subtotal * s.coupons[code].percent) / 100) : 0;
      const after = subtotal - discount;
      const shipping = s.freeShippingThreshold > 0 && after >= s.freeShippingThreshold ? 0 : s.shippingFee;
      const store = read<Json>('orders', { next: 1055, orders: [] });
      const order = {
        id: store.next,
        createdAt: new Date().toISOString(),
        status: 'pending',
        customer: { ...body!.customer, phone: tel },
        delivery: body!.delivery,
        payment: body!.payment ?? 'cod',
        lines,
        subtotal,
        discount,
        shipping,
        total: after + shipping,
        ...(discount ? { couponCode: code } : {}),
      };
      write('orders', { next: store.next + 1, orders: [order, ...store.orders] });
      write('catalog', cat);
      return { ok: true, order };
    }
    case 'GET orders':
      return { ok: true, orders: read<Json>('orders', { orders: [] }).orders };
    case 'POST orders/status': {
      const store = read<Json>('orders', { next: 1055, orders: [] });
      const order = store.orders.find((o: Json) => o.id === Number(body?.id));
      if (!order) fail('الطلب غير موجود.', 404);
      order.status = body!.status;
      write('orders', store);
      return { ok: true, order };
    }
    case 'GET orders/track': {
      const order = read<Json>('orders', { orders: [] }).orders.find(
        (o: Json) => o.id === Number(String(query.id).replace(/\D/g, '')) && o.customer.phone === phone(query.phone),
      );
      if (!order) fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
      return { ok: true, order };
    }
    default:
      return fail('المسار غير موجود.', 404);
  }
}

export { DemoError };
