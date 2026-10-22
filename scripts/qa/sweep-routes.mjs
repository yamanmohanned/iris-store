#!/usr/bin/env node
/**
 * يزور كل مسارات المتجر (من routes.manifest.mjs) على خادم حقيقي ويفشل عند أي خطأ:
 * أخطاء وحدة التحكم (ومنها انتهاكات CSP)، استثناءات الصفحة، طلبات فاشلة أو بحالة 4xx/5xx غير متوقعة، صفحة فارغة.
 *
 * Usage: node scripts/qa/sweep-routes.mjs <baseUrl> [ownerPassword]
 *   بلا كلمة مرور تُفحص المسارات العامة فقط؛ معها تُفحص صفحات الإدارة الحقيقية أيضاً.
 *   لفحص ترويسات CSP الحقيقية شغّل ضد الاستضافة (أو خادماً يرسل ترويسات .htaccess)، لا ضد «npm run dev».
 *   شاشات التصميم الوهمية (src/routes.mockups.tsx) لا تدخل البناء المنشور: يجب أن تعرض صفحة «غير موجودة».
 */
import { chromium } from 'playwright-core';
import { entries } from './routes.manifest.mjs';

const [base, password] = process.argv.slice(2);
if (!base) {
  console.error('usage: node scripts/qa/sweep-routes.mjs <baseUrl> [ownerPassword]');
  process.exit(2);
}
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });

const desktop = { width: 1280, height: 900 };
const phone = { width: 390, height: 844 };

// شاشات التصميم الوهمية: موجودة في المانيفست للمقارنة مع التصميم في التطوير، وغائبة عن البناء المنشور
const MOCKUPS = new Set(['/welcome', '/notifications', '/chat', '/offline', '/system-updates', '/returns/new', '/maintenance', '/admin/stock-count']);
// رقم طلب غير موجود على الخادم الحقيقي يعرض «غير موجودة» (في التصميم كان رقماً وهمياً)
const UNKNOWN_RECORDS = new Set(['/order-success/1054', '/404']);
const isMockup = (route) => MOCKUPS.has(route) || UNKNOWN_RECORDS.has(route) || (route.startsWith('/admin/') && !REAL_ADMIN.includes(route) && route !== '/admin/login');
// صفحات الإدارة الحقيقية (الباقي في المانيفست شاشات وهمية)
const REAL_ADMIN = ['/admin', '/admin/orders', '/admin/products', '/admin/products/new', '/admin/categories', '/admin/instagram', '/admin/staff', '/admin/settings', '/admin/settings/store', '/admin/settings/branding', '/admin/settings/account', '/admin/settings/instagram', '/admin/settings/reset'];

// المسارات المطلوبة بدون تكرار: (المسار، هاتف؟، إدارة؟، متوقع 404؟)
const seen = new Set();
const targets = [];
const add = (route, mobile, admin, gone) => {
  const key = `${route}|${mobile}|${admin}`;
  if (seen.has(key)) return;
  seen.add(key);
  targets.push({ route, mobile, admin, gone });
};
for (const e of entries) {
  const mock = isMockup(e.route);
  if (mock && e.route.startsWith('/admin')) add(e.route, false, true, true);
  else if (mock) add(e.route, !!e.mobile, false, true);
  else add(e.route, !!e.mobile, e.route.startsWith('/admin') && e.route !== '/admin/login', false);
}
for (const r of REAL_ADMIN) add(r, false, true, false);
// صفحات ليست في المانيفست: يجب أن تفتح نظيفة أيضاً
for (const route of ['/policies/shipping', '/search?q=قلادة', '/wishlist']) {
  add(route, false, false, false);
  add(route, true, false, false);
}
add('/this-page-does-not-exist', false, false, true);
add('/this-page-does-not-exist', true, false, true);

// ما يُتوقع من الخادم عند الزائر غير المسجّل (لا يُعدّ خطأ)
const EXPECTED = (url, status) => /[?&]r=(auth\/me|session)/.test(url) && status === 401;

let failures = 0;
const sweepContext = async (label, viewport, list, login) => {
  if (!list.length) return;
  const ctx = await browser.newContext({ viewport, locale: 'ar', colorScheme: 'light' });
  if (login) {
    const p = await ctx.newPage();
    await p.goto(base + '/admin/login', { waitUntil: 'networkidle' });
    await p.fill('#username', 'owner');
    await p.fill('#password', password);
    await p.click('button[type=submit]');
    await p.waitForURL(base + '/admin', { timeout: 20000 });
    await p.close();
  }
  for (const t of list) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 160)));
    page.on('console', (m) => m.type() === 'error' && problems.push('console: ' + m.text().slice(0, 200)));
    page.on('requestfailed', (r) => !/net::ERR_ABORTED/.test(r.failure()?.errorText ?? '') && problems.push('requestfailed: ' + r.url().slice(0, 120)));
    page.on('response', (r) => {
      if (r.status() >= 400 && new URL(r.url()).origin === new URL(base).origin && !EXPECTED(r.url(), r.status()) && !(t.gone && r.status() === 404 && r.request().resourceType() === 'document'))
        problems.push(`http ${r.status()}: ${r.url().slice(0, 120)}`);
    });
    try {
      await page.goto(base + t.route, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label="جارٍ التحميل"]'), null, { timeout: 20000 }).catch(() => problems.push('stuck on loading spinner'));
      const text = (await page.evaluate(() => document.body.innerText)).trim();
      if (text.length < 20) problems.push('page is blank');
      else if (t.gone && !text.includes('غير موجودة')) problems.push('expected the «page not found» screen');
      else if (!t.gone && text.includes('الصفحة غير موجودة')) problems.push('unexpected «page not found» screen');
    } catch (e) {
      problems.push('navigation: ' + String(e.message).split('\n')[0]);
    }
    const bad = problems.length > 0;
    if (bad) failures++;
    console.log(`${bad ? '✗' : '✓'} ${label.padEnd(8)} ${t.route}`);
    for (const p of [...new Set(problems)]) console.log('     ' + p);
    await page.close();
  }
  await ctx.close();
};

await sweepContext('desktop', desktop, targets.filter((t) => !t.mobile && !t.admin));
await sweepContext('mobile', phone, targets.filter((t) => t.mobile && !t.admin));
if (password) await sweepContext('admin', desktop, targets.filter((t) => t.admin), true);
else console.log('• صفحات الإدارة لم تُفحص (لا توجد كلمة مرور)');

await browser.close();
console.log(failures ? `\n${failures} route(s) with problems` : '\nall routes clean');
process.exit(failures ? 1 : 0);
