#!/usr/bin/env node
/**
 * مسار المالك والزبون كاملاً على خادم حقيقي (dev أو استضافة PHP):
 *   المالك يدخل ← يضيف قسماً بصورة ← يضيف منتجاً فيه ← الزبون (هاتف) يرى القسم ومنتجه ويطلب
 *   ← الطلب يصل للوحة الإدارة بسعر محسوب على الخادم ← المالك يؤكده ← الزبون يتتبعه ← تنظيف.
 *
 * Usage: node scripts/qa/flow-owner-store.mjs <baseUrl> [ownerPassword]
 *   npm run dev  →  node scripts/qa/flow-owner-store.mjs http://127.0.0.1:5173
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [base, password = 'owner12345'] = process.argv.slice(2);
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });

let pass = 0;
let fail = 0;
const check = (cond, label) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
};
const errorsOf = (page, bag) => {
  page.on('pageerror', (e) => bag.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && bag.push('console: ' + m.text()));
};

const CAT = `محابس ${Date.now() % 10000}`;
const PRODUCT = `محبس ذهب عيار 21 رقم ${Date.now() % 1000}`;
const IMG = path.join(projectDir, 'public/images/ring-gemstone-velvet.jpg');

/* ───────── المالك: الدخول، قسم جديد، منتج جديد ───────── */
const owner = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar' });
const op = await owner.newPage();
const ownerErrors = [];
errorsOf(op, ownerErrors);

await op.goto(base + '/admin', { waitUntil: 'networkidle' });
check(new URL(op.url()).pathname === '/admin/login', 'admin is protected → redirected to login');
await op.fill('#username', 'owner');
await op.fill('#password', 'wrong-password');
await op.click('button[type=submit]');
await op.waitForSelector('[role=alert]');
check((await op.textContent('[role=alert]')).includes('غير صحيحة'), 'wrong password rejected with Arabic message');
await op.fill('#password', password);
await op.click('button[type=submit]');
await op.waitForURL(base + '/admin');
check(true, 'owner logged in');

await op.goto(base + '/admin/categories', { waitUntil: 'networkidle' });
await op.getByRole('button', { name: 'إضافة قسم' }).first().click();
await op.getByRole('dialog').locator('input').first().fill(CAT);
await op.getByRole('dialog').locator('input[type=file]').setInputFiles(IMG);
await op.waitForFunction(() => document.querySelector('[role=dialog] img')?.getAttribute('src')?.startsWith('/uploads/'), null, {
  timeout: 15000,
});
check(true, 'category image uploaded to /uploads/');
await op.getByRole('button', { name: 'حفظ القسم' }).click();
await op.waitForSelector(`text=${CAT}`);
await op.waitForFunction(() => !document.querySelector('[role=dialog]'));
check(true, `category «${CAT}» added`);

const catalog1 = await (await op.request.get(base + '/api/index.php?r=catalog')).json();
const cat = catalog1.catalog.categories.find((c) => c.name === CAT);
check(!!cat && cat.image.startsWith('/uploads/'), 'category persisted on the server with image');

await op.goto(base + `/admin/products/new?category=${encodeURIComponent(cat.slug)}`, { waitUntil: 'networkidle' });
await op.getByRole('textbox', { name: /^اسم المنتج/ }).fill(PRODUCT);
await op.getByRole('textbox', { name: /^السعر \(د\.ع\)/ }).fill('150000');
await op.getByRole('textbox', { name: /^الكمية المتوفرة/ }).fill('3');
await op.getByRole('textbox', { name: /^وصف قصير/ }).fill('محبس ناعم مصوغ يدوياً');
await op.locator('input[type=file]').first().setInputFiles(IMG);
await op.waitForFunction(
  () => [...document.querySelectorAll('main img')].some((i) => i.getAttribute('src')?.startsWith('/uploads/')),
  null,
  { timeout: 15000 },
);
await op.getByRole('button', { name: 'حفظ المنتج' }).click();
await op.waitForURL(base + '/admin/products');
await op.waitForSelector(`text=${PRODUCT}`);
check(true, `product «${PRODUCT}» added to the new category`);

const catalog2 = await (await op.request.get(base + '/api/index.php?r=catalog')).json();
const prod = catalog2.catalog.products.find((p) => p.name === PRODUCT);
check(prod && prod.category === cat.slug && prod.stock === 3 && prod.price === 150000, 'product persisted with category, price and stock');

/* ───────── الزبون على الهاتف ───────── */
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar', isMobile: true, hasTouch: true });
await phone.addInitScript(() => {
  if (!sessionStorage.getItem('x')) {
    sessionStorage.setItem('x', '1');
    localStorage.clear();
  }
});
const cp = await phone.newPage();
const customerErrors = [];
errorsOf(cp, customerErrors);
await cp.goto(base + '/', { waitUntil: 'networkidle' });
const tile = cp.locator(`a[href="/collections/${encodeURIComponent(cat.slug)}"], a[href="/collections/${cat.slug}"]`).first();
check((await tile.count()) > 0, 'new category appears on the mobile home');
await tile.click();
await cp.waitForSelector(`h1:has-text("${CAT}")`);
check(true, 'category page opens with its title');
check((await cp.locator(`h2:has-text("${PRODUCT}")`).count()) === 1, 'category page lists the owner-assigned product');
check((await cp.locator('article').count()) === 1, 'category page shows only products assigned to it');

await cp.getByRole('button', { name: `إضافة ${prod.shortName} إلى السلة` }).click();
await cp
  .getByRole('dialog')
  .getByRole('button', { name: /أضف إلى السلة/ })
  .click();
