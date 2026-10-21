/**
 * فحص عقد واجهة الخادم: الدخول، فريق العمل والصلاحيات، دمج الكتالوج، الرفع، إنستغرام، إعادة الضبط.
 *
 *   node scripts/qa/api-contract.mjs                 ← يشغّل server/core داخل العملية (تخزين في الذاكرة + إنستغرام وهمي)
 *   node scripts/qa/api-contract.mjs <base> [user] [password]
 *        ← نفس الفحوص على خادم يعمل (مثل PHP: php -S)؛ فحوص إنستغرام تُتخطى
 *
 * تحذير: الوضع الثاني يعيد ضبط بيانات ذلك الخادم بالكامل. لا تشغّله على متجر حقيقي.
 */
import seed from '../../src/data/seed.json' with { type: 'json' };

const BASE = process.argv[2];
const OWNER_USER = process.argv[3] ?? 'owner';
const OWNER_PASS = process.argv[4] ?? 'test-owner-pass';
const remote = Boolean(BASE);

/* ───────────── وسيلة النقل ───────────── */

let handle;
let kv;
let uploads;
let createHandler;
/** تخزين في الذاكرة لخادم server/core داخل العملية. */
function memoryKv() {
  const data = new Map();
  const files = new Map();
  return {
    files,
    kv: {
      getJSON: async (k) => (data.has(k) ? structuredClone(data.get(k)) : null),
      setJSON: async (k, v) => void data.set(k, structuredClone(v)),
      delete: async (k) => void data.delete(k),
      getFile: async (k) => files.get(k) ?? null,
      setFile: async (k, d, type) => void files.set(k, { data: d, type }),
      deleteFile: async (k) => void files.delete(k),
      listFiles: async () => [...files.keys()],
    },
  };
}
if (!remote) {
  ({ createHandler } = await import('../../server/core/handler.ts'));
  const mem = memoryKv();
  kv = mem.kv;
  uploads = mem.files;
  handle = createHandler(kv, { user: OWNER_USER, password: OWNER_PASS, server: 'test', maxVideoUpload: 1024 * 1024 }, { fetch: fakeGraph });
}

class Client {
  cookie = '';
  /** عنوان الجهاز (داخل العملية فقط) — لاختبار حدود المحاولات لكل حساب من أجهزة كثيرة */
  ip = '10.0.0.1';
  /** خادم آخر داخل العملية (مثل نسخة بلا كلمة مرور مضبوطة) */
  handler = null;
  async call(method, route, { body, form, query, header = true, raw } = {}) {
    const url = new URL(raw ?? `/api/index.php?${new URLSearchParams({ r: route, ...query })}`, BASE ?? 'http://test.local');
    const headers = { Accept: 'application/json' };
    if (header) headers['X-Requested-With'] = 'iris';
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (form) payload = form;
    else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const req = new Request(url, { method, headers, body: payload });
    const res = remote ? await fetch(req) : await (this.handler ?? handle)(req, this.ip);
    const set = res.headers.get('set-cookie');
    if (set) {
      const m = /IRISADMIN=([^;]*)/.exec(set);
      if (m) this.cookie = m[1] ? `IRISADMIN=${m[1]}` : '';
    }
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('json') ? await res.json() : null;
    return { status: res.status, data, res };
  }
  login(username, password) {
    return this.call('POST', 'auth/login', { body: { username, password } });
  }
}

/* ───────────── إنستغرام وهمي ───────────── */

