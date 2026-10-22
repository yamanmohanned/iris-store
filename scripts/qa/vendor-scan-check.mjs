#!/usr/bin/env node
/**
 * يتأكد أن فحص الأشخاص في الاستيراد من إنستغرام يعمل من ملفات المتجر نفسه (public/vendor/mediapipe) تحت سياسة CSP
 * الحقيقية ونوع MIME الذي يرسله الخادم: لا طلب واحد إلى نطاق خارجي، ولا خطأ في الصفحة.
 *
 * Usage: node scripts/qa/vendor-scan-check.mjs <baseUrl>     (الاستضافة أو حزمة محلية تُرسل ترويسات .htaccess)
 */
import { chromium } from 'playwright-core';

const base = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!base) {
  console.error('usage: node scripts/qa/vendor-scan-check.mjs <baseUrl>');
  process.exit(2);
}
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage();

let pass = 0;
let fail = 0;
const check = (cond, label, extra) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${!cond && extra ? `\n        ${extra}` : ''}`);
};

const external = [];
const errors = [];
const vendor = new Map();
page.on('request', (r) => {
  const u = new URL(r.url());
  if (u.origin !== new URL(base).origin && /^https?:$/.test(u.protocol)) external.push(r.url());
});
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('INFO:') && errors.push(m.text())); // MediaPipe يكتب INFO بمستوى error
page.on('pageerror', (e) => errors.push(e.message));
page.on('requestfailed', (r) => errors.push(`requestfailed ${r.url().replace(base, '')}: ${r.failure()?.errorText}`));
page.on('response', (r) => {
  if (r.url().includes('/vendor/mediapipe/')) vendor.set(r.url().replace(base, ''), `${r.status()} ${r.headers()['content-type'] ?? ''}`);
});

await page.goto(base + '/', { waitUntil: 'networkidle' });
const result = await page.evaluate(async () => {
  const V = '/vendor/mediapipe';
  try {
    const vision = await import(`${V}/vision_bundle.mjs`);
    const files = await vision.FilesetResolver.forVisionTasks(`${V}/wasm`);
    const face = await vision.FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: `${V}/models/blaze_face_short_range.tflite` }, runningMode: 'IMAGE' });
    const obj = await vision.ObjectDetector.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${V}/models/efficientdet_lite0.tflite` },
      runningMode: 'IMAGE',
      categoryAllowlist: ['person'],
      scoreThreshold: 0.5,
    });
    const img = new Image();
    img.src = '/images/instagram/couple-rings-set.jpg';
    await img.decode();
    return { ok: true, faces: face.detect(img).detections.length, people: obj.detect(img).detections.length };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
});

check(result.ok, 'المكتبة والنموذجان يُحمَّلان ويعملان من الملفات المستضافة', result.error);
check(external.length === 0, 'لا طلبات إلى نطاقات خارجية', external.join(', '));
check(errors.length === 0, 'لا أخطاء في وحدة التحكم (ومنها انتهاكات CSP)', errors.join(' | '));
for (const [path, v] of vendor) {
  if (path.endsWith('.wasm')) check(/^200 application\/wasm/.test(v), `${path}: النوع application/wasm`, v);
  if (path.endsWith('.mjs')) check(/^200 (text|application)\/javascript/.test(v), `${path}: النوع JavaScript`, v);
}
check(vendor.size >= 4, `طُلبت ملفات المتجر الأربعة (${vendor.size})`);

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
