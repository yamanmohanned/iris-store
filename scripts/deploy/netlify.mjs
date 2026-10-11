#!/usr/bin/env node
/**
 * يكمل بناء نسخة Netlify التجريبية (بعد `vite build --mode netlify`):
 *   dist/_redirects   كل الروابط تفتح index.html (واجهة الخادم في netlify/functions تُخدم قبلها)
 *   dist/_headers     منع الفهرسة + ترويسات أمان + تخزين مؤقت طويل للملفات ذات البصمة
 *   release/iris-store-netlify.zip   للنشر بالسحب والإفلات على app.netlify.com/drop
 *
 *   npm run build:netlify
 *
 * الملفان _redirects و _headers يعملان في كل طرق النشر (Git أو CLI أو السحب والإفلات).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ لا يوجد بناء في dist/. شغّل: npm run build:netlify');
  process.exit(1);
}

// صور رفعها المطوّر أثناء التطوير (public/uploads) لا تدخل النسخة التجريبية
fs.rmSync(path.join(dist, 'uploads'), { recursive: true, force: true });

fs.writeFileSync(path.join(dist, '_redirects'), '/*  /index.html  200\n');

fs.writeFileSync(
  path.join(dist, '_headers'),
  `/*
  X-Robots-Tag: noindex, nofollow
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable
`,
);

// ملف واحد للسحب والإفلات (Netlify Drop يقبل zip) — لا داعي له داخل بناء Netlify نفسه
if (process.env.NETLIFY === 'true') {
  console.log('✓ dist/_redirects و dist/_headers جاهزان');
  process.exit(0);
}
const releaseDir = path.join(root, 'release');
fs.mkdirSync(releaseDir, { recursive: true });
const zip = path.join(releaseDir, 'iris-store-netlify.zip');
fs.rmSync(zip, { force: true });
try {
  if (process.platform === 'win32') {
    // tar المدمج في ويندوز (bsdtar) وليس tar الخاص بـ Git Bash
    const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
    execFileSync(fs.existsSync(tar) ? tar : 'tar', ['-a', '-c', '-f', zip, '-C', dist, '.'], { stdio: 'inherit' });
  } else execFileSync('zip', ['-r', '-q', zip, '.'], { cwd: dist, stdio: 'inherit' });
  console.log(
    `✓ ${path.relative(root, zip)} (${(fs.statSync(zip).size / 1024 / 1024).toFixed(1)} MB) — للسحب والإفلات على app.netlify.com/drop`,
  );
} catch {
  console.warn('! تعذر إنشاء ملف zip؛ يمكن سحب المجلد dist نفسه.');
}
console.log('✓ dist/_redirects و dist/_headers جاهزان');