// صورة PNG حقيقية 1×1 (خادم PHP يتحقق منها أيضاً بـ getimagesize)
const PNG = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'));
const MP4 = new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0, 0, 0, 0]);
const WOFF2 = new Uint8Array([0x77, 0x4f, 0x46, 0x32, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1]);
const CDN = 'https://scontent.cdninstagram.com/v/t51/';
const GOOD_TOKEN = 'IGAA' + 'x'.repeat(60);
const graphMedia = [
  {
    id: '17900000000000001',
    caption: 'تطقيم كبلز 😣🤍\nطلاء ثابت سعر السيت 12,000 🇮🇶',
    media_type: 'CAROUSEL_ALBUM',
    permalink: 'https://www.instagram.com/p/AAA/',
    timestamp: '2026-06-29T10:00:00+0000',
    children: {
      data: [
        { id: '17900000000000011', media_type: 'IMAGE', media_url: `${CDN}a.jpg` },
        { id: '17900000000000012', media_type: 'IMAGE', media_url: `${CDN}b.jpg` },
      ],
    },
  },
  {
    id: '17900000000000002',
    caption: 'كلادة الذكريات السعر حسب الموديل من ( 6,000-8,000)',
    media_type: 'VIDEO',
    media_url: `${CDN}v.mp4`,
    thumbnail_url: `${CDN}v.jpg`,
    permalink: 'https://www.instagram.com/reel/BBB/',
    timestamp: '2026-10-11T10:00:00+0000',
  },
  {
    id: '17900000000000003',
    caption: 'evil',
    media_type: 'IMAGE',
    media_url: 'https://evil.example.com/x.jpg',
    permalink: 'https://www.instagram.com/p/CCC/',
    timestamp: '2026-10-12T10:00:00+0000',
  },
];
async function fakeGraph(input) {
  const url = new URL(typeof input === 'string' ? input : input.url);
  const reply = (d) => new Response(JSON.stringify(d), { headers: { 'Content-Type': 'application/json' } });
  if (url.hostname === 'scontent.cdninstagram.com') return new Response(url.pathname.endsWith('.mp4') ? MP4 : JPG);
  if (url.hostname !== 'graph.instagram.com') throw new Error(`unexpected fetch ${url}`);
  const token = url.searchParams.get('access_token');
  if (token !== GOOD_TOKEN) return reply({ error: { code: 190, message: 'Invalid OAuth access token' } });
  const last = url.pathname.split('/').pop();
  if (last === 'me') return reply({ user_id: '1784', username: 'iris_st0re1', account_type: 'BUSINESS' });
  if (last === 'media') return reply({ data: graphMedia, paging: {} });
  const post = graphMedia.find((m) => m.id === last);
  return post ? reply(post) : reply({ error: { code: 100, message: 'not found' } });
}

/* ───────────── أدوات الفحص ───────────── */

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) passed++;
  else failures.push(`${name}${detail !== undefined ? ` → ${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 300)}` : ''}`);
}
const fileForm = (bytes, name = 'f.bin') => {
  const f = new FormData();
  f.append('file', new Blob([bytes]), name);
  return f;
};
const big = (head, size) => {
  const b = new Uint8Array(size);
  b.set(head);
  return b;
};

/* ───────────── الفحوص ───────────── */

const owner = new Client();
const anon = new Client();

{
  const h = await anon.call('GET', 'health');
  check('health يعمل', h.status === 200 && h.data?.ok, h.data);
  const bad = await owner.login(OWNER_USER, 'wrong-password');
  check('كلمة مرور خاطئة ← 401', bad.status === 401, bad.data);
  const noHeader = await owner.call('POST', 'auth/login', { body: { username: OWNER_USER, password: OWNER_PASS }, header: false });
  check('بلا X-Requested-With ← 403', noHeader.status === 403, noHeader.data);
  const ok = await owner.login(OWNER_USER, OWNER_PASS);
  check('دخول المالك', ok.status === 200 && ok.data?.admin?.role === 'owner' && ok.data.admin.permissions.settings === 'edit', ok.data);
  const me = await owner.call('GET', 'auth/me');
  check('auth/me للمالك', me.data?.admin?.id === 'owner', me.data);
}

// إعادة ضبط أولية حتى تبدأ الفحوص من المحتوى الافتتاحي (مهم عند الفحص على خادم حقيقي)
{
  const r = await owner.call('POST', 'system/reset', { body: { password: OWNER_PASS, confirm: 'إعادة ضبط المتجر', mode: 'starter' } });
  check('إعادة ضبط أولية', r.status === 200, r.data);
}

const staffInput = {
  orders1: { username: 'orders1', name: 'مسؤولة الطلبات', title: 'الطلبات', password: 'orders-pass-1', permissions: { orders: 'edit', products: 'view', categories: 'view', settings: 'none' } },
  prod1: { username: 'prod1', name: 'مدخل المنتجات', title: 'منتجات', password: 'prod-pass-1', permissions: { orders: 'none', products: 'edit', categories: 'none', settings: 'none' } },
  cats1: { username: 'cats1', name: 'منظم الأقسام', title: 'أقسام', password: 'cats-pass-1', permissions: { orders: 'none', products: 'none', categories: 'edit', settings: 'none' } },
  viewer: { username: 'viewer', name: 'مشاهد', title: '', password: 'look-only-pass-1', permissions: { orders: 'view', products: 'view', categories: 'view', settings: 'view' } },
};

