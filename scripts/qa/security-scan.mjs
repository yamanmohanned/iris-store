#!/usr/bin/env node
/**
 * فحص أمني لمتجر آيريس على خادم حقيقي (الاستضافة أو حزمة محلية).
 *
 *   node scripts/qa/security-scan.mjs <baseUrl>                        فحص سلبي: قراءة فقط، آمن على الموقع الحي
 *   node scripts/qa/security-scan.mjs <baseUrl> --owner owner:كلمة-المرور   + فحوص نشطة (تُنشئ بيانات اختبار وتنظّفها)
 *
 * السلبي: تعرّض الملفات الحساسة، ترويسات الأمان وCSP، CORS وCSRF، تسرّب الأخطاء، شهادة TLS وتحويل HTTPS،
 *         أسرار في ملفات JavaScript، مسارات الصفحات العدائية (حقن ترويسات، انعكاس).
 * النشط:  الكوكي (HttpOnly/SameSite/Secure) وتسجيل الخروج، تعداد المستخدمين، حقن XSS مخزَّن في المنتج والقسم والطلب
 *         (يُفحص في HTML الخام والبيانات المنظمة وعرض المتجر والإدارة في المتصفح)، رفع ملفات خبيثة.
 *         لا تشغّله على موقع حي فيه طلبات حقيقية دون الحاجة: ينشئ طلباً تجريبياً ويلغيه، ويعيد الكتالوج كما كان.
 *
 * يخرج بقيمة 1 عند أي فشل. التصنيف: [عالٍ] يوقف الإطلاق، [متوسط] يُصلح قبل الإطلاق، [منخفض] يُوثَّق.
 */
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(/\/+$/, '');
const ownerArg = args.includes('--owner') ? args[args.indexOf('--owner') + 1] : '';
if (!base) {
  console.error('usage: node scripts/qa/security-scan.mjs <baseUrl> [--owner user:password]');
  process.exit(2);
}
const [ownerUser, ...pw] = ownerArg ? ownerArg.split(':') : [];
const ownerPass = pw.join(':');
const isHttps = base.startsWith('https://');

