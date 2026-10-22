#!/usr/bin/env node
/**
 * فحص محركات البحث ومعاينة الروابط على خادم PHP حقيقي (الاستضافة أو حزمة محلية):
 *   - ما يراه من لا يشغّل JavaScript (جوجل في الجولة الأولى، واتساب، فيسبوك، تيليغرام): عنوان، وصف، canonical،
 *     og:image مطلق، بيانات منظمة صحيحة لكل منتج، 404 للمخفي وغير الموجود
 *   - خريطة الموقع وrobots.txt
 *   - تطابق ما يكتبه الخادم مع ما تكتبه الواجهة بعد التحميل (المتصفح)
 *
 * Usage: node scripts/qa/seo-check.mjs <baseUrl> [siteUrl]
 *   siteUrl = قيمة site_url المضبوطة في api/config.php (تُفحص الروابط المطلقة عليها).
 *   بدونها يُفحص الوضع «غير المضبوط»: فهرسة متوقفة عمداً (noindex وrobots يمنع كل شيء).
 */
import http from 'node:http';
import { load } from 'cheerio';
import { chromium } from 'playwright-core';

const [baseArg, siteArg] = process.argv.slice(2);
if (!baseArg) {
  console.error('usage: node scripts/qa/seo-check.mjs <baseUrl> [siteUrl]');
  process.exit(2);
}
const base = baseArg.replace(/\/+$/, '');
const site = siteArg ? siteArg.replace(/\/+$/, '') : '';
const origin = site || base;
const configured = !!site;