// فريق العمل: التحقق من المدخلات
{
  const cases = [
    ['اسم دخول غير صالح', { ...staffInput.orders1, username: 'A B' }],
    ['اسم المالك محجوز', { ...staffInput.orders1, username: OWNER_USER }],
    ['كلمة مرور قصيرة', { ...staffInput.orders1, password: 'short' }],
    ['اسم الموظف مطلوب', { ...staffInput.orders1, name: '' }],
  ];
  for (const [name, user] of cases) {
    const r = await owner.call('POST', 'users/save', { body: { user } });
    check(`رفض: ${name}`, r.status === 400, r.data);
  }
  for (const u of Object.values(staffInput)) {
    const r = await owner.call('POST', 'users/save', { body: { user: u } });
    check(`إنشاء ${u.username}`, r.status === 200 && r.data.users.some((x) => x.username === u.username), r.data);
  }
  const dup = await owner.call('POST', 'users/save', { body: { user: staffInput.orders1 } });
  check('رفض اسم دخول مكرر', dup.status === 400, dup.data);
  const list = await owner.call('GET', 'users');
  check('قائمة الفريق بلا كلمات مرور', list.status === 200 && list.data.users.every((u) => !('hash' in u) && !('salt' in u) && !('password' in u)), list.data);
}

const ids = Object.fromEntries((await owner.call('GET', 'users')).data.users.map((u) => [u.username, u.id]));
const staff = {};
for (const [k, u] of Object.entries(staffInput)) {
  staff[k] = new Client();
  const r = await staff[k].login(u.username, u.password);
  check(`دخول ${k}`, r.status === 200 && r.data.admin.role === 'staff' && r.data.admin.permissions.orders === u.permissions.orders, r.data);
}

// طلب من الزبون لاختبار صلاحيات الطلبات
const product = seed.products.find((p) => p.stock > 1 && !p.hidden && !seed.categories.find((c) => c.slug === p.category)?.hidden);
let orderId;
{
  const r = await anon.call('POST', 'orders', {
    body: {
      customer: { name: 'زبونة تجريبية', phone: '07701234567' },
      delivery: { governorate: 'بغداد', district: 'الكرادة', neighborhood: 'حي', landmark: 'قرب الجسر' },
      payment: 'cod',
      lines: [{ productId: product.id, qty: 1 }],
    },
  });
  check('إنشاء طلب من الزبون', r.status === 200 && r.data.order.total > 0, r.data);
  orderId = r.data?.order?.id;
}

// مصفوفة الصلاحيات على المسارات
{
  const matrix = [
    ['orders1', 'GET', 'orders', undefined, 200],
    ['orders1', 'POST', 'orders/status', { id: orderId, status: 'confirmed' }, 200],
    ['orders1', 'POST', 'catalog/save', { catalog: seed }, 403],
    ['orders1', 'GET', 'users', undefined, 403],
    ['orders1', 'POST', 'system/reset', { password: OWNER_PASS, confirm: 'إعادة ضبط المتجر' }, 403],
    ['orders1', 'GET', 'instagram/media', undefined, 403],
    ['viewer', 'GET', 'orders', undefined, 200],
    ['viewer', 'POST', 'orders/status', { id: orderId, status: 'preparing' }, 403],
    ['viewer', 'POST', 'catalog/save', { catalog: seed }, 403],
    ['prod1', 'GET', 'orders', undefined, 403],
    ['prod1', 'POST', 'users/save', { user: staffInput.orders1 }, 403],
    ['prod1', 'POST', 'instagram/connect', { token: GOOD_TOKEN }, 403],
    ['cats1', 'GET', 'instagram/status', undefined, 403],
  ];
  for (const [who, method, route, body, expected] of matrix) {
    const r = await staff[who].call(method, route, { body });
    check(`${who} ${method} ${route} ← ${expected}`, r.status === expected, r.data);
  }
  const anonOrders = await anon.call('GET', 'orders');
  check('زائر بلا دخول ← 401', anonOrders.status === 401, anonOrders.data);
}

// قاعدة الدمج: الموظف لا يغيّر إلا ما يملك تعديله
{
  const cat = (await anon.call('GET', 'catalog')).data.catalog;
  const edited = structuredClone(cat);
  edited.products[0].price = 4321;
  edited.settings.shippingFee = 1;
  edited.categories[0].name = 'اسم مخترق';
  const r = await staff.prod1.call('POST', 'catalog/save', { body: { catalog: edited } });
  check('prod1 يحفظ المنتجات', r.status === 200 && r.data.catalog.products[0].price === 4321, r.data);
  check('prod1 لا يغيّر الإعدادات', r.data?.catalog?.settings?.shippingFee === cat.settings.shippingFee, r.data?.catalog?.settings);
  check('prod1 لا يغيّر الأقسام', r.data?.catalog?.categories?.[0]?.name === cat.categories[0].name, r.data?.catalog?.categories?.[0]);

  const withProducts = cat.categories.find((c) => cat.products.some((p) => p.category === c.slug));
  const dropped = structuredClone(cat);
  dropped.categories = dropped.categories.filter((c) => c.slug !== withProducts.slug);
  const d = await staff.cats1.call('POST', 'catalog/save', { body: { catalog: dropped } });
  check('cats1 لا يحذف قسماً فيه منتجات', d.status === 403, d.data);

  const renamed = structuredClone(cat);
  renamed.categories[0].description = 'وصف جديد من منظم الأقسام';
  renamed.products[0].price = 1;
  const c = await staff.cats1.call('POST', 'catalog/save', { body: { catalog: renamed } });
  check('cats1 يعدّل الأقسام فقط', c.status === 200 && c.data.catalog.categories[0].description === 'وصف جديد من منظم الأقسام' && c.data.catalog.products[0].price === 4321, c.data);
}

