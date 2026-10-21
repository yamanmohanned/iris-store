/**
 * وضع العرض التجريبي (VITE_DEMO=1) لاستضافة ثابتة مثل Netlify: نفس عقد واجهة PHP
 * لكن داخل المتصفح، والبيانات في localStorage لهذا المتصفح فقط. للاستعراض وأخذ الملاحظات، لا للبيع الفعلي.
 * (رفع الخطوط والفيديو والاستيراد من إنستغرام تحتاج الخادم الحقيقي.)
 */
import seed from '@/data/seed.json';
import { allows, cleanPermissions, FULL_ACCESS, passwordProblem, USERNAME_PATTERN, type AdminProfile, type Section } from './permissions';
import { RESET_PHRASE } from './reset';

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
const owner: AdminProfile = { id: 'owner', username: DEMO_USER, name: 'مالك المتجر', title: 'المالك', role: 'owner', permissions: FULL_ACCESS };

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
const NEEDS_SERVER = 'هذه الميزة تحتاج الموقع على الاستضافة الفعلية (نسخة العرض تعمل داخل المتصفح فقط).';

interface DemoStaff {
  id: string;
  username: string;
  name: string;
  title: string;
  password: string;
  permissions: AdminProfile['permissions'];
  active: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const catalog = (): Json => read('catalog', seed as Json);
const staff = () => read<DemoStaff[]>('users', []);
const publicStaff = ({ password: _p, ...s }: DemoStaff) => s;
const phone = (v: unknown) => {
  let d = String(v ?? '').replace(/\D+/g, '');
  if (d.startsWith('964')) d = d.slice(3);
  if (d.length === 10 && d[0] === '7') d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
};

function currentUser(): AdminProfile | null {
  const uid = read<string | boolean>('session', false);
  if (uid === true || uid === 'owner') return owner;
  const s = staff().find((u) => u.id === uid && u.active);
  return s ? { id: s.id, username: s.username, name: s.name, title: s.title || 'موظف', role: 'staff', permissions: cleanPermissions(s.permissions) } : null;
}

async function toDataUrl(file: Blob, type: 'image/jpeg' | 'image/png', max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.75);
}

