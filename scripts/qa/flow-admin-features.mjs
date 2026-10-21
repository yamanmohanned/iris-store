/**
 * فحص ميزات لوحة الإدارة في المتصفح: الهوية (شعار وخط)، فريق العمل والصلاحيات، الاستيراد من إنستغرام، إعادة الضبط.
 *
 *   IRIS_IG_FAKE=1 npm run dev -- --port 5197      ← خادم التطوير مع إنستغرام وهمي (scripts/qa/fixtures/instagram.json)
 *   node scripts/qa/flow-admin-features.mjs http://127.0.0.1:5197 [owner-password] [screenshots-dir]
 *
 * يعيد ضبط بيانات خادم التطوير (.dev-data) في نهايته إلى المحتوى الافتتاحي.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const [base, password = 'owner12345', shots] = process.argv.slice(2);
if (!base) {
  console.error('usage: node scripts/qa/flow-admin-features.mjs <base> [password] [shots-dir]');
  process.exit(2);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LOGO = path.join(root, 'scripts/qa/fixtures/test-logo.png');
const FONT = path.join(root, 'public/fonts/tajawal-400-arabic.woff2');
const chrome = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (shots) fs.mkdirSync(shots, { recursive: true });

let pass = 0;
let fail = 0;
const check = (cond, label) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
};
const shot = async (page, name) => shots && page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false });
const catalog = async () => (await (await fetch(`${base}/api/index.php?r=catalog`)).json()).catalog;

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const desktop = { viewport: { width: 1280, height: 900 }, locale: 'ar' };

async function login(ctx, username, pw) {
  const page = await ctx.newPage();
  await page.goto(base + '/admin/login', { waitUntil: 'networkidle' });
  await page.fill('#username', username);
  await page.fill('#password', pw);
  await page.click('button[type=submit]');
  await page.waitForURL(base + '/admin', { timeout: 15000 });
  return page;
}

/* ───────── المالك: البداية ───────── */
const ownerCtx = await browser.newContext(desktop);
const op = await login(ownerCtx, 'owner', password);
const errors = [];
op.on('pageerror', (e) => errors.push(e.message));
await op.waitForSelector('text=جهّز متجرك');
check(true, 'overview shows the getting-started checklist');
await shot(op, '01-overview');

/* ───────── الهوية: شعار + خط مرفوع + خط مرفق ───────── */
await op.goto(base + '/admin/settings/branding', { waitUntil: 'networkidle' });
await op.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').first().setInputFiles(LOGO);
await op.waitForFunction(() => [...document.querySelectorAll('img')].some((i) => i.getAttribute('src')?.startsWith('/uploads/')), null, { timeout: 15000 });
check(true, 'logo uploaded (transparent PNG kept as-is)');
await op.locator('input[type=file][accept=".woff2,.woff,.ttf,.otf"]').first().setInputFiles(FONT);
await op.waitForSelector('text=خط مرفوع', { timeout: 15000 });
check(true, 'body font file uploaded');
await op.getByRole('radiogroup', { name: 'خط العناوين' }).getByRole('radio', { name: /القاهرة/ }).click();
await op.getByRole('switch', { name: /إظهار كلمة IRIS/ }).click();
await shot(op, '02-branding-preview');
await op.getByRole('button', { name: 'حفظ الهوية' }).click();
await op.waitForSelector('text=تم حفظ الهوية');
const branding = (await catalog()).settings.branding ?? {};
check(
  branding.logo?.startsWith('/uploads/') && branding.bodyFont?.regular?.startsWith('/uploads/fonts/') && branding.headingFont?.preset === 'cairo' && branding.showWordmark === false,
  `branding saved on the server (${JSON.stringify(branding)})`,
);