// تنظيف الكتالوج والحقول الجديدة
{
  const cat = (await anon.call('GET', 'catalog')).data.catalog;
  const next = structuredClone(cat);
  next.products[0].videos = ['/uploads/2026/10/aaaaaaaaaaaaaaaaaaaa.mp4'];
  next.products[0].source = 'ig:17900000000000001';
  next.products[0].sourceUrl = 'https://www.instagram.com/p/AAA/';
  next.products[0].unknownField = 'x';
  next.products[0].customColors = [
    { name: 'أزرق ملكي', hex: '#1F3A93' },
    { name: 'أزرق ملكي', hex: '#1f3a94' },
    { name: 'زيتي', hex: '#556b2f' },
  ];
  next.settings.unknownSetting = 'x';
  next.settings.branding = {
    logo: '/uploads/2026/10/bbbbbbbbbbbbbbbbbbbb.png',
    logoTint: true,
    showWordmark: false,
    bodyFont: { preset: 'cairo' },
    headingFont: { name: 'خطي', regular: '/uploads/fonts/cccccccccccccccccccc.woff2' },
  };
  const r = await owner.call('POST', 'catalog/save', { body: { catalog: next } });
  const p = r.data?.catalog?.products?.[0];
  check('حفظ الفيديو ومصدر إنستغرام', r.status === 200 && p?.videos?.length === 1 && p.source === 'ig:17900000000000001' && p.sourceUrl, r.data);
  check('حذف الحقول المجهولة', p && !('unknownField' in p) && !('unknownSetting' in r.data.catalog.settings), p);
  check(
    'حفظ الألوان المخصصة (بلا تكرار، بأحرف صغيرة)',
    JSON.stringify(p?.customColors) === JSON.stringify([{ name: 'أزرق ملكي', hex: '#1f3a94' }, { name: 'زيتي', hex: '#556b2f' }]),
    p?.customColors,
  );
  const badColor = structuredClone(next);
  badColor.products[0].customColors = [{ name: 'أحمر', hex: 'red;background:url(x)' }];
  const bc = await owner.call('POST', 'catalog/save', { body: { catalog: badColor } });
  check('رفض درجة لون غير صالحة', bc.status === 400, bc.data);
  const b = r.data?.catalog?.settings?.branding;
  check('حفظ الهوية', b?.logoTint === true && b.showWordmark === false && b.bodyFont?.preset === 'cairo' && b.headingFont?.regular?.startsWith('/uploads/fonts/'), b);

  const badFont = structuredClone(next);
  badFont.settings.branding.headingFont.regular = "/uploads/fonts/x.woff2');}body{display:none";
  const bf = await owner.call('POST', 'catalog/save', { body: { catalog: badFont } });
  check('رفض رابط خط غير آمن', bf.status === 400, bf.data);
  const badPreset = structuredClone(next);
  badPreset.settings.branding.bodyFont = { preset: 'comic' };
  const bp = await owner.call('POST', 'catalog/save', { body: { catalog: badPreset } });
  check('رفض خط غير معروف', bp.status === 400, bp.data);
}