let pass = 0;
let fail = 0;
const failures = [];
const check = (cond, label, severity = 'متوسط', extra = '') => {
  if (cond) pass++;
  else {
    fail++;
    failures.push(`[${severity}] ${label}`);
  }
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${cond ? '' : `[${severity}] `}${label}${!cond && extra ? `\n        ${String(extra).slice(0, 300)}` : ''}`);
};
const section = (t) => console.log(`\n== ${t}`);

/** طلب خام يسمح بتغيير Host وقراءة كل الترويسات. */
function raw(method, path, { headers = {}, body = null, host = null } = {}) {
  const u = new URL(base);
  const lib = u.protocol === 'https:' ? https : http;
  return new Promise((resolve, reject) => {
    const r = lib.request(
      { host: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path, method, headers: { ...(host ? { Host: host } : {}), ...headers }, rejectUnauthorized: true },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, setCookie: res.headers['set-cookie'] ?? [], text: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    r.on('error', reject);
    r.setTimeout(30000, () => r.destroy(new Error('timeout')));
    if (body) r.write(body);
    r.end();
  });
}
const get = (p, o) => raw('GET', p, o);
const isSpa = (t) => /<div id="root"/.test(t);

/* ───────────────────────── 1) ملفات حساسة ───────────────────────── */
section('ملفات حساسة لا تُقدَّم للمتصفح');
const SENSITIVE = [
  '/api/config.php', '/api/lib.php', '/api/inc/users.php', '/api/inc/seo.php', '/api/inc/media.php', '/api/inc/reset.php', '/api/inc/instagram.php',
  '/api/data/', '/api/data/catalog.php', '/api/data/orders.php', '/api/data/auth.php', '/api/data/users.php', '/api/data/ratelimit.php',
  '/api/data/instagram.php', '/api/data/.lock', '/api/data/backups/', '/api/data/sessions/', '/api/data/catalog.seed.json', '/api/seo-pages.json',
  '/api/.user.ini', '/api/.htaccess', '/.htaccess', '/.git/config', '/.git/HEAD', '/.env', '/.env.local', '/composer.json', '/package.json',
  '/DEPLOY.md', '/NETLIFY.md', '/server/api/config.php', '/src/main.tsx', '/uploads/.htaccess', '/uploads/x.php', '/uploads/x.html', '/uploads/x.svg',
  '/phpinfo.php', '/info.php', '/test.php', '/backup.zip', '/db.sql', '/error_log', '/api/error_log', '/api/index.php.bak', '/api/index.php~',
  '/api/index.php.save', '/vendor/mediapipe/NOTICE.md',
];
const LEAK = /admin_password|password_hash|"hash"\s*:|<\?php|IRISADMIN|BEGIN (RSA|PRIVATE)|access_token|\[core\]|DB_PASSWORD|AKIA[0-9A-Z]{16}/;
const exposed = [];
for (const p of SENSITIVE) {
  const r = await get(p);
  const leaks = LEAK.test(r.text) || /Index of \//.test(r.text);
  const denied = [401, 403, 404, 405].includes(r.status);
  const harmless200 = r.status === 200 && (isSpa(r.text) || r.text.trim() === ''); // مسار غير موجود يفتح الصفحة الرئيسية، لا ملفاً
  if (leaks || !(denied || harmless200)) exposed.push(`${p} → ${r.status}`);
}
check(exposed.length === 0, `${SENSITIVE.length} مساراً حساساً (إعدادات، بيانات، نسخ احتياطية، git، env) محجوبة`, 'عالٍ', exposed.join(' | '));
for (const p of ['/uploads/', '/assets/', '/api/data/', '/images/']) {
  const r = await get(p);
  check(!/Index of \//.test(r.text), `لا عرض لمحتوى المجلد ${p}`, 'متوسط');
}

/* ───────────────────────── 2) ترويسات الأمان ───────────────────────── */
section('ترويسات الأمان وسياسة CSP');
for (const p of ['/', '/products/anything', '/admin/login']) {
  const r = await get(p);
  const h = r.headers;
  const csp = String(h['content-security-policy'] ?? '');
  const scriptSrc = (/script-src([^;]*)/.exec(csp) ?? [])[1] ?? '';
  check(!!csp && /default-src 'self'/.test(csp), `${p}: CSP موجودة وdefault-src 'self'`, 'عالٍ', csp);
  check(!/'unsafe-inline'|'unsafe-eval'|\*|http:/.test(scriptSrc), `${p}: script-src بلا unsafe-inline/unsafe-eval/*`, 'عالٍ', scriptSrc);
  check(/frame-ancestors 'none'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp), `${p}: frame-ancestors/object-src/base-uri مقيّدة`, 'متوسط');
  check(String(h['x-frame-options'] ?? '').toUpperCase() === 'DENY', `${p}: X-Frame-Options DENY`, 'متوسط');
  check(h['x-content-type-options'] === 'nosniff', `${p}: nosniff`, 'متوسط');
  check(!!h['referrer-policy'], `${p}: Referrer-Policy`, 'منخفض');
  check(!!h['permissions-policy'], `${p}: Permissions-Policy`, 'منخفض');
  check(!h['x-powered-by'] && !/php\/\d/i.test(String(h.server ?? '')), `${p}: لا تسرّب لإصدار PHP`, 'منخفض', `${h['x-powered-by'] ?? ''} ${h.server ?? ''}`);
  if (isHttps) check(/max-age=(\d+)/.test(String(h['strict-transport-security'] ?? '')) && Number(/max-age=(\d+)/.exec(h['strict-transport-security'])[1]) >= 15552000, `${p}: HSTS لستة أشهر على الأقل`, 'متوسط');
}

/* ───────────────────────── 3) الواجهة البرمجية ───────────────────────── */
section('الواجهة البرمجية: CORS وCSRF وتسرّب الأخطاء');
{
  const evil = 'https://evil.example';
  const cors = await get('/api/index.php?r=catalog', { headers: { Origin: evil } });
  check(!cors.headers['access-control-allow-origin'], 'لا ترويسة CORS لنطاق غريب', 'عالٍ', cors.headers['access-control-allow-origin']);
  const pre = await raw('OPTIONS', '/api/index.php?r=auth/login', { headers: { Origin: evil, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-requested-with' } });
  check(!pre.headers['access-control-allow-origin'], 'طلب preflight من نطاق غريب بلا إذن', 'عالٍ');
  const login = (headers) => raw('POST', '/api/index.php?r=auth/login', { headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify({ username: 'nobody', password: 'x'.repeat(12) }) });
  const noHeader = await login({});
  check(noHeader.status === 403, 'POST بلا X-Requested-With مرفوض (CSRF)', 'عالٍ', noHeader.status);
  const crossOrigin = await login({ 'X-Requested-With': 'iris', Origin: evil });
  check(crossOrigin.status === 403, 'POST بترويسة صحيحة من Origin غريب مرفوض', 'عالٍ', crossOrigin.status);
  const unknown = await get('/api/index.php?r=does/not/exist');
  check(unknown.status === 404 && !/\/[A-Za-z]:|\.php on line|Stack trace|Warning:|Notice:|Fatal/.test(unknown.text), 'مسار مجهول: 404 بلا مسارات خادم أو تتبع أخطاء', 'متوسط', unknown.text);
  const badJson = await raw('POST', '/api/index.php?r=orders', { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'iris' }, body: '{"customer":' });
  check(badJson.status === 400 && !/Stack trace|\.php on line|Warning:|Fatal/.test(badJson.text), 'JSON تالف: 400 نظيفة', 'متوسط', badJson.text);
  for (const m of ['PUT', 'DELETE', 'PATCH', 'TRACE']) {
    const r = await raw(m, '/api/index.php?r=catalog', { headers: { 'X-Requested-With': 'iris' } });
    check([404, 405, 501, 403].includes(r.status), `الطريقة ${m} غير مقبولة على الكتالوج (${r.status})`, 'منخفض');
  }
  check(/no-store/.test(String(unknown.headers['cache-control'] ?? '')), 'استجابات الواجهة لا تُخزَّن مؤقتاً', 'منخفض');
  const anon = await get('/api/index.php?r=catalog');
  check(anon.setCookie.length === 0, 'زائر بلا دخول لا يستلم أي كوكي', 'منخفض', anon.setCookie.join(';'));
  check(/noindex/.test(String(anon.headers['x-robots-tag'] ?? '')), 'استجابات الواجهة لا تُفهرس', 'منخفض');
  for (const r of ['orders', 'users', 'instagram/status', 'instagram/media']) {
    const bare = await get(`/api/index.php?r=${r}`);
    check(![200, 201].includes(bare.status) && !/"orders"|"users"/.test(bare.text), `${r} بلا دخول ولا ترويسة: لا بيانات (${bare.status})`, 'عالٍ');
    const x = await get(`/api/index.php?r=${r}`, { headers: { 'X-Requested-With': 'iris' } });
    check(x.status === 401, `${r} بلا دخول ← 401`, 'عالٍ', x.status);
  }
  // كلمات مرور افتراضية معروفة يجب ألا تفتح شيئاً (حد المحاولات يحمي من التخمين: ثلاث محاولات فقط هنا)
  for (const [user, pass] of [['owner', 'demo1234'], ['owner', 'CHANGE-ME'], ['admin', 'admin']]) {
    const r = await raw('POST', '/api/index.php?r=auth/login', { headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'iris' }, body: JSON.stringify({ username: user, password: pass }) });
    check(r.status !== 200 && !r.setCookie.some((c) => c.startsWith('IRISADMIN=') && !/IRISADMIN=;|deleted/.test(c)), `الدخول بـ ${user}/${pass} مرفوض (${r.status})`, 'عالٍ');
  }
}

/* ───────────────────────── 4) صفحات عدائية ───────────────────────── */
section('مسارات الصفحات العدائية (حقن، انعكاس، ترويسات)');
{
  const xssPath = '/products/%22%3E%3Cscript%3Ealert(1)%3C%2Fscript%3E';
  const r = await get(xssPath);
  check(!/<script>alert\(1\)/.test(r.text) && !/"><script>/.test(r.text), 'مسار منتج يحمل <script>: لا انعكاس خام في HTML', 'عالٍ');
  const crlf = await get('/products/x%0d%0aSet-Cookie:%20pwn=1');
  check(!crlf.setCookie.some((c) => /pwn=1/.test(c)) && !('pwn' in crlf.headers), 'حقن CRLF في المسار لا يضيف ترويسات', 'عالٍ');
  const post = await raw('POST', '/products/x', { headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check([403, 404, 405].includes(post.status), `POST على صفحة منتج لا يُقبل (${post.status})`, 'منخفض');
  const evilHost = await get('/', { host: 'evil.example' });
  const leaksHost = /evil\.example/.test(evilHost.headers.location ?? '');
  const bodyHasEvil = /<link rel="canonical" href="[^"]*evil\.example/.test(evilHost.text);
  check(!leaksHost && !bodyHasEvil, 'ترويسة Host مزوّرة لا تدخل canonical ولا Location', 'متوسط', `${evilHost.status} ${evilHost.headers.location ?? ''}`);
  const big = await get('/products/' + 'a'.repeat(6000));
  check(big.status < 500, 'مسار طويل جداً لا يسبب خطأ خادم', 'منخفض', big.status);
  const sm = await get('/sitemap.xml');
  check(sm.status === 200 && /^<\?xml/.test(sm.text) && !/<script/i.test(sm.text), 'sitemap.xml XML صحيح', 'منخفض');
}

/* ───────────────────────── 5) TLS ───────────────────────── */
section('TLS وتحويل HTTPS');
if (isHttps) {
  const u = new URL(base);
  const info = await new Promise((resolve) => {
    const s = tls.connect({ host: u.hostname, port: Number(u.port) || 443, servername: u.hostname }, () => {
      resolve({ cert: s.getPeerCertificate(), proto: s.getProtocol(), authorized: s.authorized });
      s.end();
    });
    s.on('error', (e) => resolve({ error: e.message }));
  });
  check(!info.error && info.authorized, 'شهادة صالحة موثوقة', 'عالٍ', info.error);
  if (!info.error) {
    const days = (new Date(info.cert.valid_to) - Date.now()) / 86400000;
    check(days > 14, `الشهادة تنتهي بعد ${Math.floor(days)} يوماً (يلزم أكثر من 14)`, 'متوسط');
    check(['TLSv1.2', 'TLSv1.3'].includes(info.proto), `بروتوكول ${info.proto}`, 'متوسط');
  }
  const plain = await new Promise((resolve) => {
    const r = http.request({ host: u.hostname, port: 80, path: '/', method: 'GET', timeout: 15000 }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location ?? '' });
    });
    r.on('error', () => resolve({ status: 0, location: '' }));
    r.on('timeout', () => r.destroy());
    r.end();
  });
  check([301, 308].includes(plain.status) && plain.location.startsWith('https://'), 'http:// يحوّل بشكل دائم إلى https://', 'متوسط', JSON.stringify(plain));
} else console.log('• العنوان ليس https: فحوص TLS تُتخطى (مطلوبة قبل الإطلاق)');

/* ───────────────────────── 6) أسرار في الواجهة ───────────────────────── */
section('أسرار في ملفات JavaScript المنشورة');
{
  const html = (await get('/')).text;
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  let all = '';
  for (const a of assets) all += (await get(a)).text;
  check(assets.length > 0, `عُثر على ${assets.length} ملف JavaScript للفحص`, 'منخفض');
  // «demo1234» موجودة عمداً في قائمة كلمات المرور الشائعة المرفوضة (permissions.ts)، والفحص الحقيقي أعلاه: الدخول بها مرفوض
  const secrets = /IRIS_ADMIN_PASSWORD|sk_live_|AKIA[0-9A-Z]{16}|EAA[A-Za-z0-9]{40,}|IGQ[A-Za-z0-9_-]{40,}|-----BEGIN/;
  check(!secrets.test(all), 'لا كلمات مرور افتراضية ولا مفاتيح في ملفات الواجهة', 'عالٍ', (secrets.exec(all) ?? [])[0]);
}

/* ───────────────────────── 7) فحوص نشطة ───────────────────────── */
if (!ownerUser) {
  console.log('\n• الفحوص النشطة (الكوكي، XSS المخزَّن، رفع الملفات) تحتاج: --owner المستخدم:كلمة-المرور');
} else {
  await active();
}

async function active() {
  section('نشط: الدخول والكوكي');
  const H = { 'Content-Type': 'application/json', 'X-Requested-With': 'iris' };
  const post = (path, data, cookie) => raw('POST', path, { headers: { ...H, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(data) });
  const getA = (path, cookie) => raw('GET', path, { headers: { 'X-Requested-With': 'iris', ...(cookie ? { Cookie: cookie } : {}) } });

  const unknownUser = await post('/api/index.php?r=auth/login', { username: 'no-such-user-xyz', password: 'Wrong-pass-123!' });
  const wrongPass = await post('/api/index.php?r=auth/login', { username: ownerUser, password: 'Wrong-pass-123!' });
  const msg = (r) => { try { return JSON.parse(r.text).error; } catch { return r.text; } };
  check(unknownUser.status === wrongPass.status && msg(unknownUser) === msg(wrongPass), 'لا فرق في الرد بين مستخدم غير موجود وكلمة مرور خاطئة (تعداد الحسابات)', 'متوسط', `${unknownUser.status}/${wrongPass.status}`);

  const login = await post('/api/index.php?r=auth/login', { username: ownerUser, password: ownerPass });
  check(login.status === 200, 'دخول المالك', 'عالٍ', login.text);
  const cookieHeader = login.setCookie.findLast((c) => c.startsWith('IRISADMIN='));
  check(!!cookieHeader, 'كوكي الجلسة IRISADMIN', 'عالٍ');
  const cookie = (cookieHeader ?? '').split(';')[0];
  check(/HttpOnly/i.test(cookieHeader ?? ''), 'الكوكي HttpOnly', 'عالٍ', cookieHeader);
  check(/SameSite=Strict/i.test(cookieHeader ?? ''), 'الكوكي SameSite=Strict', 'عالٍ', cookieHeader);
  if (isHttps) check(/;\s*Secure/i.test(cookieHeader ?? ''), 'الكوكي Secure على HTTPS', 'عالٍ', cookieHeader);
  const me = JSON.parse((await getA('/api/index.php?r=auth/me', cookie)).text);
  check(me.admin?.role === 'owner', 'الجلسة تعمل', 'عالٍ');
  const out = await post('/api/index.php?r=auth/logout', {}, cookie);
  const after = JSON.parse((await getA('/api/index.php?r=auth/me', cookie)).text);
  check(out.status === 200 && !after.admin, 'تسجيل الخروج يبطل الجلسة على الخادم (إعادة استخدام الكوكي القديم)', 'عالٍ');

  // جلسة جديدة للفحوص التالية
  const session = (await post('/api/index.php?r=auth/login', { username: ownerUser, password: ownerPass })).setCookie.findLast((c) => c.startsWith('IRISADMIN=')).split(';')[0];
  const original = JSON.parse((await getA('/api/index.php?r=catalog', session)).text).catalog;
  const MARK = 'xss-probe';
  const payloads = {
    name: `"><img src=x id=${MARK} onerror="window.__xss=1">`,
    summary: `</script><script>window.__xss=1</script><!--`,
    title: `<svg onload="window.__xss=1" id="${MARK}2">`,
    note: `<img src=x id="${MARK}3" onerror="window.__xss=1">&amp;'"`,
  };
  const slug = 'xss-probe-product';
  const catSlug = 'xss-probe-cat';
  const hostile = JSON.parse(JSON.stringify(original));
  hostile.categories.push({ slug: catSlug, name: payloads.title, title: payloads.title, description: payloads.summary, unit: 'قطعة', image: original.categories[0]?.image ?? '/brand/og-image.jpg', hidden: false });
  const model = original.products[0];
  hostile.products.push({ ...model, id: 'xss-probe-1', slug, sku: 'XSS-1', name: payloads.name, shortName: payloads.name, summary: payloads.summary, category: catSlug, hidden: false, stock: 5, price: 7000, content: { description: [payloads.summary], specs: [{ label: payloads.title, value: payloads.name }] } });
  const saved = await post('/api/index.php?r=catalog/save', { catalog: hostile }, session);
  check(saved.status === 200, 'حفظ منتج/قسم اختباري بنصوص خبيثة', 'عالٍ', saved.text.slice(0, 200));

  let orderId = null;
  try {
    section('نشط: حقن XSS مخزَّن في صفحات الخادم (SEO)');
    const page = await get(`/products/${slug}`);
    const t = page.text;
    check(!/<img src=x id=xss-probe/.test(t) && !/"><img/.test(t), 'اسم المنتج الخبيث لا يخرج من الوسوم (title وmeta وog)', 'عالٍ');
    const ldBlocks = [...t.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    check(ldBlocks.length >= 2 && ldBlocks.every((b) => !/<\/script|<script|<!--/i.test(b)), 'البيانات المنظمة لا تُغلق وسم script ولا تحقن وسوماً', 'عالٍ');
    check(ldBlocks.every((b) => { try { JSON.parse(b); return true; } catch { return false; } }), 'البيانات المنظمة JSON صالح رغم النص الخبيث', 'متوسط');
    const ns = /<noscript>([\s\S]*?)<\/noscript>/.exec(t)?.[1] ?? '';
    check(ns.includes('&lt;') && !/<img src=x|<svg|<script/i.test(ns.replace(/<img src="[^"]*" alt="[^"]*" width="320">/, '')), 'ملخص noscript مُهرَّب', 'عالٍ', ns.slice(0, 200));
    const catPage = await get(`/collections/${catSlug}`);
    check(!/<svg onload/.test(catPage.text) && !/<\/script><script>/.test(catPage.text), 'صفحة القسم الخبيث مُهرَّبة', 'عالٍ');
    const sitemap = (await get('/sitemap.xml')).text;
    check(/^<\?xml/.test(sitemap) && !/<script|onerror|<img|<svg/i.test(sitemap), 'sitemap.xml لا ينعكس فيه نص خبيث', 'متوسط');

    section('نشط: حقن XSS مخزَّن في عرض المتجر والإدارة (متصفح)');
    const placed = await post('/api/index.php?r=orders', {
      customer: { name: payloads.name.slice(0, 70), phone: '07705550123' },
      delivery: { governorate: 'بغداد', district: payloads.title.slice(0, 70), landmark: payloads.note.slice(0, 190), notes: payloads.note },
      payment: 'cod',
      lines: [{ productId: 'xss-probe-1', qty: 1 }],
    });
    orderId = (() => { try { return JSON.parse(placed.text).order.id; } catch { return null; } })();
    check(placed.status === 200 && orderId, 'طلب اختباري بنصوص خبيثة', 'متوسط', placed.text.slice(0, 200));

    const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    const browser = await chromium.launch({ executablePath: chrome, headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar' });
    await ctx.addCookies([{ name: 'IRISADMIN', value: session.split('=')[1], url: base }]);
    const dialogs = [];
    const visit = async (path, label, shown = true) => {
      const p = await ctx.newPage();
      p.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });
      await p.goto(base + path, { waitUntil: 'networkidle' });
      await p.waitForTimeout(500);
      const res = await p.evaluate((m) => ({ flag: window.__xss === 1, probe: !!document.querySelector(`[id^="${m}"]`), shown: /onerror|onload/.test(document.body.innerText) }), MARK);
      check(!res.flag && !res.probe && dialogs.length === 0, `${label}: النص الخبيث لا يُنفَّذ`, 'عالٍ', JSON.stringify(res));
      // شاهد إيجابي: النص ظهر فعلاً على الصفحة حرفياً، فالفحص ليس فارغاً
      if (shown) check(res.shown, `${label}: النص الخبيث ظاهر حرفياً (الفحص فعّال)`, 'منخفض');
      await p.close();
    };
    await visit(`/products/${slug}`, 'صفحة المنتج');
    await visit(`/collections/${catSlug}`, 'صفحة القسم');
    await visit('/search?q=xss', 'البحث', false);
    await visit('/admin/products', 'إدارة المنتجات');
    await visit('/admin/categories', 'إدارة الأقسام');
    await visit('/admin/orders', 'إدارة الطلبات');
    if (orderId) await visit(`/admin/orders/${orderId}`, 'تفاصيل الطلب');
    await ctx.close();
    await browser.close();

    section('نشط: رفع ملفات خبيثة');
    const upload = async (name, bytes, type, kind = 'image') => {
      const boundary = '----iris' + Math.random().toString(16).slice(2);
      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`),
        Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      return raw('POST', `/api/index.php?r=upload&kind=${kind}`, { headers: { 'X-Requested-With': 'iris', Cookie: session, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length }, body });
    };
    const url = (r) => { try { return JSON.parse(r.text).url ?? null; } catch { return null; } };
    const php = await upload('shell.php', '<?php echo 1; ?>', 'application/x-php');
    check(php.status >= 400 && !url(php), 'ملف PHP مرفوض', 'عالٍ', php.text);
    const polyglot = await upload('shell.php.jpg', Buffer.concat([Buffer.from('GIF89a'), Buffer.from('<?php system($_GET["c"]); ?>')]), 'image/jpeg');
    const pUrl = url(polyglot);
    if (pUrl) {
      check(/\.(gif|jpg|png|webp)$/.test(pUrl) && !/\.php/i.test(pUrl), `ملف GIF/PHP يُحفظ باسم عشوائي وامتداد آمن (${pUrl})`, 'عالٍ');
      const served = await get(pUrl);
      const ct = String(served.headers['content-type'] ?? '');
      check(!/html|php/i.test(ct) && /sandbox/.test(String(served.headers['content-security-policy'] ?? '')) && /nosniff/.test(String(served.headers['x-content-type-options'] ?? '')), 'الملف المرفوع يُقدَّم كصورة بـ nosniff وCSP sandbox (لا يُنفَّذ)', 'عالٍ', JSON.stringify(served.headers));
      const exec = await get(pUrl + '?c=id');
      check(!/uid=\d+/.test(exec.text), 'لا تنفيذ أوامر عبر الملف المرفوع', 'عالٍ');
    } else check(true, 'ملف GIF/PHP مرفوض', 'عالٍ');
    const svg = await upload('x.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>', 'image/svg+xml');
    check(svg.status >= 400 && !url(svg), 'SVG (يحمل سكربت) مرفوض', 'عالٍ', svg.text);
    const html = await upload('x.png', '<html><script>alert(1)</script></html>', 'image/png');
    check(html.status >= 400 && !url(html), 'HTML بامتداد png مرفوض (الفحص بالمحتوى لا بالاسم)', 'عالٍ', html.text);
    const noAuth = await raw('POST', '/api/index.php?r=upload&kind=image', { headers: { 'X-Requested-With': 'iris' } });
    check(noAuth.status === 401, 'الرفع بلا دخول ← 401', 'عالٍ', noAuth.status);
  } finally {
    section('تنظيف');
    if (orderId) await post('/api/index.php?r=orders/status', { id: orderId, status: 'cancelled' }, session);
    const restored = await post('/api/index.php?r=catalog/save', { catalog: original }, session);
    const now = JSON.parse((await getA('/api/index.php?r=catalog', session)).text).catalog;
    check(restored.status === 200 && !now.products.some((p) => p.slug === slug) && !now.categories.some((c) => c.slug === catSlug), 'أُعيد الكتالوج كما كان وأُلغي الطلب الاختباري', 'منخفض');
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nالإخفاقات:');
  for (const f of failures) console.log('  ' + f);
}
process.exit(fail ? 1 : 0);