let pass = 0;
let fail = 0;
const check = (cond, label, extra) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && extra ? `\n        ${extra}` : ''}`);
};

const get = async (path, init = {}) => {
  const res = await fetch(base + path, { redirect: 'manual', ...init });
  return { res, text: await res.text() };
};
const robotsHeader = (res) => res.headers.get('x-robots-tag') ?? '';

const { text: catalogText } = await get('/api/index.php?r=catalog');
const catalog = JSON.parse(catalogText).catalog;
const shownCats = new Map(catalog.categories.filter((c) => !c.hidden).map((c) => [c.slug, c]));
const visible = catalog.products.filter((p) => !p.hidden && shownCats.has(p.category));
const hiddenProducts = catalog.products.filter((p) => p.hidden || !shownCats.has(p.category));
const hiddenCats = catalog.categories.filter((c) => c.hidden);
const enc = (slug) => encodeURIComponent(slug);

const parse = (html) => {
  const $ = load(html);
  const ld = $('script[type="application/ld+json"]')
    .map((_, el) => JSON.parse($(el).text()))
    .get();
  return {
    $,
    title: $('title').first().text(),
    description: $('meta[name=description]').attr('content'),
    canonical: $('link[rel=canonical]').attr('href'),
    robots: $('meta[name=robots]').attr('content'),
    ogImage: $('meta[property="og:image"]').attr('content'),
    ogTitle: $('meta[property="og:title"]').attr('content'),
    ogUrl: $('meta[property="og:url"]').attr('content'),
    ogType: $('meta[property="og:type"]').attr('content'),
    ld,
  };
};

console.log(`\n== robots.txt و sitemap.xml (${configured ? 'مضبوط: ' + site : 'غير مضبوط'})`);
{
  const { res, text } = await get('/robots.txt');
  check(res.status === 200 && /text\/plain/.test(res.headers.get('content-type') ?? ''), 'robots.txt يُخدم كنص');
  if (configured) {
    check(text.includes(`Sitemap: ${site}/sitemap.xml`), 'robots.txt يعلن خريطة الموقع بالنطاق المعتمد');
    check(/Disallow: \/admin/.test(text) && !/Disallow: \/\s*$/m.test(text), 'robots.txt يمنع /admin فقط ولا يمنع الموقع كله');
    check(text.includes('Allow: /api/index.php?r=catalog$'), 'robots.txt يسمح لجوجل بقراءة الكتالوج ليعرض الصفحة');
  } else {
    check(/Disallow: \/\s*$/m.test(text), 'قبل ضبط site_url: robots.txt يمنع كل شيء عمداً');
  }
  const sm = await get('/sitemap.xml');
  check(sm.res.status === 200 && /xml/.test(sm.res.headers.get('content-type') ?? ''), 'sitemap.xml يُخدم كـ XML');
  const locs = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  check(locs.length > 0 && locs.every((l) => l.startsWith(origin + '/')), 'كل روابط الخريطة بالنطاق نفسه', locs.find((l) => !l.startsWith(origin + '/')));
  check(visible.every((p) => locs.includes(`${origin}/products/${enc(p.slug)}`)), `الخريطة تضم كل المنتجات الظاهرة (${visible.length})`);
  check(hiddenProducts.every((p) => !locs.includes(`${origin}/products/${enc(p.slug)}`)), 'الخريطة لا تضم المنتجات المخفية');
  check([...shownCats.keys()].every((s) => locs.includes(`${origin}/collections/${enc(s)}`)), 'الخريطة تضم الأقسام الظاهرة');
  check(hiddenCats.every((c) => !locs.includes(`${origin}/collections/${enc(c.slug)}`)), 'الخريطة لا تضم الأقسام المخفية');
  check(!locs.some((l) => /\/(cart|checkout|admin|account|track-order)/.test(l)), 'الخريطة لا تضم صفحات السلة والإدارة');
  check(configured ? robotsHeader(sm.res) === '' : /noindex/.test(robotsHeader(sm.res)), configured ? 'الخريطة قابلة للفهرسة' : 'الخريطة noindex قبل ضبط النطاق');
}

console.log('\n== الصفحة الرئيسية');
let home;
{
  const { res, text } = await get('/');
  home = parse(text);
  check(res.status === 200, 'الرئيسية 200');
  check(home.title.includes('آيريس ستور'), 'عنوان الصفحة في HTML الخام');
  check((home.description ?? '').length > 50, 'وصف الصفحة في HTML الخام');
  if (configured) {
    check(home.canonical === `${origin}/`, 'canonical = النطاق المعتمد', home.canonical);
    check(!home.robots && robotsHeader(res) === '', 'الرئيسية قابلة للفهرسة');
  } else {
    check(/noindex/.test(home.robots ?? '') && /noindex/.test(robotsHeader(res)), 'قبل ضبط النطاق: noindex في الوسم والترويسة');
  }
  check((home.ogImage ?? '').startsWith('http'), 'og:image رابط مطلق (واتساب/فيسبوك)', home.ogImage);
  const types = home.ld.map((d) => d['@type']);
  check(types.includes('Organization') && types.includes('WebSite'), 'بيانات Organization و WebSite');
  check(res.headers.get('content-security-policy') === null || /script-src/.test(res.headers.get('content-security-policy')), 'ترويسة CSP لا تُلغى');
  check(/<noscript>[\s\S]*<h1>/.test(text), 'ملخص نصي داخل noscript لمن لا يشغّل JavaScript');
}

console.log('\n== المنتجات');
for (const p of visible) {
  const { res, text } = await get(`/products/${enc(p.slug)}`);
  const d = parse(text);
  const prod = d.ld.find((x) => x['@type'] === 'Product');
  const label = `منتج ${p.slug}`;
  check(res.status === 200, `${label}: 200`);
  check(d.title === `${p.name} | آيريس ستور`, `${label}: العنوان`, d.title);
  if (configured) check(d.canonical === `${origin}/products/${enc(p.slug)}`, `${label}: canonical`, d.canonical);
  check(d.ogImage?.startsWith('http') && d.ogImage.endsWith(p.image), `${label}: og:image مطلق`, d.ogImage);
  check(d.ogType === 'product', `${label}: og:type=product`);
  check(
    !!prod && prod.offers.price === String(Math.round(p.price)) && prod.offers.priceCurrency === 'IQD',
    `${label}: السعر ${p.price} IQD في البيانات المنظمة`,
    JSON.stringify(prod?.offers),
  );
  check(
    prod?.offers.availability === (p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'),
    `${label}: التوفر (${p.stock > 0 ? 'متوفر' : 'نفد'})`,
  );
  check(prod?.image?.every((u) => u.startsWith('http')), `${label}: صور مطلقة`);
  check(d.ld.some((x) => x['@type'] === 'BreadcrumbList'), `${label}: مسار التنقل`);
}

console.log('\n== الأقسام والصفحات الثابتة');
for (const c of shownCats.values()) {
  const { res, text } = await get(`/collections/${enc(c.slug)}`);
  const d = parse(text);
  check(res.status === 200 && d.title.startsWith(c.title || c.name), `قسم ${c.slug}: 200 وعنوان`);
  if (configured) check(d.canonical === `${origin}/collections/${enc(c.slug)}`, `قسم ${c.slug}: canonical`);
}
for (const path of ['/about', '/faq', '/contact', '/policies/shipping', '/policies/care', '/policies/authenticity', '/policies/size-guide']) {
  const { res, text } = await get(path);
  const d = parse(text);
  check(res.status === 200 && d.title.includes(' | آيريس ستور') && (d.description ?? '').length > 30, `${path}: 200 وعنوان ووصف`);
  if (configured) check(d.canonical === origin + path, `${path}: canonical`, d.canonical);
}

console.log('\n== المخفي وغير الموجود');
for (const [path, why] of [
  ...hiddenProducts.map((p) => [`/products/${enc(p.slug)}`, `منتج مخفي ${p.slug}`]),
  ...hiddenCats.map((c) => [`/collections/${enc(c.slug)}`, `قسم مخفي ${c.slug}`]),
  ['/products/no-such-product-xyz', 'منتج غير موجود'],
  ['/collections/no-such-collection', 'قسم غير موجود'],
  ['/policies/nope', 'سياسة غير موجودة'],
]) {
  const { res, text } = await get(path);
  const d = parse(text);
  check(res.status === 404 && /noindex/.test(robotsHeader(res)) && /noindex/.test(d.robots ?? ''), `${why}: 404 وnoindex`, `status=${res.status}`);
  check(!d.ld.some((x) => x['@type'] === 'Product'), `${why}: بلا بيانات منتج`);
}

console.log('\n== الصفحات الخاصة والواجهة البرمجية');
for (const path of ['/cart', '/checkout', '/account', '/track-order', '/order-success/1', '/admin', '/admin/login', '/wishlist', '/search?q=x']) {
  const { res } = await get(path);
  check(/noindex/.test(robotsHeader(res)), `${path}: ترويسة noindex`, `X-Robots-Tag="${robotsHeader(res)}"`);
}
{
  const { res } = await get('/api/index.php?r=catalog');
  check(/noindex/.test(robotsHeader(res)), 'استجابات الواجهة البرمجية لا تُفهرس');
}
if (configured) {
  const host = new URL(site).host;
  const hostName = host.replace(/:\d+$/, '');
  const hostPort = host.slice(hostName.length);
  // نطاق غير معتمد: www للنطاق العادي، واسم بديل لـ localhost والعناوين الرقمية (Apache يرفض www.127.0.0.1)
  const wrongHost = (/^[\d.]+$|^localhost$/.test(hostName) ? 'alias.example' : hostName.startsWith('www.') ? hostName.slice(4) : 'www.' + hostName) + hostPort;
  const redirect = await new Promise((resolve, reject) => {
    const u = new URL(base);
    const r = http.request({ host: u.hostname, port: u.port, path: '/products/' + enc(visible[0].slug), headers: { Host: wrongHost } }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location });
    });
    r.on('error', reject);
    r.end();
  });
  check(redirect.status === 301 && redirect.location === `${site}/products/${enc(visible[0].slug)}`, 'نطاق غير معتمد (www / مؤقت) → 301 إلى النطاق المعتمد', JSON.stringify(redirect));
}

console.log('\n== تطابق الخادم والمتصفح');
{
  const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  const routes = ['/', `/products/${enc(visible[0].slug)}`, `/collections/${enc([...shownCats.keys()][0])}`, '/about', '/faq', '/policies/shipping'];
  for (const route of routes) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar' });
    const page = await ctx.newPage();
    const { text } = await get(route);
    const server = parse(text);
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label="جارٍ التحميل"]'));
    await page.waitForTimeout(300);
    const client = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name=description]')?.getAttribute('content'),
      canonical: document.querySelector('link[rel=canonical]')?.getAttribute('href'),
      robots: document.querySelector('meta[name=robots]')?.getAttribute('content'),
      ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
      ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
      ld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)),
    }));
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    check(client.title === server.title, `${route}: العنوان يتطابق`, `${server.title} ≠ ${client.title}`);
    check(client.description === server.description, `${route}: الوصف يتطابق`, `${server.description} ≠ ${client.description}`);
    check(client.ogImage === server.ogImage, `${route}: og:image يتطابق`, `${server.ogImage} ≠ ${client.ogImage}`);
    check(client.ogUrl === server.ogUrl, `${route}: og:url يتطابق`, `${server.ogUrl} ≠ ${client.ogUrl}`);
    if (configured) check(client.canonical === server.canonical, `${route}: canonical يتطابق`, `${server.canonical} ≠ ${client.canonical}`);
    else check(/noindex/.test(client.robots ?? ''), `${route}: noindex يبقى قبل ضبط النطاق`);
    check(same(client.ld, server.ld), `${route}: البيانات المنظمة تتطابق`, `${JSON.stringify(server.ld).slice(0, 200)} ≠ ${JSON.stringify(client.ld).slice(0, 200)}`);
    await ctx.close();
  }

  // التنقل داخل المتجر يحدّث العنوان والبيانات ويضيف noindex للسلة
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ar' });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label="جارٍ التحميل"]'));
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, `/products/${enc(visible[0].slug)}`);
  await page.waitForFunction((name) => document.title.startsWith(name), visible[0].name, { timeout: 8000 }).catch(() => undefined);
  check((await page.title()).startsWith(visible[0].name), 'التنقل إلى منتج يغيّر العنوان بلا إعادة تحميل');
  check(
    await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => JSON.parse(s.textContent)['@type'] === 'Product')),
    'التنقل إلى منتج يضيف بياناته المنظمة',
  );
  await page.evaluate(() => {
    history.pushState({}, '', '/cart');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  // العنوان يتغير مع كل تنقل (وسم robots موجود أصلاً قبل الإطلاق، فلا يصلح شاهداً على اكتمال التحديث)
  await page.waitForFunction(() => document.title.startsWith('السلة'), null, { timeout: 8000 }).catch(() => undefined);
  check(await page.evaluate(() => /noindex/.test(document.querySelector('meta[name=robots]')?.getAttribute('content') ?? '')), 'التنقل إلى السلة يضيف noindex');
  check(
    await page.evaluate(() => !document.querySelector('script[type="application/ld+json"]') && !document.querySelector('link[rel=canonical]')),
    'السلة بلا canonical ولا بيانات منتج متبقية من الصفحة السابقة',
  );
  await ctx.close();
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