// الرفع: النوع من التوقيع، والحدود، والصلاحية
let uploadedImage;
{
  const img = await owner.call('POST', 'upload', { form: fileForm(PNG, 'a.png') });
  uploadedImage = img.data?.url;
  check('رفع صورة PNG', img.status === 200 && /^\/uploads\/\d{4}\/\d{2}\/[a-f0-9]{20}\.png$/.test(uploadedImage ?? ''), img.data);
  const fakeJpg = await owner.call('POST', 'upload', { form: fileForm(new TextEncoder().encode('<?php echo 1; ?>'), 'x.jpg') });
  check('رفض ملف ليس صورة', fakeJpg.status === 400, fakeJpg.data);
  const font = await owner.call('POST', 'upload', { form: fileForm(WOFF2, 'f.woff2'), query: { kind: 'font' } });
  check('رفع خط WOFF2', font.status === 200 && /^\/uploads\/fonts\/[a-f0-9]{20}\.woff2$/.test(font.data?.url ?? ''), font.data);
  const pngAsFont = await owner.call('POST', 'upload', { form: fileForm(PNG), query: { kind: 'font' } });
  check('رفض صورة كخط', pngAsFont.status === 400, pngAsFont.data);
  const video = await owner.call('POST', 'upload', { form: fileForm(MP4, 'v.mp4'), query: { kind: 'video' } });
  check('رفع فيديو MP4', video.status === 200 && /\.mp4$/.test(video.data?.url ?? ''), video.data);
  if (!remote) {
    const tooBig = await owner.call('POST', 'upload', { form: fileForm(big(MP4, 1024 * 1024 + 10)), query: { kind: 'video' } });
    check('رفض فيديو أكبر من الحد', tooBig.status === 400, tooBig.data);
  }
  const logoByProd = await staff.prod1.call('POST', 'upload', { form: fileForm(PNG), query: { kind: 'logo' } });
  check('prod1 لا يرفع شعاراً', logoByProd.status === 403, logoByProd.data);
  const imgByProd = await staff.prod1.call('POST', 'upload', { form: fileForm(PNG) });
  check('prod1 يرفع صورة منتج', imgByProd.status === 200, imgByProd.data);

  const served = await anon.call('GET', '', { raw: uploadedImage, header: false });
  check('تقديم الملف المرفوع', served.status === 200, served.status);
  if (!remote) {
    const res = await handle(new Request(`http://test.local${video.data.url}`, { headers: { Range: 'bytes=0-7' } }));
    check('دعم Range للفيديو', res.status === 206 && res.headers.get('content-range') === `bytes 0-7/${MP4.byteLength}`, res.status);
  }
}

// تغيير كلمة المرور الذاتي وإيقاف الحساب وإعادة تعيين كلمة المرور
{
  const self = await staff.viewer.call('POST', 'auth/password', { body: { current: 'look-only-pass-1', next: 'look-only-pass-2' } });
  check('الموظف يغيّر كلمة مروره', self.status === 200, self.data);
  const still = await staff.viewer.call('GET', 'orders');
  check('الجلسة الحالية تبقى بعد تغيير كلمة المرور', still.status === 200, still.data);
  const oldPw = await new Client().login('viewer', 'look-only-pass-1');
  check('كلمة المرور القديمة لا تعمل', oldPw.status === 401, oldPw.data);

  const off = await owner.call('POST', 'users/save', { body: { user: { ...staffInput.orders1, id: ids.orders1, password: '', active: false } } });
  check('إيقاف موظف', off.status === 200 && off.data.users.find((u) => u.id === ids.orders1)?.active === false, off.data);
  const kicked = await staff.orders1.call('GET', 'orders');
  check('الموظف الموقوف يخرج فوراً', kicked.status === 401, kicked.data);
  const blocked = await new Client().login('orders1', 'orders-pass-1');
  check('الموظف الموقوف لا يدخل', blocked.status === 403, blocked.data);

  const reset = await owner.call('POST', 'users/save', { body: { user: { ...staffInput.prod1, id: ids.prod1, password: 'prod-pass-NEW' } } });
  check('المالك يعيّن كلمة مرور جديدة', reset.status === 200, reset.data);
  const prodKicked = await staff.prod1.call('GET', 'instagram/status');
  check('تعيين كلمة المرور ينهي جلسات الموظف', prodKicked.status === 401, prodKicked.data);
  const relog = await staff.prod1.login('prod1', 'prod-pass-NEW');
  check('الدخول بكلمة المرور الجديدة', relog.status === 200, relog.data);

  const perm = await owner.call('POST', 'users/save', { body: { user: { ...staffInput.prod1, id: ids.prod1, password: '', permissions: { ...staffInput.prod1.permissions, orders: 'view' } } } });
  const now = await staff.prod1.call('GET', 'orders');
  check('تعديل الصلاحيات يسري فوراً', perm.status === 200 && now.status === 200, now.data);
}

