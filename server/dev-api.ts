/**
 * خادم تطوير محاكٍ لواجهة PHP (server/api/index.php) داخل `npm run dev` فقط.
 *
 * يتبع العقد نفسه (المسارات، أشكال الاستجابة، حساب الأسعار من الكتالوج) حتى تعمل لوحة الإدارة
 * والطلبات محلياً بلا PHP. البيانات تُحفظ في `.dev-data/` (غير مُتتبَّع في git).
 * الدخول: owner / owner12345 (أو IRIS_DEV_USER / IRIS_DEV_PASSWORD).
 * الإنتاج يستخدم PHP الحقيقي — هذا الملف لا يدخل في البناء.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function irisDevApi(root: string): Plugin {
  const dataDir = path.join(root, '.dev-data');
  const uploadsDir = path.join(root, 'public', 'uploads');
  const seedFile = path.join(root, 'src', 'data', 'seed.json');
  const sessions = new Map<string, Json>();
  const admin = { username: process.env.IRIS_DEV_USER ?? 'owner', name: 'مالك المتجر', role: 'المالك' };

  const read = (name: string, fallback: unknown = null) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dataDir, `${name}.json`), 'utf8'));
    } catch {
      return fallback;
    }
  };
  const write = (name: string, value: unknown) => {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `${name}.json`), JSON.stringify(value, null, 2));
  };
  const catalog = (): Json => read('catalog') ?? JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  const password = () => read('auth')?.password ?? process.env.IRIS_DEV_PASSWORD ?? 'owner12345';

  const send = (res: ServerResponse, status: number, data: Json) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(data));
  };
  const ok = (res: ServerResponse, data: Json = {}) => send(res, 200, { ok: true, ...data });
  const fail = (res: ServerResponse, error: string, status = 400) => send(res, status, { ok: false, error });

  const body = async (req: IncomingMessage): Promise<Json> => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch {
      return {};
    }
  };
  const sessionOf = (req: IncomingMessage) => {
    const token = /(?:^|;\s*)IRISADMIN=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
    return token ? (sessions.get(token) ?? null) : null;
  };
  const phone = (v: unknown) => {
    let d = String(v ?? '').replace(/\D+/g, '');
    if (d.startsWith('00964')) d = d.slice(5);
    else if (d.startsWith('964')) d = d.slice(3);
    if (d.length === 10 && d[0] === '7') d = `0${d}`;
    return /^07\d{9}$/.test(d) ? d : null;
  };

  async function handle(req: IncomingMessage, res: ServerResponse, url: URL) {
    const route = (url.searchParams.get('r') ?? '').replace(/^\/+|\/+$/g, '');
    const key = `${req.method} ${route}`;
    const needAdmin = ['POST catalog/save', 'POST upload', 'POST auth/password', 'GET orders', 'POST orders/status'].includes(key);
    // مثل PHP: كل طلب يغيّر البيانات أو يخص المالك يحتاج ترويسة X-Requested-With
    if ((req.method !== 'GET' || needAdmin) && req.headers['x-requested-with'] !== 'iris') return fail(res, 'طلب غير مسموح.', 403);
    if (needAdmin && !sessionOf(req)) return fail(res, 'انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);

    switch (key) {
      case 'GET health':
        return ok(res, { php: 'dev-mock', writable: true, uploads: true, catalog: read('catalog') ? 'owner' : 'seed', passwordSet: true });
      case 'GET catalog':
        return ok(res, { catalog: catalog() });
      case 'POST catalog/save': {
        const b = await body(req);
        const c = b.catalog as Json | undefined;
        if (!c || !Array.isArray(c.categories) || !Array.isArray(c.products)) return fail(res, 'لم تصل بيانات الكتالوج.');
        const slugs = new Set(c.categories.map((x: Json) => x.slug));
        const bad = c.products.find((p: Json) => !slugs.has(p.category));
        if (bad) return fail(res, `قسم المنتج «${bad.name}» غير موجود.`);
        const saved = { categories: c.categories, products: c.products, settings: c.settings, updatedAt: new Date().toISOString() };
        write('catalog', saved);
        return ok(res, { catalog: saved });
      }
      case 'POST upload': {
        const form = await new Request(url, {
          method: 'POST',
          headers: req.headers as HeadersInit,
          body: req as unknown as BodyInit,
          duplex: 'half',
        } as RequestInit).formData();
        const file = form.get('file');
        if (!(file instanceof File)) return fail(res, 'لم يصل أي ملف.');
        const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }[file.type];
        if (!ext) return fail(res, 'الملف ليس صورة مدعومة (JPG أو PNG أو WEBP).');
        const now = new Date();
        const sub = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
        fs.mkdirSync(path.join(uploadsDir, sub), { recursive: true });
        const name = `${randomBytes(10).toString('hex')}.${ext}`;
        fs.writeFileSync(path.join(uploadsDir, sub, name), Buffer.from(await file.arrayBuffer()));
        return ok(res, { url: `/uploads/${sub}/${name}` });
      }
      case 'POST auth/login': {
        const b = await body(req);
        if (String(b.username ?? '').toLowerCase() !== admin.username || b.password !== password())
          return fail(res, 'اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
        const token = randomBytes(24).toString('hex');
        sessions.set(token, admin);
        res.setHeader('Set-Cookie', `IRISADMIN=${token}; Path=/; HttpOnly; SameSite=Strict`);
        return ok(res, { admin });
      }
      case 'POST auth/logout':
        res.setHeader('Set-Cookie', 'IRISADMIN=; Path=/; Max-Age=0');
        return ok(res);
      case 'GET auth/me':
        return ok(res, { admin: sessionOf(req) });
      case 'POST auth/password': {
        const b = await body(req);
        if (b.current !== password()) return fail(res, 'كلمة المرور الحالية غير صحيحة.');
        if (String(b.next ?? '').length < 8) return fail(res, 'كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
        write('auth', { password: b.next });
        return ok(res);
      }
      case 'POST orders': {
        const b = await body(req);
        const tel = phone(b.customer?.phone);
        if (!b.customer?.name || String(b.customer.name).trim().length < 2) return fail(res, 'يرجى إدخال الاسم الكامل للمستلم.');
        if (!tel) return fail(res, 'رقم الهاتف غير صحيح (مثال: 07701234567).');
        if (!b.delivery?.governorate || !b.delivery?.district || !b.delivery?.landmark) return fail(res, 'عنوان التوصيل ناقص.');
        const cat = catalog();
        const shown = new Set(cat.categories.filter((c: Json) => !c.hidden).map((c: Json) => c.slug));
        const lines: Json[] = [];
        for (const l of b.lines ?? []) {
          const p = cat.products.find((x: Json) => x.id === l.productId);
          if (!p || p.hidden || !shown.has(p.category))
            return fail(res, 'إحدى القطع لم تعد متوفرة في المتجر. حدّث السلة وحاول مجدداً.', 409);
          const qty = Math.max(1, Math.min(10, Math.round(Number(l.qty) || 1)));
          if (qty > p.stock) return fail(res, `الكمية المطلوبة من «${p.shortName}» غير متوفرة حالياً (المتوفر: ${p.stock}).`, 409);
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
        if (!lines.length) return fail(res, 'السلة فارغة أو تحتوي قطعاً أكثر من المسموح.');
        const s = cat.settings ?? {};
        const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
        const code = String(b.couponCode ?? '').toUpperCase();
        if (code && !s.coupons?.[code]) return fail(res, `القسيمة ${code} لم تعد صالحة. أزلها من السلة وحاول مجدداً.`, 409);
        const discount = code ? Math.round((subtotal * s.coupons[code].percent) / 100) : 0;
        const after = subtotal - discount;
        const shipping = s.freeShippingThreshold > 0 && after >= s.freeShippingThreshold ? 0 : s.shippingFee;
        const store = read('orders', { next: 1055, orders: [] });
        const order = {
          id: store.next,
          createdAt: new Date().toISOString(),
          status: 'pending',
          customer: { name: String(b.customer.name).trim(), phone: tel, ...(b.customer.email ? { email: b.customer.email } : {}) },
          delivery: b.delivery,
          payment: b.payment ?? 'cod',
          lines,
          subtotal,
          discount,
          shipping,
          total: after + shipping,
          ...(code ? { couponCode: code } : {}),
        };
        write('orders', { next: store.next + 1, orders: [order, ...store.orders] });
        write('catalog', cat);
        return ok(res, { order });
      }
      case 'GET orders':
        return ok(res, { orders: read('orders', { orders: [] }).orders });
      case 'POST orders/status': {
        const b = await body(req);
        const store = read('orders', { next: 1055, orders: [] });
        const order = store.orders.find((o: Json) => o.id === Number(b.id));
        if (!order) return fail(res, 'الطلب غير موجود.', 404);
        order.status = b.status;
        order.updatedAt = new Date().toISOString();
        write('orders', store);
        return ok(res, { order });
      }
      case 'GET orders/track': {
        const id = Number(String(url.searchParams.get('id') ?? '').replace(/\D/g, ''));
        const tel = phone(url.searchParams.get('phone'));
        const order = read('orders', { orders: [] }).orders.find((o: Json) => o.id === id && o.customer.phone === tel);
        return order ? ok(res, { order }) : fail(res, 'لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
      }
      default:
        return fail(res, 'المسار غير موجود.', 404);
    }
  }

  return {
    name: 'iris-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname !== '/api/index.php') return next();
        handle(req, res, url).catch((e) => fail(res, String(e), 500));
      });
    },
  };
}
