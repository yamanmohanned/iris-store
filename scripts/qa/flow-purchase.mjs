#!/usr/bin/env node
/**
 * End-to-end purchase flow check (desktop + mobile):
 *   product → add to cart → cart → checkout (contact → delivery → payment → review) → order success
 *
 * Usage: node scripts/qa/flow-purchase.mjs <baseUrl> [outDir]
 * يحتاج خادماً يجيب على /api (خادم التطوير `npm run dev` أو استضافة PHP) لأن الطلب يُرسل إليه.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5173';
const outDir = process.argv[3] ? path.resolve(process.argv[3]) : null;
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ✓' : '  ✗'} ${msg}`);
  if (!cond) failures++;
};

async function run(label, viewport) {
  console.log(`\n== ${label} (${viewport.width}x${viewport.height})`);
  const ctx = await browser.newContext({ viewport, locale: 'ar', colorScheme: 'light' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));
  const shot = async (name) => outDir && (await page.screenshot({ path: path.join(outDir, `${label}-${name}.png`), fullPage: true }));
  const settle = async () => {
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(250);
  };

  // fresh storage with an EXPLICITLY empty cart (a missing key falls back to the demo seed cart,
  // which would otherwise hide whether "add to cart" really worked)
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('iris.cart.v1', '[]');
  });

  // 1. product page → add to cart
  // NB: assertions on *what is in the cart/order* read the persisted state, not page text — desktop pages
  // legitimately render other products (recommendations) inside <main>, and show `name` vs `shortName`.
  const RING_ID = 'rg-31';
  const NECKLACE_ID = 'nk-102'; // the seed/static design item — must never leak in
  const readCart = () => page.evaluate(() => JSON.parse(localStorage.getItem('iris.cart.v1') || '[]'));
  await page.goto(base + '/products/royal-solitaire-ring-31', { waitUntil: 'networkidle' });
  await settle();
  const title = (await page.locator('h1').first().textContent()) ?? '';
  ok(title.includes('خاتم'), `product page renders the requested product (h1: "${title.trim()}")`);
  const add = page.getByRole('button', { name: /أضف إلى السلة الملكية|أضف إلى الحقيبة|أضف إلى السلة|أضيفي للسلة/ }).first();
  await add.click();
  await settle();
  await shot('1-after-add');

  // 2. cart (reached by URL; the checkout CTA below is clicked for real)
  await page.goto(base + '/cart', { waitUntil: 'networkidle' });
  await settle();
  const cartText = await page.locator('main').first().innerText();
  const stored = await readCart();
  ok(
    stored.length === 1 && stored[0].productId === RING_ID && stored[0].qty === 1,
    `add-to-cart stored exactly one ${RING_ID} line (got ${JSON.stringify(stored.map((l) => `${l.productId}×${l.qty}`))})`,
  );
  ok(!stored.some((l) => l.productId === NECKLACE_ID), 'cart does not contain the seed necklace');
  ok(/رقم 31/.test(cartText), 'cart page renders the ring line');
  ok(/24,000/.test(cartText), 'cart shows the ring price (24,000)');
  await shot('2-cart');

  // quantity stepper is wired: +1 → subtotal doubles, -1 → back
  await page.getByRole('button', { name: 'زيادة الكمية' }).first().click();
  await settle();
  ok(/48,000/.test(await page.locator('main').first().innerText()), 'qty +1 updates the subtotal to 48,000');
  await page.getByRole('button', { name: 'إنقاص الكمية' }).first().click();
  await settle();
  ok(/29,000/.test(await page.locator('main').first().innerText()), 'qty -1 restores the total to 29,000');

  // 3. checkout — via the cart's own CTA (a dead button must fail this run)
  await page
    .getByRole('button', { name: /إتمام الطلب/ })
    .or(page.getByRole('link', { name: /إتمام الطلب/ }))
    .first()
    .click();
  await page.waitForURL(/\/checkout$/, { timeout: 5000 }).catch(() => undefined);
  await settle();
  ok(page.url().endsWith('/checkout'), 'cart → checkout via the CTA');
  await page.locator('#full-name').fill('سارة آل رحيم');
  await page.locator('#phone-number').fill('07701234567');
  await shot('3-contact');
  await page.getByRole('button', { name: /متابعة إلى التوصيل/ }).click();
  await settle();
  ok(page.url().endsWith('/checkout/delivery'), 'contact → delivery');

  // validation: landmark required
  await page.getByRole('button', { name: /متابعة إلى الدفع/ }).click();
  await settle();
  ok((await page.locator('body').innerText()).includes('يرجى كتابة نقطة دالة'), 'delivery validates the required landmark');
  await page.locator('#district-field').fill('الكرادة');
  await page.locator('#landmark-field').fill('قرب السوق');
  await shot('4-delivery');
  await page.getByRole('button', { name: /متابعة إلى الدفع/ }).click();
  await settle();
  ok(page.url().endsWith('/checkout/payment'), 'delivery → payment');
  await shot('5-payment');
  await page.getByRole('button', { name: /متابعة إلى المراجعة/ }).click();
  await settle();
  ok(page.url().endsWith('/checkout/review'), 'payment → review');
  await shot('6-review');

  // 4. confirm
  await page.getByRole('button', { name: /تأكيد الطلب/ }).click();
  await page.waitForURL(/\/order-success\/\d+/, { timeout: 10000 }).catch(() => undefined);
  await settle();
  // أرقام الطلبات متسلسلة على الخادم (1055، 1056…) — نقرأ الرقم من الرابط
  const orderId = Number(/\/order-success\/(\d+)$/.exec(page.url())?.[1] ?? 0);
  ok(orderId >= 1055, `order created → ${page.url().replace(base, '')}`);
  const body = await page.locator('body').innerText();
  ok(body.includes(`#${orderId}`), 'success page shows the new order number');
  ok(/رقم 31/.test(body), 'success page lists the purchased ring');
  ok(/29,000/.test(body), 'success page total = 24,000 + 5,000 shipping');
  const order = await page.evaluate((id) => (JSON.parse(localStorage.getItem('iris.orders.v1') || '[]')).find((o) => o.id === id), orderId);
  ok(
    !!order && order.lines.length === 1 && order.lines[0].productId === RING_ID && order.total === 29000,
    `persisted order #${orderId} = one ${RING_ID} line, total 29000 (got ${order ? JSON.stringify({ lines: order.lines.map((l) => l.productId), total: order.total }) : 'none'})`,
  );
  await shot('7-success');

  // cart is emptied
  await page.goto(base + '/cart', { waitUntil: 'networkidle' });
  await settle();
  ok(/فارغة/.test(await page.locator('body').innerText()), 'cart is empty after the order');

  ok(errors.length === 0, `no console/page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}

await run('desktop', { width: 1280, height: 900 });
await run('mobile', { width: 390, height: 844 });
await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