// إنستغرام (داخل العملية فقط)
if (!remote) {
  const bad = await owner.call('POST', 'instagram/connect', { body: { token: 'short' } });
  check('رفض رمز قصير', bad.status === 400, bad.data);
  const expired = await owner.call('POST', 'instagram/connect', { body: { token: 'E'.repeat(60) } });
  check('رمز منتهٍ ← 409 (لا 401)', expired.status === 409, expired.data);
  const conn = await owner.call('POST', 'instagram/connect', { body: { token: GOOD_TOKEN } });
  check('ربط إنستغرام', conn.status === 200 && conn.data.connected && conn.data.username === 'iris_st0re1', conn.data);
  const pub = JSON.stringify((await anon.call('GET', 'catalog')).data);
  check('الرمز لا يظهر في الكتالوج العام', !pub.includes(GOOD_TOKEN));
  const st = await staff.prod1.call('GET', 'instagram/status');
  check('الحالة لا تكشف الرمز', st.status === 200 && !JSON.stringify(st.data).includes(GOOD_TOKEN), st.data);

  const media = await staff.prod1.call('GET', 'instagram/media');
  const posts = media.data?.posts ?? [];
  check('قائمة المنشورات', media.status === 200 && posts.length === 3 && posts[0].items.length === 2 && posts[1].items[0].type === 'VIDEO', media.data);

  const before = uploads.size;
  const one = await staff.prod1.call('POST', 'instagram/fetch', { body: { id: '17900000000000001', childIds: ['17900000000000012'] } });
  check('تنزيل صورة مختارة من ألبوم', one.status === 200 && one.data.media.length === 1 && one.data.media[0].kind === 'image', one.data);
  const vid = await staff.prod1.call('POST', 'instagram/fetch', { body: { id: '17900000000000002' } });
  check('تنزيل فيديو مع غلافه', vid.status === 200 && vid.data.media[0].kind === 'video' && vid.data.media[0].poster, vid.data);
  check('الملفات حُفظت في التخزين', uploads.size === before + 3, uploads.size - before);
  const evil = await staff.prod1.call('POST', 'instagram/fetch', { body: { id: '17900000000000003' } });
  check('رفض تنزيل من نطاق خارجي', evil.status === 502, evil.data);
  const badId = await staff.prod1.call('POST', 'instagram/fetch', { body: { id: '../../me' } });
  check('رفض رقم منشور غير صالح', badId.status === 400, badId.data);
}

// إعادة الضبط
{
  const phrase = await owner.call('POST', 'system/reset', { body: { password: OWNER_PASS, confirm: 'اعادة ضبط' } });
  check('رفض عبارة خاطئة', phrase.status === 400, phrase.data);
  const pw = await owner.call('POST', 'system/reset', { body: { password: 'nope-nope', confirm: 'إعادة ضبط المتجر' } });
  check('رفض كلمة مرور خاطئة (403 لا 401)', pw.status === 403, pw.data);
  const stillIn = await owner.call('GET', 'auth/me');
  check('المالك باقٍ بعد محاولة خاطئة', stillIn.data?.admin?.id === 'owner', stillIn.data);

  const empty = await owner.call('POST', 'system/reset', { body: { password: OWNER_PASS, confirm: 'إعادة ضبط المتجر', mode: 'empty' } });
  const cat = empty.data?.catalog;
  check('متجر فارغ', empty.status === 200 && cat?.categories?.length === 0 && cat.products.length === 0 && Object.keys(cat.settings.coupons ?? {}).length === 0, empty.data);
  const ord = await owner.call('GET', 'orders');
  check('حُذفت الطلبات', ord.data?.orders?.length === 0, ord.data);
  const team = await owner.call('GET', 'users');
  check('حُذف فريق العمل', team.data?.users?.length === 0, team.data);
  const staffAfter = await staff.prod1.call('GET', 'orders');
  check('جلسات الموظفين انتهت', staffAfter.status === 401, staffAfter.data);
  const file = await anon.call('GET', '', { raw: uploadedImage, header: false });
  // خادم PHP المدمج (php -S) يعيد uploads/index.html بدل 404؛ المهم ألا تُقدَّم الصورة
  const gone = file.status === 404 || !String(file.res.headers.get('content-type')).startsWith('image/');
  check('حُذفت الملفات المرفوعة', gone, `${file.status} ${file.res.headers.get('content-type')}`);
  if (!remote) {
    check('لم يبقَ إلا النسخة الاحتياطية', uploads.size === 0, uploads.size);
    const ig = await owner.call('GET', 'instagram/status');
    check('أُلغي ربط إنستغرام', ig.data?.connected === false, ig.data);
  }
  const ownerStill = await owner.call('GET', 'auth/me');
  check('حساب المالك باقٍ', ownerStill.data?.admin?.id === 'owner', ownerStill.data);
  const emptyOrder = await anon.call('POST', 'orders', {
    body: { customer: { name: 'زبون', phone: '07701234567' }, delivery: { governorate: 'بغداد', district: 'x', landmark: 'y' }, lines: [{ productId: product.id, qty: 1 }] },
  });
  check('المتجر الفارغ يرفض الطلبات', emptyOrder.status === 409, emptyOrder.data);

  const starter = await owner.call('POST', 'system/reset', { body: { password: OWNER_PASS, confirm: 'إعادة ضبط المتجر', mode: 'starter' } });
  check('المحتوى الافتتاحي', starter.status === 200 && starter.data.catalog.products.length === seed.products.length, starter.data?.catalog?.products?.length);

  for (let i = 0; i < 5; i++) await owner.call('POST', 'system/reset', { body: { password: 'wrong-' + i, confirm: 'إعادة ضبط المتجر' } });
  const limited = await owner.call('POST', 'system/reset', { body: { password: OWNER_PASS, confirm: 'إعادة ضبط المتجر' } });
  check('حد المحاولات لإعادة الضبط', limited.status === 429, limited.data);
}