const need = (user: AdminProfile | null, section?: Section, level: 'view' | 'edit' = 'view') => {
  if (!user) fail('انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);
  if (section && !allows(user!.permissions, section, level)) fail('لا تملك صلاحية لهذا الإجراء.', 403);
  return user!;
};
const ownerOnly = (user: AdminProfile | null) => {
  if (need(user).role !== 'owner') fail('لا تملك صلاحية لهذا الإجراء.', 403);
};

export async function demoApi(route: string, method: string, body: Json | undefined, query: Record<string, string> = {}, form?: FormData): Promise<Json> {
  const user = currentUser();

  switch (`${method} ${route}`) {
    case 'GET health':
      return { ok: true, server: 'browser', demoLogin: read('password', DEMO_PASSWORD) === DEMO_PASSWORD, browserOnly: true };
    case 'GET catalog':
      return { ok: true, catalog: catalog() };
    case 'POST catalog/save': {
      const u = need(user);
      const current = catalog();
      const pick = (s: Section, k: string) => (allows(u.permissions, s, 'edit') ? body!.catalog[k] : current[k]);
      if (!(['products', 'categories', 'settings'] as Section[]).some((s) => allows(u.permissions, s, 'edit'))) fail('لا تملك صلاحية لهذا الإجراء.', 403);
      const saved = {
        categories: pick('categories', 'categories'),
        products: pick('products', 'products'),
        settings: pick('settings', 'settings'),
        updatedAt: new Date().toISOString(),
      };
      try {
        write('catalog', saved);
      } catch {
        fail('امتلأت مساحة التخزين التجريبية في المتصفح؛ احذف بعض الصور.');
      }
      return { ok: true, catalog: saved };
    }
    case 'POST upload': {
      need(user);
      const kind = query.kind ?? 'image';
      if (kind === 'font' || kind === 'video') fail(NEEDS_SERVER, 503);
      const file = form?.get('file');
      if (!(file instanceof Blob)) fail('لم يصل أي ملف.');
      return { ok: true, url: await toDataUrl(file as Blob, kind === 'logo' ? 'image/png' : 'image/jpeg', kind === 'logo' ? 600 : 900) };
    }
    case 'POST auth/login': {
      const username = String(body?.username ?? '').trim().toLowerCase();
      if (username === DEMO_USER && body?.password === read('password', DEMO_PASSWORD)) {
        write('session', 'owner');
        return { ok: true, admin: owner };
      }
      const list = staff();
      const s = list.find((x) => x.username === username && x.password === body?.password);
      if (!s) fail('اسم المستخدم أو كلمة المرور غير صحيحة.', 401);
      if (!s!.active) fail('هذا الحساب موقوف. تواصل مع مالك المتجر.', 403);
      s!.lastLoginAt = new Date().toISOString();
      write('users', list);
      write('session', s!.id);
      return { ok: true, admin: currentUser() };
    }
    case 'POST auth/logout':
      write('session', false);
      return { ok: true };
    case 'GET auth/me':
      return { ok: true, admin: user };
    case 'POST auth/password': {
      const u = need(user);
      const problem = passwordProblem(String(body?.next ?? ''), u.username);
      if (problem) fail(problem);
      if (u.role === 'owner') {
        if (body?.current !== read('password', DEMO_PASSWORD)) fail('كلمة المرور الحالية غير صحيحة.');
        write('password', body!.next);
      } else {
        const list = staff();
        const s = list.find((x) => x.id === u.id)!;
        if (body?.current !== s.password) fail('كلمة المرور الحالية غير صحيحة.');
        s.password = body!.next;
        write('users', list);
      }
      return { ok: true };
    }
    case 'GET users':
      ownerOnly(user);
      return { ok: true, users: staff().map(publicStaff), owner: { username: DEMO_USER } };
    case 'POST users/save': {
      ownerOnly(user);
      const input = (body?.user ?? {}) as Json;
      const list = staff();
      const username = String(input.username ?? '').trim().toLowerCase();
      if (!USERNAME_PATTERN.test(username) || username === DEMO_USER) fail('اسم الدخول غير صالح أو محجوز.');
      if (list.some((x) => x.username === username && x.id !== input.id)) fail('اسم الدخول مستخدم لموظف آخر.');
      const existing = list.find((x) => x.id === input.id);
      if (!existing && String(input.password ?? '').length < 8) fail('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      const record: DemoStaff = {
        id: existing?.id ?? `u-${Date.now().toString(36)}`,
        username,
        name: String(input.name ?? '').trim(),
        title: String(input.title ?? '').trim(),
        password: input.password || existing?.password || '',
        permissions: cleanPermissions(input.permissions),
        active: input.active !== false,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        ...(existing?.lastLoginAt ? { lastLoginAt: existing.lastLoginAt } : {}),
      };
      const next = existing ? list.map((x) => (x.id === record.id ? record : x)) : [...list, record];
      write('users', next);
      return { ok: true, users: next.map(publicStaff) };
    }
    case 'POST users/delete': {
      ownerOnly(user);
      const next = staff().filter((x) => x.id !== body?.id);
      write('users', next);
      return { ok: true, users: next.map(publicStaff) };
    }
    case 'GET instagram/status':
      need(user, 'products', 'edit');
      return { ok: true, connected: false };
    case 'POST instagram/connect':
    case 'POST instagram/disconnect':
    case 'GET instagram/media':
    case 'POST instagram/fetch':
      return fail(NEEDS_SERVER, 503);
    case 'POST system/reset': {
      ownerOnly(user);
      if (String(body?.confirm ?? '').trim() !== RESET_PHRASE) fail(`اكتب العبارة «${RESET_PHRASE}» كما هي للتأكيد.`);
      if (body?.password !== read('password', DEMO_PASSWORD)) fail('كلمة المرور غير صحيحة.', 403);
      for (const k of ['orders', 'users']) localStorage.removeItem(KEY + k);
      if (body?.mode === 'starter') localStorage.removeItem(KEY + 'catalog');
      else
        write('catalog', {
          categories: [],
          products: [],
          settings: { shippingFee: seed.settings.shippingFee, freeShippingThreshold: seed.settings.freeShippingThreshold, coupons: {}, whatsapp: '' },
          updatedAt: new Date().toISOString(),
        });
      return { ok: true, catalog: catalog(), mode: body?.mode === 'starter' ? 'starter' : 'empty' };
    }
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
      need(user, 'orders');
      return { ok: true, orders: read<Json>('orders', { orders: [] }).orders };
    case 'POST orders/status': {
      need(user, 'orders', 'edit');
      const store = read<Json>('orders', { next: 1055, orders: [] });
      const order = store.orders.find((o: Json) => o.id === Number(body?.id));
      if (!order) fail('الطلب غير موجود.', 404);
      order.status = body!.status;
      write('orders', store);
      return { ok: true, order };
    }
    case 'POST orders/track': {
      const order = read<Json>('orders', { orders: [] }).orders.find(
        (o: Json) => o.id === Number(String(body?.id ?? '').replace(/\D/g, '')) && o.customer.phone === phone(body?.phone),
      );
      if (!order) fail('لم نجد طلباً بهذا الرقم وهذا الهاتف.', 404);
      return { ok: true, order };
    }
    default:
      return fail('المسار غير موجود.', 404);
  }
}

export { DemoError };