await cp.goto(base + '/cart', { waitUntil: 'networkidle' });
check((await cp.locator(`text=${prod.shortName}`).count()) > 0, 'product is in the cart');

await cp.goto(base + '/checkout', { waitUntil: 'networkidle' });
await cp.fill('#full-name', 'زبون تجريبي');
// رقم مختلف في كل تشغيل: الخادم يقبل 3 طلبات جديدة فقط لنفس الهاتف قبل أن يجهّزها المتجر
const customerPhone = `0770${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
await cp.fill('#phone-number', customerPhone);
await cp.getByRole('button', { name: 'متابعة إلى التوصيل' }).click();
await cp.waitForURL(base + '/checkout/delivery');
await cp.fill('#district-field', 'الكرادة');
await cp.fill('#landmark-field', 'قرب ساحة الحرية');
await cp.getByRole('button', { name: 'متابعة إلى الدفع' }).click();
await cp.waitForURL(base + '/checkout/payment');
await cp.getByRole('button', { name: 'متابعة إلى المراجعة' }).click();
await cp.waitForURL(base + '/checkout/review');
const terms = cp.locator('input[type=checkbox]').last();
if (!(await terms.isChecked())) await terms.check();
await cp.getByRole('button', { name: /تأكيد الطلب/ }).click();
await cp.waitForURL(/\/order-success\/\d+/, { timeout: 15000 });
const orderId = Number(cp.url().split('/').pop());
check(orderId >= 1055, `order placed → /order-success/${orderId}`);
await cp.waitForSelector('text=تم تأكيد الطلب');
check((await cp.locator('text=قيد المراجعة').count()) === 0, 'customer sees «تم تأكيد الطلب», never «قيد المراجعة»');

/* ───────── المالك يرى الطلب ───────── */
const orders = await (await op.request.get(base + '/api/index.php?r=orders', { headers: { 'X-Requested-With': 'iris' } })).json();
const order = orders.orders.find((o) => o.id === orderId);
check(!!order, 'order reached the server (admin list)');
check(order && order.subtotal === 150000 && order.lines[0].price === 150000, 'server priced the order from the catalog');
check(order && order.total === order.subtotal - order.discount + order.shipping, 'total = subtotal - discount + shipping');
const catalog3 = await (await op.request.get(base + '/api/index.php?r=catalog')).json();
check(catalog3.catalog.products.find((p) => p.id === prod.id).stock === 2, 'stock reserved (3 → 2)');

await op.goto(base + `/admin/orders/${orderId}`, { waitUntil: 'networkidle' });
await op.getByRole('dialog').getByRole('button', { name: 'مؤكد', exact: true }).click();
await op.waitForFunction(() => document.querySelector('[role=dialog]')?.textContent?.includes('مؤكد'));
const orders2 = await (await op.request.get(base + '/api/index.php?r=orders', { headers: { 'X-Requested-With': 'iris' } })).json();
check(orders2.orders.find((o) => o.id === orderId)?.status === 'confirmed', 'owner confirmed the order');

/* ───────── الزبون يتتبع ───────── */
await cp.goto(base + `/track-order?order=${orderId}`, { waitUntil: 'networkidle' });
await cp.waitForSelector('span.rounded-full:has-text("قيد التجهيز")');
check((await cp.locator('text=قيد المراجعة').count()) === 0, 'after the owner approves, customer tracking moves to «قيد التجهيز»');

/* ───────── التحقق من رفض التلاعب ───────── */
const anon = await browser.newContext();
const forged = await anon.request.post(base + '/api/index.php?r=catalog/save', {
  headers: { 'X-Requested-With': 'iris' },
  data: { catalog: { categories: [], products: [] } },
});
check(forged.status() === 401, 'saving the catalog without login is rejected (401)');
const noHeader = await anon.request.post(base + '/api/index.php?r=orders', { data: {} });
check(noHeader.status() === 403, 'cross-site style request without header is rejected (403)');

/* ───────── تنظيف: حذف القسم والمنتج التجريبيين ───────── */
// الحذف يمر بنافذة التأكيد داخل اللوحة (لا نوافذ المتصفح الافتراضية)
const confirmIn = (label) => op.getByRole('dialog').getByRole('button', { name: label }).click();
await op.goto(base + '/admin/products', { waitUntil: 'networkidle' });
await op.locator('li', { hasText: PRODUCT }).getByRole('button', { name: 'حذف المنتج' }).click();
await confirmIn('حذف المنتج');
await op.waitForSelector(`text=${PRODUCT}`, { state: 'detached' });
await op.goto(base + '/admin/categories', { waitUntil: 'networkidle' });
await op.locator('li', { hasText: CAT }).getByRole('button', { name: 'حذف القسم' }).click();
await confirmIn('حذف القسم');
await op.waitForSelector(`text=${CAT}`, { state: 'detached' });
check(true, 'cleanup: test product and category deleted');

// 401 الوحيد المتوقع هو محاولة كلمة المرور الخاطئة المقصودة في بداية الاختبار
const unexpected = ownerErrors.filter((e, i) => !(e.includes('401') && i === ownerErrors.findIndex((x) => x.includes('401'))));
check(unexpected.length === 0, `no unexpected console errors in admin${unexpected.length ? ': ' + unexpected.join(' | ') : ''}`);
check(customerErrors.length === 0, `no console errors on storefront${customerErrors.length ? ': ' + customerErrors.join(' | ') : ''}`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