/* المتجر يطبّق الهوية */
const shopper = await browser.newContext(desktop);
const sp = await shopper.newPage();
await sp.goto(base + '/', { waitUntil: 'networkidle' });
await sp.evaluate(() => document.fonts.ready);
const applied = await sp.evaluate((logo) => ({
  logo: [...document.querySelectorAll('header img')].some((i) => i.getAttribute('src') === logo),
  body: getComputedStyle(document.body).fontFamily,
  heading: getComputedStyle(document.querySelector('h1') ?? document.body).fontFamily,
  fontLoaded: document.fonts.check('16px IrisCustomBody'),
  favicon: document.querySelector('link[rel="icon"]')?.getAttribute('href'),
}), branding.logo);
check(applied.logo, 'storefront header shows the uploaded logo');
check(/var\(--font-text\)|IrisCustomBody/.test(applied.body) && applied.fontLoaded, `uploaded font applied and loaded (${applied.body})`);
check(await sp.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-heading').includes('Cairo')), 'heading font variable = Cairo');
check(applied.favicon === branding.logo, 'favicon switched to the logo');
await shot(sp, '03-storefront-branded');
// الفتح التالي: نؤخر واجهة React لنرى شاشة البداية نفسها
await sp.route('**/src/main.tsx', async (route) => {
  await new Promise((r) => setTimeout(r, 1500));
  await route.continue();
});
await sp.goto(base + '/', { waitUntil: 'domcontentloaded' });
const boot = await sp.evaluate(() => ({
  mode: document.documentElement.getAttribute('data-boot-logo'),
  css: Boolean(document.getElementById('iris-branding')?.textContent?.includes('IrisCustomBody')),
}));
check(boot.mode === 'img' && boot.css, `first paint uses the saved logo and font before the app loads (${JSON.stringify(boot)})`);
await sp.unroute('**/src/main.tsx');

/* ───────── فريق العمل: موظف للطلبات فقط ───────── */
await op.goto(base + '/admin/staff', { waitUntil: 'networkidle' });
await op.getByRole('button', { name: 'إضافة موظف' }).first().click();
const drawer = op.getByRole('dialog');
await drawer.locator('input').nth(0).fill('مريم');
await drawer.locator('input').nth(1).fill('الطلبات');
await drawer.locator('input[autocomplete=off]').first().fill('qa.orders');
const staffPw = await drawer.locator('input[autocomplete="new-password"]').inputValue();
await drawer.getByRole('button', { name: /مسؤول الطلبات/ }).click();
await shot(op, '04-staff-editor');
await drawer.getByRole('button', { name: 'إنشاء الحساب' }).click();
await op.waitForSelector('text=@qa.orders');
check(staffPw.length >= 8, 'staff account created with a generated password');

const staffCtx = await browser.newContext(desktop);
const st = await login(staffCtx, 'qa.orders', staffPw);
const nav = await st.locator('nav[aria-label="القائمة الرئيسية للإدارة"]').innerText();
check(nav.includes('الطلبات') && nav.includes('المنتجات') && !nav.includes('فريق العمل') && !nav.includes('إنستغرام'), 'staff sidebar shows only permitted sections');
await shot(st, '05-staff-overview');
await st.goto(base + '/admin/products', { waitUntil: 'networkidle' });
check((await st.locator('text=لديك صلاحية العرض فقط').count()) === 1 && (await st.getByRole('button', { name: 'إضافة منتج' }).count()) === 0, 'products are view-only for this staff member');
await st.goto(base + '/admin/staff', { waitUntil: 'networkidle' });
check((await st.locator('text=لا تملك صلاحية لهذه الصفحة').count()) === 1, 'staff page is blocked for staff');
await st.goto(base + '/admin/settings', { waitUntil: 'networkidle' });
check(st.url().endsWith('/admin/settings/account'), 'settings opens on «حسابي» for staff without settings access');
const forged = await st.evaluate(async () => {
  const r = await fetch('/api/index.php?r=catalog/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'iris' },
    body: JSON.stringify({ catalog: { categories: [], products: [], settings: {} } }),
  });
  return r.status;
});
check(forged === 403, 'server rejects a catalog save from orders-only staff (403)');

// المالك يوقف الحساب ← يخرج الموظف فوراً
await op.getByRole('button', { name: 'تعديل مريم' }).click();
await op.getByRole('dialog').getByRole('switch').click();
await op.getByRole('dialog').getByRole('button', { name: 'حفظ التعديلات' }).click();
await op.waitForSelector('text=موقوف');
await st.goto(base + '/admin', { waitUntil: 'networkidle' });
check(st.url().endsWith('/admin/login'), 'deactivated staff is signed out immediately');

