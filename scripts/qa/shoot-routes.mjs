#!/usr/bin/env node
/**
 * Full-page screenshots of app routes.
 *
 * Usage:
 *   node scripts/qa/shoot-routes.mjs <baseUrl> <outDir> <name=/path[@mobile]> ...
 *   e.g. node scripts/qa/shoot-routes.mjs http://localhost:5173 out home=/ plp=/collections/necklaces cart=/cart@mobile
 *
 * Also prints console errors / page errors / failed requests per route.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const [base, outDirArg, ...specs] = process.argv.slice(2);
const outDir = path.resolve(outDirArg);
fs.mkdirSync(outDir, { recursive: true });
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

const queue = specs.map((s) => {
  const [name, rest] = s.split('=');
  const mobile = rest.endsWith('@mobile');
  return { name, url: base + rest.replace('@mobile', ''), mobile };
});

async function worker() {
  while (queue.length) {
    const t = queue.shift();
    const ctx = await browser.newContext({
      viewport: t.mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      locale: 'ar',
      colorScheme: 'light',
    });
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message.slice(0, 200)));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push('console.error: ' + m.text().slice(0, 200));
    });
    page.on('requestfailed', (r) => {
      const u = r.url();
      if (!/fonts\.(googleapis|gstatic)|googleusercontent/.test(u)) problems.push('requestfailed: ' + u.slice(0, 120));
    });
    try {
      await page.goto(t.url, { waitUntil: 'networkidle', timeout: 60000 });
      // wait for the lazy route to replace the Suspense spinner
      await page.waitForFunction(() => !document.querySelector('[role="status"][aria-label="جارٍ التحميل"]') && document.querySelector('main, header, aside'), null, { timeout: 30000 }).catch(() => problems.push('timeout waiting for content'));
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.evaluate(() => document.fonts && document.fonts.ready);
      // scroll root might be the mobile frame
      const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, ...Array.from(document.querySelectorAll('[data-scroll-root]')).map((e) => e.scrollHeight)));
      for (let y = 0; y < total; y += 400) {
        await page.evaluate((yy) => {
          window.scrollTo(0, yy);
          document.querySelectorAll('[data-scroll-root]').forEach((e) => e.scrollTo(0, yy));
        }, y);
        await page.waitForTimeout(30);
      }
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll('[data-scroll-root]').forEach((e) => e.scrollTo(0, 0));
        document.querySelectorAll('.fade-up-item,.line-reveal,.twin-divider,.curtain-reveal').forEach((el) => el.classList.add('revealed'));
      });
      await page.addStyleTag({ content: FREEZE });
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `${t.name}.png`), fullPage: true });
      console.log(`ok   ${t.name.padEnd(22)} ${t.url}${problems.length ? '\n     ' + [...new Set(problems)].join('\n     ') : ''}`);
    } catch (e) {
      console.log(`FAIL ${t.name} ${String(e).slice(0, 120)}`);
    }
    await ctx.close();
  }
}
await Promise.all([worker(), worker(), worker()]);
await browser.close();
