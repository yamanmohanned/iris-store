/**
 * واجهة الخادم لنسخة Netlify التجريبية — نفس عقد server/api/index.php (المسارات وأشكال الاستجابة
 * وحساب الأسعار من الكتالوج وحجز المخزون) لكن البيانات في Netlify Blobs بدل ملفات PHP.
 * بهذا يرى كل من يفتح الرابط نفس الأقسام والمنتجات والطلبات (تجربة حقيقية على أكثر من جهاز).
 *
 * بيانات دخول المالك: متغيرا البيئة IRIS_ADMIN_USER و IRIS_ADMIN_PASSWORD في Netlify
 * (الافتراضي owner / demo1234 ويظهر تلميحه في صفحة الدخول حتى تُضبط كلمة مرور خاصة).
 */
import { getStore } from '@netlify/blobs';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import seed from '../../src/data/seed.json' with { type: 'json' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = Record<string, any>;

/** تخزين مفتاح/قيمة (Netlify Blobs في النشر، وذاكرة أو ملفات في الاختبار المحلي). */
export interface Kv {
  getJSON(key: string): Promise<Json | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  getFile(key: string): Promise<{ data: ArrayBuffer; type: string } | null>;
  setFile(key: string, data: ArrayBuffer, type: string): Promise<void>;
}

export interface Env {
  user?: string;
  password?: string;
}

const DEFAULT_PASSWORD = 'demo1234';
const SESSION_TTL = 12 * 60 * 60; // ثوانٍ
const MAX_UPLOAD = 5 * 1024 * 1024; // حد طلبات Netlify Functions حوالي 6MB
const STATUSES = ['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled', 'returned'];
const RELEASED = ['cancelled', 'returned'];
const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

class Fail extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
function fail(message: string, status = 400): never {
  throw new Fail(message, status);
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const phone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (d.startsWith('00964')) d = d.slice(5);
  else if (d.startsWith('964')) d = d.slice(3);
  if (d.length === 10 && d[0] === '7') d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
};
const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, 32).toString('hex') };
};
const samePassword = (password: string, stored: { salt: string; hash: string }) => {
  const a = scryptSync(password, stored.salt, 32);
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

export function createHandler(kv: Kv, env: Env) {
  const admin = { username: (env.user || 'owner').toLowerCase(), name: 'مالك المتجر', role: 'المالك' };

  const catalog = async (): Promise<Json> => (await kv.getJSON('catalog')) ?? structuredClone(seed as Json);
  const orders = async (): Promise<Json> => (await kv.getJSON('orders')) ?? { next: 1055, orders: [] };

  async function passwordOk(password: string): Promise<boolean> {
    const stored = (await kv.getJSON('auth')) as { salt: string; hash: string } | null;
    if (stored) return samePassword(password, stored);
    const expected = env.password || DEFAULT_PASSWORD;
    const a = Buffer.from(sha(password));
    const b = Buffer.from(sha(expected));
    return timingSafeEqual(a, b);
  }

  /** حد بسيط للمحاولات لكل عنوان IP (مثل iris_rate_limit في PHP). */
  async function rateLimited(bucket: string, ip: string, max: number, windowSec: number, hit: boolean): Promise<boolean> {
    const key = `rate/${bucket}/${sha(ip || 'unknown').slice(0, 24)}`;
    const now = Math.floor(Date.now() / 1000);
    const rec = (await kv.getJSON(key)) as { count: number; until: number } | null;
    const live = rec && rec.until > now ? rec : { count: 0, until: now + windowSec };
    if (hit) await kv.setJSON(key, { count: live.count + 1, until: live.until });
    return live.count >= max;
  }

  async function sessionOf(req: Request): Promise<Json | null> {
    const token = /(?:^|;\s*)IRISADMIN=([a-f0-9]{48})/.exec(req.headers.get('cookie') ?? '')?.[1];
    if (!token) return null;
    const s = await kv.getJSON(`session/${sha(token)}`);
    if (!s || s.exp < Date.now() / 1000) return null;
    return s.admin as Json;
  }

  const json = (status: number, data: Json, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        ...headers,
      },
    });
  const ok = (data: Json = {}, headers?: Record<string, string>) => json(200, { ok: true, ...data }, headers);

  async function body(req: Request): Promise<Json> {
    try {
      const b = await req.json();
      return b && typeof b === 'object' ? (b as Json) : {};
    } catch {
      return {};
    }
  }

  async function serveUpload(pathname: string): Promise<Response> {
    const key = decodeURIComponent(pathname.replace(/^\/uploads\//, ''));
    if (!/^\d{4}\/\d{2}\/[a-f0-9]{20}\.(jpg|png|webp|gif)$/.test(key)) return new Response('Not found', { status: 404 });
    const file = await kv.getFile(key);
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(file.data, {
      headers: { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
    });
  }

  async function route(req: Request, url: URL, ip: string): Promise<Response> {
    const r = (url.searchParams.get('r') ?? '').replace(/^\/+|\/+$/g, '');
    const key = `${req.method} ${r}`;
    const needAdmin = ['POST catalog/save', 'POST upload', 'POST auth/password', 'GET orders', 'POST orders/status'].includes(key);
    // مثل PHP: كل طلب يغيّر البيانات أو يخص المالك يحتاج ترويسة X-Requested-With
    if ((req.method !== 'GET' || needAdmin) && req.headers.get('x-requested-with') !== 'iris') fail('طلب غير مسموح.', 403);
    if (needAdmin && !(await sessionOf(req))) fail('انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);

    switch (key) {
      case 'GET health': {
        const custom = Boolean(env.password) || Boolean(await kv.getJSON('auth'));
        return ok({
          server: 'netlify',
          writable: true,
          uploads: true,
          catalog: (await kv.getJSON('catalog')) ? 'owner' : 'seed',
          passwordSet: true,
          demoLogin: !custom,
        });
      }

      case 'GET catalog':
        return ok({ catalog: await catalog() });

      case 'POST catalog/save': {
        const c = (await body(req)).catalog as Json | undefined;
        if (!c || !Array.isArray(c.categories) || !Array.isArray(c.products)) fail('لم تصل بيانات الكتالوج.');
        const slugs = new Set(c!.categories.map((x: Json) => x.slug));
        const bad = c!.products.find((p: Json) => !slugs.has(p.category));
        if (bad) fail(`قسم المنتج «${bad.name}» غير موجود.`);
        const saved = { categories: c!.categories, products: c!.products, settings: c!.settings, updatedAt: new Date().toISOString() };
        await kv.setJSON('catalog', saved);
        return ok({ catalog: saved });
      }

      case 'POST upload': {
        const form = await req.formData().catch(() => null);
        const file = form?.get('file');
        if (!file || typeof file === 'string') return fail('لم يصل أي ملف.');
        const ext = IMAGE_TYPES[file.type];
        if (!ext) fail('الملف ليس صورة مدعومة (JPG أو PNG أو WEBP).');
        if (file.size > MAX_UPLOAD) fail('حجم الصورة أكبر من 5 ميغابايت.');
        const now = new Date();
        const name = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomBytes(10).toString('hex')}.${ext}`;
        await kv.setFile(name, await file.arrayBuffer(), file.type);
        return ok({ url: `/uploads/${name}` });
      }

      case 'POST auth/login': {
        if (await rateLimited('login', ip, 8, 15 * 60, false)) fail('محاولات كثيرة خاطئة. حاول بعد 15 دقيقة.', 429);
        const b = await body(req);
        const userOk =
          String(b.username ?? '')
            .trim()
            .toLowerCase() === admin.username;
        const passOk = typeof b.password === 'string' && (await passwordOk(b.password));
        if (!userOk || !passOk) {
          await rateLimited('login', ip, 8, 15 * 60, true);
          fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
        }
        const token = randomBytes(24).toString('hex');
        await kv.setJSON(`session/${sha(token)}`, { admin, exp: Math.floor(Date.now() / 1000) + SESSION_TTL });
        const secure = url.protocol === 'https:' ? '; Secure' : '';
        return ok({ admin }, { 'Set-Cookie': `IRISADMIN=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL}${secure}` });
      }

      case 'POST auth/logout': {
        const token = /(?:^|;\s*)IRISADMIN=([a-f0-9]{48})/.exec(req.headers.get('cookie') ?? '')?.[1];
        if (token) await kv.delete(`session/${sha(token)}`);
        return ok({}, { 'Set-Cookie': 'IRISADMIN=; Path=/; Max-Age=0' });
      }

      case 'GET auth/me':
        return ok({ admin: await sessionOf(req) });

      case 'POST auth/password': {
        const b = await body(req);
        if (typeof b.current !== 'string' || !(await passwordOk(b.current))) fail('كلمة المرور الحالية غير صحيحة.');
        if (typeof b.next !== 'string' || b.next.length < 8) fail('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
        await kv.setJSON('auth', hashPassword(b.next));
        return ok();
      }

      case 'POST orders': {
        const b = await body(req);
        const tel = phone(b.customer?.phone);
        if (!b.customer?.name || String(b.customer.name).trim().length < 2) fail('يرجى إدخال الاسم الكامل للمستلم.');
        if (!tel) fail('رقم الهاتف غير صحيح (مثال: 07701234567).');
        if (!b.delivery?.governorate || !b.delivery?.district || !b.delivery?.landmark) fail('عنوان التوصيل ناقص.');
        const cat = await catalog();
        const shown = new Set(cat.categories.filter((c: Json) => !c.hidden).map((c: Json) => c.slug));
        const lines: Json[] = [];
        for (const l of Array.isArray(b.lines) ? b.lines.slice(0, 30) : []) {
          const p = cat.products.find((x: Json) => x.id === l?.productId);
          if (!p || p.hidden || !shown.has(p.category)) fail('إحدى القطع لم تعد متوفرة في المتجر. حدّث السلة وحاول مجدداً.', 409);
          const qty = Math.max(1, Math.min(10, Math.round(Number(l.qty) || 1)));
          if (qty > p.stock) fail(`الكمية المطلوبة من «${p.shortName}» غير متوفرة حالياً (المتوفر: ${p.stock}).`, 409);
          lines.push({
            productId: p.id,
            name: p.shortName,
            sku: p.sku,
            image: p.image,
            qty,
            price: p.price,
            ...(l.options ? { options: l.options } : {}),
          });
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
        const store = await orders();
        const order = {
          id: store.next,
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
        await kv.setJSON('orders', { next: store.next + 1, orders: [order, ...store.orders] });
        await kv.setJSON('catalog', cat);
        return ok({ order });
      }

      case 'GET orders':
        return ok({ orders: (await orders()).orders });

      case 'POST orders/status': {
        const b = await body(req);
        if (!STATUSES.includes(String(b.status))) fail('حالة الطلب غير معروفة.');
        const store = await orders();
        const order = store.orders.find((o: Json) => o.id === Number(b.id));
        if (!order) fail('الطلب غير موجود.', 404);
        const was = order.status;
        order.status = b.status;
        order.updatedAt = new Date().toISOString();
        await kv.setJSON('orders', store);
        // الإلغاء/الإرجاع يعيد الكمية للمخزون، والتراجع عنه يحجزها من جديد (مثل PHP)
        if (RELEASED.includes(was) !== RELEASED.includes(order.status)) {
          const sign = RELEASED.includes(order.status) ? 1 : -1;
          const cat = await catalog();
          for (const l of order.lines) {
            const p = cat.products.find((x: Json) => x.id === l.productId);
            if (p) p.stock = Math.max(0, Number(p.stock) + sign * Number(l.qty));
          }
          await kv.setJSON('catalog', cat);
        }
        return ok({ order });
      }

      case 'GET orders/track': {
        if (await rateLimited('track', ip, 40, 600, true)) fail('محاولات كثيرة. حاول بعد قليل.', 429);
        const id = Number(String(url.searchParams.get('id') ?? '').replace(/\D/g, ''));
        const tel = phone(url.searchParams.get('phone'));
        if (!id || !tel) fail('يرجى إدخال رقم الطلب ورقم الهاتف المستخدم فيه.');
        const order = (await orders()).orders.find((o: Json) => o.id === id && o.customer.phone === tel);
        if (!order) fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
        return ok({ order });
      }

      default:
        return fail('المسار غير موجود.', 404);
    }
  }

  return async function handle(req: Request, ip = ''): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/uploads/'))
        return req.method === 'GET' ? await serveUpload(url.pathname) : new Response(null, { status: 405 });
      return await route(req, url, ip);
    } catch (e) {
      if (e instanceof Fail) return json(e.status, { ok: false, error: e.message });
      console.error(e);
      return json(500, { ok: false, error: 'خطأ غير متوقع في الخادم. حاول مجدداً.' });
    }
  };
}

function blobsKv(): Kv {
  const data = getStore({ name: 'iris-data', consistency: 'strong' });
  const files = getStore({ name: 'iris-uploads', consistency: 'strong' });
  return {
    getJSON: async (k) => ((await data.get(k, { type: 'json' })) as Json | null) ?? null,
    setJSON: async (k, v) => {
      await data.setJSON(k, v);
    },
    delete: async (k) => {
      await data.delete(k);
    },
    getFile: async (k) => {
      const r = await files.getWithMetadata(k, { type: 'arrayBuffer' });
      return r ? { data: r.data, type: String(r.metadata?.type ?? 'application/octet-stream') } : null;
    },
    setFile: async (k, d, type) => {
      await files.set(k, d, { metadata: { type } });
    },
  };
}

let handler: ((req: Request, ip?: string) => Promise<Response>) | null = null;

export default async (req: Request, context: { ip?: string }) => {
  handler ??= createHandler(blobsKv(), { user: process.env.IRIS_ADMIN_USER, password: process.env.IRIS_ADMIN_PASSWORD });
  return handler(req, context?.ip ?? '');
};

export const config = {
  path: ['/api/index.php', '/uploads/*'],
};