/* ───────── إنستغرام: ربط ثم استيراد منشور ───────── */
await op.goto(base + '/admin/settings/instagram', { waitUntil: 'networkidle' });
await op.locator('textarea').fill('IGAA' + 'x'.repeat(80));
await op.getByRole('button', { name: 'ربط الحساب' }).click();
await op.waitForSelector('text=مربوط بالحساب');
check(true, 'Instagram connected');
await op.goto(base + '/admin/instagram', { waitUntil: 'networkidle' });
await op.waitForSelector('text=قلادة البجعة الوردية', { timeout: 15000 });
const cards = await op.locator('main ul > li').count();
check(cards === 2, `only posts not imported yet are listed (${cards}; the starter products are matched by link)`);
const scanned = await op
  .waitForFunction(() => /الفحص التلقائي: (\d+) من \1\b/.test(document.body.innerText), null, { timeout: 90000 })
  .then(() => true)
  .catch(() => false);
console.log(`INFO  people scan ${scanned ? 'finished' : 'did not finish (MediaPipe from CDN unavailable?)'}`);
await shot(op, '06-instagram-grid');
await op.locator('main ul > li button', { hasText: 'قلادة البجعة الوردية' }).click();
await op.getByRole('button', { name: 'مراجعة واستيراد' }).click();
const review = op.getByRole('dialog');
check((await review.locator('select').first().inputValue()) === 'necklaces', 'category suggested from the caption (necklaces)');
check((await review.locator('input[inputmode=numeric]').first().inputValue()) === '8000', 'price read from the caption (8,000)');
await shot(op, '07-instagram-review');
await review.getByRole('button', { name: /استيراد 1/ }).click();
await op.waitForURL(base + '/admin/products', { timeout: 60000 });
const imported = (await catalog()).products.find((p) => p.source === 'ig:17900000000000101');
check(
  !!imported && imported.image.startsWith('/uploads/') && imported.videos?.[0]?.endsWith('.mp4') && imported.price === 8000,
  `imported product has downloaded images + video (${JSON.stringify(imported && { image: imported.image, videos: imported.videos, price: imported.price })})`,
);
await sp.goto(`${base}/products/${imported?.slug}`, { waitUntil: 'networkidle' });
await sp.locator('button[aria-label^="تشغيل الفيديو"]').first().click();
const video = await sp.waitForFunction(() => document.querySelector('main video')?.readyState >= 2, null, { timeout: 15000 }).then(() => true).catch(() => false);
check(video, 'product page plays the imported video');
await shot(sp, '08-product-video');

/* ───────── إعادة الضبط ───────── */
await op.goto(base + '/admin/settings/reset', { waitUntil: 'networkidle' });
await op.getByRole('button', { name: 'إعادة ضبط المتجر…' }).click();
await op.getByRole('button', { name: 'متابعة' }).click();
const modal = op.getByRole('dialog');
await modal.locator('input:not([type])').first().fill('إعادة ضبط المتجر');
await modal.locator('input[type=password]').fill('wrong-password');
await modal.locator('input[type=checkbox]').check();
await shot(op, '09-reset-confirm');
await modal.getByRole('button', { name: /احذف كل شيء/ }).click();
await op.waitForSelector('text=كلمة المرور غير صحيحة.');
check(true, 'reset refused with a wrong password');
await modal.locator('input[type=password]').fill(password);
await modal.getByRole('button', { name: /احذف كل شيء/ }).click();
await op.waitForURL(base + '/admin', { timeout: 15000 });
const empty = await catalog();
check(empty.products.length === 0 && empty.categories.length === 0 && !empty.settings.branding, 'store is empty with default branding');
await sp.goto(base + '/', { waitUntil: 'networkidle' });
check((await sp.locator('text=نجهّز المجموعة الأولى').count()) === 1, 'empty storefront shows the coming-soon block');
await shot(sp, '10-empty-store');
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ar', isMobile: true, hasTouch: true });
const pp = await phone.newPage();
await pp.goto(base + '/', { waitUntil: 'networkidle' });
check((await pp.locator('text=نجهّز المجموعة الأولى').count()) === 1, 'empty mobile home shows the coming-soon block');
await shot(pp, '11-empty-store-mobile');

// إرجاع المحتوى الافتتاحي حتى يبقى خادم التطوير كما بدأ
const restored = await op.evaluate(async (pw) => {
  const r = await fetch('/api/index.php?r=system/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'iris' },
    body: JSON.stringify({ password: pw, confirm: 'إعادة ضبط المتجر', mode: 'starter' }),
  });
  return (await r.json()).catalog?.products?.length;
}, password);
check(restored > 0, `starter content restored (${restored} products)`);
check(errors.length === 0, `no page errors in admin${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