// الأمان: الترويسات، تتبع الطلب، حدود الطلبات، سياسة كلمات المرور، جلسات المالك، كلمة المرور الافتراضية
{
  const h = await anon.call('GET', 'catalog');
  const hd = (n) => h.res.headers.get(n) ?? '';
  check(
    'ترويسات أمان الواجهة (DENY + CSP + nosniff)',
    hd('x-frame-options') === 'DENY' && hd('content-security-policy').includes("frame-ancestors 'none'") && hd('x-content-type-options') === 'nosniff',
    Object.fromEntries(h.res.headers),
  );

  // مخزون كافٍ لقطعة واحدة حتى تُختبر حدود الطلب لا حدود المخزون
  const cat = (await anon.call('GET', 'catalog')).data.catalog;
  cat.products.find((p) => p.id === product.id).stock = 100;
  const saved = await owner.call('POST', 'catalog/save', { body: { catalog: cat } });
  check('تجهيز مخزون للاختبار', saved.status === 200, saved.data);
  const evil = structuredClone(cat);
  evil.settings.heroImage = '/\\evil.example.com/x.png';
  const ev = await owner.call('POST', 'catalog/save', { body: { catalog: evil } });
  check('رفض رابط «/\\» الذي يفتحه المتصفح كموقع خارجي', ev.status === 400, ev.data);

  const place = (phone, extra = {}) =>
    anon.call('POST', 'orders', {
      body: {
        customer: { name: 'زبونة', phone },
        delivery: { governorate: 'بغداد', district: 'الكرادة', landmark: 'قرب الجسر' },
        payment: 'cod',
        lines: [{ productId: product.id, qty: 1 }],
        ...extra,
      },
    });
  const o = await place('07801112233');
  check('طلب للتتبع', o.status === 200, o.data);
  const tr = await anon.call('POST', 'orders/track', { body: { id: o.data?.order?.id, phone: '07801112233' } });
  check('تتبع الطلب عبر POST', tr.status === 200 && tr.data.order.id === o.data.order.id, tr.data);
  const trGet = await anon.call('GET', 'orders/track', { query: { id: String(o.data?.order?.id), phone: '07801112233' } });
  check('التتبع عبر GET (الهاتف في الرابط) لم يعد متاحاً', trGet.status === 404, trGet.data);
  const trWrong = await anon.call('POST', 'orders/track', { body: { id: o.data?.order?.id, phone: '07801112234' } });
  check('تتبع برقم هاتف آخر ← 404', trWrong.status === 404, trWrong.data);

  const badPay = await place('07801112240', { payment: 'bitcoin' });
  check('رفض طريقة دفع مجهولة', badPay.status === 400, badPay.data);
  const longNote = await place('07801112241', { delivery: { governorate: 'بغداد', district: 'x', landmark: 'y', notes: 'x'.repeat(600) } });
  check('رفض ملاحظة أطول من 500 حرف', longNote.status === 400, longNote.data);
  const junk = await place('07801112242', { delivery: { governorate: 'بغداد', district: 'x', landmark: 'y', evil: { deep: 'x'.repeat(1000) } } });
  check('الحقول المجهولة في العنوان لا تُخزَّن', junk.status === 200 && !('evil' in (junk.data?.order?.delivery ?? { evil: 1 })), junk.data?.order?.delivery);
  const pieces = await place('07801112243', { lines: Array.from({ length: 6 }, () => ({ productId: product.id, qty: 10 })) });
  check('رفض أكثر من 50 قطعة في الطلب الواحد', pieces.status === 400, pieces.data);

  const capPhone = '07809990000';
  const firstThree = [await place(capPhone), await place(capPhone), await place(capPhone)];
  check('ثلاثة طلبات جديدة لنفس الهاتف مقبولة', firstThree.every((r) => r.status === 200), firstThree.map((r) => r.status));
  const fourth = await place(capPhone);
  check('الطلب الرابع لنفس الهاتف قبل تجهيز السابقة ← 429', fourth.status === 429, fourth.data);
  let limited = null;
  for (let i = 0; i < 3 && !limited; i++) {
    const r = await place(`0780888000${i}`);
    if (r.status === 429) limited = r;
  }
  check('حد الطلبات من الجهاز نفسه (12 في الساعة)', Boolean(limited), limited?.data);

  // سياسة كلمات المرور (نفس القواعد في TS وPHP)
  const weak = [
    ['شائعة', 'password123'],
    ['أرقام متتالية', '12345678'],
    ['حرف مكرر', 'aaaaaaaaaa'],
    ['تحتوي اسم الدخول', 'lockme-2026!'],
  ];
  for (const [name, password] of weak) {
    const r = await owner.call('POST', 'users/save', { body: { user: { username: 'lockme', name: 'حساب اختبار', password, permissions: {} } } });
    check(`رفض كلمة مرور ضعيفة: ${name}`, r.status === 400, r.data);
  }
  const lockPass = 'Garnet-Sky-71';
  const created = await owner.call('POST', 'users/save', { body: { user: { username: 'lockme', name: 'حساب اختبار', password: lockPass, permissions: {} } } });
  check('كلمة مرور قوية مقبولة', created.status === 200, created.data);
  const ownWeak = await owner.call('POST', 'auth/password', { body: { current: OWNER_PASS, next: 'qwerty123' } });
  check('رفض كلمة مرور شائعة عند تغيير كلمة المرور', ownWeak.status === 400, ownWeak.data);

  // تغيير كلمة مرور المالك ينهي جلساته الأخرى ويُبقي الجلسة الحالية
  const owner2 = new Client();
  check('دخول ثانٍ للمالك', (await owner2.login(OWNER_USER, OWNER_PASS)).status === 200);
  const NEW_PASS = 'Garnet-Sky-2026!';
  const changed = await owner.call('POST', 'auth/password', { body: { current: OWNER_PASS, next: NEW_PASS } });
  check('تغيير كلمة مرور المالك', changed.status === 200, changed.data);
  check('الجلسة الأخرى للمالك انتهت', (await owner2.call('GET', 'auth/me')).data?.admin === null);
  check('الجلسة الحالية للمالك باقية', (await owner.call('GET', 'auth/me')).data?.admin?.id === 'owner');
  check('كلمة المرور القديمة لم تعد تعمل', (await new Client().login(OWNER_USER, OWNER_PASS)).status === 401);
  check('كلمة المرور الجديدة تعمل', (await new Client().login(OWNER_USER, NEW_PASS)).status === 200);

  if (!remote) {
    // تخمين موزّع: 20 محاولة خاطئة من 20 جهازاً مختلفاً توقف الحساب، حتى بكلمة المرور الصحيحة من جهاز جديد
    for (let i = 0; i < 20; i++) {
      const c = new Client();
      c.ip = `198.51.100.${i + 1}`;
      await c.login('lockme', 'wrong-guess-' + i);
    }
    const fresh = new Client();
    fresh.ip = '203.0.113.9';
    const locked = await fresh.login('lockme', lockPass);
    check('حد المحاولات لكل حساب من أجهزة كثيرة ← 429', locked.status === 429, locked.data);

    const up = await owner.call('POST', 'upload', { form: fileForm(PNG, 'a.png') });
    const served = await anon.call('GET', '', { raw: up.data?.url });
    check('الملفات المرفوعة تُقدَّم بـ CSP sandbox', (served.res.headers.get('content-security-policy') ?? '').includes('sandbox'), Object.fromEntries(served.res.headers));

    // نسخة بلا كلمة مرور مضبوطة (Netlify): الدخول الافتراضي لا يفتح شيئاً قبل تغييرها
    const demo = new Client();
    demo.handler = createHandler(memoryKv().kv, { server: 'test' }, { fetch: fakeGraph });
    const dl = await demo.login('owner', 'demo1234');
    check('الدخول الافتراضي يطلب تغيير كلمة المرور', dl.status === 200 && dl.data.admin.mustChangePassword === true, dl.data);
    check('لا طلبات قبل تغيير كلمة المرور الافتراضية', (await demo.call('GET', 'orders')).status === 403);
    check('لا حفظ للكتالوج قبل تغييرها', (await demo.call('POST', 'catalog/save', { body: { catalog: seed } })).status === 403);
    const set = await demo.call('POST', 'auth/password', { body: { current: 'demo1234', next: NEW_PASS } });
    check('تغيير كلمة المرور الافتراضية', set.status === 200, set.data);
    const after = await demo.call('GET', 'auth/me');
    check('بعد التغيير تُفتح اللوحة', !after.data?.admin?.mustChangePassword && (await demo.call('GET', 'orders')).status === 200, after.data);
  }
}

console.log(`\n${passed} passed, ${failures.length} failed${remote ? ` (${BASE})` : ' (in-process)'}`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
