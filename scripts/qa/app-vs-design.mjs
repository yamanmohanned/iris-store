#!/usr/bin/env node
/**
 * Renders every mapped app route and compares it with the original Stitch screen render.
 *
 * Usage:
 *   node scripts/qa/app-vs-design.mjs <baseUrl> <designShotsDir> <outDir> [--only id,id] [--top 30] [--diff]
 *
 * designShotsDir = output of `shoot.mjs "<static server>/html/{id}.html" <dir> --all`
 */
import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { entries } from './routes.manifest.mjs';

const [base, designDir, outDirArg, ...flags] = process.argv.slice(2);
const outDir = path.resolve(outDirArg);
fs.mkdirSync(outDir, { recursive: true });
let only = null;
let top = 40;
let writeDiff = false;
for (let i = 0; i < flags.length; i++) {
  if (flags[i] === '--only') only = flags[++i].split(',');
  else if (flags[i] === '--top') top = +flags[++i];
  else if (flags[i] === '--diff') writeDiff = true;
}

const manifest = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../design/stitch/manifest.json'), 'utf8'));
const titleOf = (id) => (manifest.find((m) => m.id.startsWith(id))?.title || '').replace(/^IRIS \| /, '');
const fullId = (id) => manifest.find((m) => m.id.startsWith(id))?.id ?? id;

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
const targets = entries.filter((e) => !only || only.some((p) => e.id.startsWith(p)));

const SEED_CART = [{ productId: 'ig-swan', qty: 1, options: { metal: 'ذهبي' } }];

async function shoot(t) {
  const ctx = await browser.newContext({
    viewport: t.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    locale: 'ar',
    colorScheme: 'light',
  });
  await ctx.addInitScript(
    ({ admin, cart, user }) => {
      try {
        if (admin) localStorage.setItem('iris.admin.v1', JSON.stringify({ name: 'سارة آل رحيم', role: 'المدير العام' }));
        if (user) localStorage.setItem('iris.user.v1', JSON.stringify({ name: 'أحمد علي', phone: '07701234567', city: 'بغداد' }));
        localStorage.setItem('iris.cart.v1', JSON.stringify(cart === 'empty' ? [] : cart.seed));
      } catch {}
    },
    { admin: !!t.admin, user: !!t.user, cart: t.cart === 'empty' ? 'empty' : { seed: SEED_CART } },
  );
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 160)));
  page.on('console', (m) => m.type() === 'error' && problems.push('console.error: ' + m.text().slice(0, 160)));
  let broken = [];
  try {
    await page.goto(base + t.route, { waitUntil: 'networkidle', timeout: 60000 });
    await page
      .waitForFunction(() => !document.querySelector('[role="status"][aria-label="جارٍ التحميل"]') && document.querySelector('main, header, aside, div'), null, { timeout: 30000 })
      .catch(() => problems.push('timeout waiting for content'));
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.evaluate(() => document.fonts && document.fonts.ready);
    const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, ...Array.from(document.querySelectorAll('[data-scroll-root]')).map((e) => e.scrollHeight)));
    for (let y = 0; y < total; y += 400) {
      await page.evaluate((yy) => {
        window.scrollTo(0, yy);
        document.querySelectorAll('[data-scroll-root]').forEach((e) => e.scrollTo(0, yy));
      }, y);
      await page.waitForTimeout(25);
    }
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelectorAll('[data-scroll-root]').forEach((e) => e.scrollTo(0, 0));
      document.querySelectorAll('.fade-up-item,.line-reveal,.twin-divider,.curtain-reveal').forEach((el) => el.classList.add('revealed'));
    });
    broken = await page.evaluate(() =>
      Array.from(document.images)
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => i.getAttribute('src')),
    );
    await page.addStyleTag({ content: FREEZE });
    await page.waitForTimeout(250);
    const file = path.join(outDir, `${fullId(t.id)}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return { file, problems: [...new Set(problems)], broken };
  } finally {
    await ctx.close();
  }
}

const rows = [];
const queue = [...targets];
await Promise.all(
  Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const t = queue.shift();
      try {
        const r = await shoot(t);
        let pct = null;
        let hb = null;
        let hc = null;
        const designFile = path.join(designDir, `${fullId(t.id)}.png`);
        if (fs.existsSync(designFile) && !t.composite) {
          const a = PNG.sync.read(fs.readFileSync(designFile));
          const b = PNG.sync.read(fs.readFileSync(r.file));
          const w = Math.min(a.width, b.width);
          const h = Math.min(a.height, b.height);
          const crop = (img) => {
            const o = new PNG({ width: w, height: h });
            PNG.bitblt(img, o, 0, 0, w, h, 0, 0);
            return o;
          };
          const diff = new PNG({ width: w, height: h });
          const n = pixelmatch(crop(a).data, crop(b).data, diff.data, w, h, { threshold: 0.12 });
          pct = (n / (w * h)) * 100;
          hb = a.height;
          hc = b.height;
          if (writeDiff) fs.writeFileSync(path.join(outDir, `diff_${fullId(t.id)}.png`), PNG.sync.write(diff));
        }
        rows.push({ ...t, ...r, pct, hb, hc });
      } catch (e) {
        rows.push({ ...t, error: String(e).slice(0, 120), problems: [], broken: [] });
      }
    }
  }),
);
await browser.close();

rows.sort((x, y) => (y.pct ?? -1) - (x.pct ?? -1));
const mean = rows.filter((r) => r.pct != null).reduce((s, r, _, a) => s + r.pct / a.length, 0);
console.log(`routes rendered: ${rows.length} | mean diff vs design: ${mean.toFixed(2)}%`);
console.log('id      diff%   height(design→app)     route                                title');
for (const r of rows.slice(0, top)) {
  const dh = r.hb != null ? r.hc - r.hb : null;
  console.log(
    `${r.id}  ${r.pct == null ? '  n/a ' : r.pct.toFixed(2).padStart(6)}  ${r.hb == null ? '           ' : `${String(r.hb).padStart(5)}→${String(r.hc).padEnd(5)}${dh ? ` (${dh > 0 ? '+' : ''}${dh})` : '     '}`}  ${(r.route + (r.mobile ? ' [m]' : '')).padEnd(36)} ${titleOf(r.id).slice(0, 40)}`,
  );
}
const withProblems = rows.filter((r) => r.error || r.problems.length || r.broken.length);
if (withProblems.length) {
  console.log(`\n⚠ ${withProblems.length} route(s) with runtime problems:`);
  for (const r of withProblems) {
    console.log(`- ${r.id} ${r.route}${r.error ? ' ERROR ' + r.error : ''}`);
    r.problems.forEach((p) => console.log('    ' + p));
    r.broken.slice(0, 5).forEach((b) => console.log('    broken image: ' + b));
  }
}
