#!/usr/bin/env node
/**
 * Full-page screenshots of pages for visual regression (desktop 1280 / mobile 390).
 *
 * Usage:
 *   node scripts/qa/shoot.mjs <urlTemplate> <outDir> [--ids a,b,c | --all] [--concurrency 3]
 *
 *   urlTemplate  e.g. http://localhost:8731/html/{id}.html   or   http://127.0.0.1:5173/_raw/{id}
 *
 * Needs Google Chrome installed (CHROME_PATH env var overrides the default Windows path).
 * Animations are frozen and reveal-on-scroll classes forced so renders are deterministic.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/stitch/manifest.json'), 'utf8')).filter((m) => m.html?.endsWith('.html'));

const args = process.argv.slice(2);
const urlTemplate = args[0];
const outDir = path.resolve(args[1]);
let ids = null;
let concurrency = 3;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--ids') ids = args[++i].split(',');
  else if (args[i] === '--all') ids = null;
  else if (args[i] === '--concurrency') concurrency = +args[++i];
}
const targets = manifest.filter((m) => !ids || ids.some((p) => m.id.startsWith(p)));
fs.mkdirSync(outDir, { recursive: true });

const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });

const FREEZE = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

async function shoot(page, m) {
  const mobile = m.width < 1000;
  await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 });
  const url = urlTemplate.replace('{id}', m.id);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('goto warn', m.id, String(e).slice(0, 80)));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 400) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(35);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    document
      .querySelectorAll('.fade-up-item,.line-reveal,.twin-divider,.curtain-reveal,.reveal,.reveal-item')
      .forEach((el) => el.classList.add('revealed'));
  });
  await page.addStyleTag({ content: FREEZE });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(outDir, `${m.id}.png`), fullPage: true });
}

const queue = [...targets];
let done = 0;
async function worker() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, locale: 'ar', colorScheme: 'light', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  while (queue.length) {
    const m = queue.shift();
    try {
      await shoot(page, m);
    } catch (e) {
      console.log('FAIL', m.id, String(e).slice(0, 100));
    }
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${targets.length}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: concurrency }, worker));
await browser.close();
console.log(`shot ${done} pages -> ${outDir}`);
