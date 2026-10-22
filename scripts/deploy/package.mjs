#!/usr/bin/env node
/**
 * يجهّز حزمة الرفع على الاستضافة: release/hosting/ (+ release/iris-store-hosting.zip)
 *
 *   npm run package            ← يبني الواجهة ثم يجمع الحزمة
 *
 * محتوى الحزمة (يُرفع كما هو إلى public_html):
 *   index.html + assets/ + images/ + brand/ …   الواجهة المبنية (dist)
 *   .htaccess                                   توجيه الروابط، التخزين المؤقت، ترويسات الأمان
 *   api/                                        واجهة PHP (الكتالوج، الطلبات، دخول المالك، رفع الصور)
 *   api/data/catalog.seed.json                  الكتالوج الأولي حتى يحفظ المالك كتالوجه
 *   uploads/                                    صور يرفعها المالك
 *
 * اختياري (كلها تُكتب في الحزمة، ويمكن فعل الشيء نفسه لاحقاً بتعديل ملف على الاستضافة):
 *   IRIS_SITE_URL=https://example.com   النطاق النهائي → api/config.php ← site_url (روابط الصفحات، خريطة الموقع، فهرسة جوجل)
 *                                       ويفعّل تحويل HTTPS ما لم يكن IRIS_FORCE_HTTPS=0. بدونه يمنع الخادم الفهرسة عمداً.
 *   IRIS_FORCE_HTTPS=1|0                تحويل كل الزيارات إلى HTTPS في .htaccess (يتطلب شهادة SSL تعمل)
 *   IRIS_ADMIN_USER و IRIS_ADMIN_PASSWORD   بيانات دخول المالك في api/config.php مباشرة.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HSTS, pageHeaders } from './csp.mjs';

const MIN_PASSWORD = 8;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const releaseDir = path.join(root, 'release');
const out = path.join(releaseDir, 'hosting');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('✗ لا يوجد بناء في dist/. شغّل: npm run build');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const copy = (from, to) => fs.cpSync(from, to, { recursive: true, filter: (src) => !/[\\/]uploads[\\/]\d{4}/.test(src) });

// 1) الواجهة المبنية (بدون صور رفعها المطوّر أثناء التطوير)
copy(dist, out);
fs.rmSync(path.join(out, 'uploads'), { recursive: true, force: true });

// 2) إعدادات الخادم + مجلد الصور، وترويسات الأمان (CSP ببصمة سكربت الإقلاع في index.html المبني)
copy(path.join(root, 'server/hosting'), out);
const htaccess = path.join(out, '.htaccess');
const MARKER = '  # @iris-security-headers';
const headerLines = [
  ...Object.entries(pageHeaders(fs.readFileSync(path.join(dist, 'index.html'), 'utf8'))).map(([k, v]) => `  Header always set ${k} "${v}"`),
  '  # HSTS: المتصفح يلتزم بـ HTTPS سنة كاملة — يُرسل فقط حين يصل الطلب نفسه عبر HTTPS',
  `  Header always set Strict-Transport-Security "${HSTS}" env=HTTPS`,
];
const template = fs.readFileSync(htaccess, 'utf8');
if (!template.includes(MARKER)) {
  console.error('✗ server/hosting/.htaccess لا يحتوي السطر «# @iris-security-headers»');
  process.exit(1);
}
fs.writeFileSync(htaccess, template.replace(MARKER, headerLines.join('\n')));

// 3) واجهة PHP + الكتالوج الأولي + عناوين الصفحات الثابتة (مصدر واحد مع الواجهة: src/data/seoPages.json)
copy(path.join(root, 'server/api'), path.join(out, 'api'));
fs.copyFileSync(path.join(root, 'src/data/seed.json'), path.join(out, 'api/data/catalog.seed.json'));
fs.copyFileSync(path.join(root, 'src/data/seoPages.json'), path.join(out, 'api/seo-pages.json'));

// 3b) النطاق النهائي (اختياري) وتحويل HTTPS
const rawSite = (process.env.IRIS_SITE_URL ?? '').trim().replace(/\/+$/, '');
if (rawSite && !/^https?:\/\/[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/i.test(rawSite)) {
  console.error('✗ IRIS_SITE_URL يجب أن يكون نطاقاً فقط بلا مسار، مثل https://example.com');
  process.exit(1);
}
const siteUrl = rawSite;
const forceHttps = process.env.IRIS_FORCE_HTTPS ? process.env.IRIS_FORCE_HTTPS === '1' : siteUrl.startsWith('https://');
if (siteUrl) {
  const cfgPath = path.join(out, 'api/config.php');
  const cfg = fs.readFileSync(cfgPath, 'utf8');
  if (!/'site_url' => ''/.test(cfg)) {
    console.error("✗ api/config.php لا يحتوي السطر 'site_url' => ''");
    process.exit(1);
  }
  fs.writeFileSync(cfgPath, cfg.replace("'site_url' => ''", () => `'site_url' => '${siteUrl}'`));
}
if (forceHttps) {
  const text = fs.readFileSync(htaccess, 'utf8').replace(/\r\n/g, '\n');
  const on = text.replace(/^(\s*)# (RewriteCond %\{HTTPS\} !=on|RewriteCond %\{HTTP:X-Forwarded-Proto\} !=https|RewriteRule \^ https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\} \[L,R=301\])$/gm, '$1$2');
  if (on === text) {
    console.error('✗ تعذر تفعيل تحويل HTTPS: أسطره غير موجودة في server/hosting/.htaccess');
    process.exit(1);
  }
  fs.writeFileSync(htaccess, on);
}

// 4) بيانات دخول المالك (اختياري)
const user = process.env.IRIS_ADMIN_USER;
const pass = process.env.IRIS_ADMIN_PASSWORD;
if (pass) {
  if (pass.length < MIN_PASSWORD) {
    console.error('✗ IRIS_ADMIN_PASSWORD يجب أن تكون 8 أحرف على الأقل');
    process.exit(1);
  }
  const cfgPath = path.join(out, 'api/config.php');
  const esc = (v) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  let cfg = fs.readFileSync(cfgPath, 'utf8').replace("'admin_password' => 'CHANGE-ME'", `'admin_password' => '${esc(pass)}'`);
  if (user) cfg = cfg.replace("'admin_username' => 'owner'", `'admin_username' => '${esc(user)}'`);
  fs.writeFileSync(cfgPath, cfg);
  console.log('✓ كُتبت بيانات دخول المالك في api/config.php');
}

// 4b) أسطر LF في كل الملفات النصية: الاستضافة لينكس، والبناء على ويندوز يترك CRLF في .htaccess و PHP و index.html
const TEXT = /(^|\.)(html|php|ini|json|txt|xml|webmanifest|htaccess|js|css|svg|map)$|^\.htaccess$/i;
(function lf(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) lf(p);
    else if (TEXT.test(e.name)) {
      const src = fs.readFileSync(p);
      if (src.includes(13)) fs.writeFileSync(p, src.toString('utf8').replace(/\r\n?/g, '\n'));
    }
  }
})(out);

// 5) ملف مضغوط واحد للرفع (tar في ويندوز 10+ ولينكس وماك يدعم zip)
const zip = path.join(releaseDir, 'iris-store-hosting.zip');
fs.rmSync(zip, { force: true });
try {
  if (process.platform === 'win32') {
    // tar المدمج في ويندوز (bsdtar) وليس tar الخاص بـ Git Bash
    const tar = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
    execFileSync(fs.existsSync(tar) ? tar : 'tar', ['-a', '-c', '-f', zip, '-C', out, '.'], { stdio: 'inherit' });
  } else execFileSync('zip', ['-r', '-q', zip, '.'], { cwd: out, stdio: 'inherit' });
} catch {
  console.warn('! تعذر إنشاء ملف zip؛ ارفع محتوى المجلد release/hosting مباشرة.');
}

const size = (p) => {
  let total = 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true }))
    total += e.isDirectory() ? size(path.join(p, e.name)) : fs.statSync(path.join(p, e.name)).size;
  return total;
};
console.log(`✓ الحزمة جاهزة: ${path.relative(root, out)} (${(size(out) / 1048576).toFixed(1)} MB)`);
if (fs.existsSync(zip)) console.log(`✓ الملف المضغوط: ${path.relative(root, zip)} (${(fs.statSync(zip).size / 1048576).toFixed(1)} MB)`);
if (!pass) console.log('! تذكير: غيّر admin_password في api/config.php قبل أول دخول (انظر DEPLOY.md).');
if (siteUrl) console.log(`✓ النطاق: ${siteUrl}${forceHttps ? ' (تحويل HTTPS مفعّل — لا ترفع الحزمة قبل أن تعمل شهادة SSL)' : ''}`);
else console.log('! بلا IRIS_SITE_URL: الحزمة للتجربة فقط، ويمنع الخادم فهرستها في جوجل. للإطلاق: IRIS_SITE_URL=https://نطاقك npm run package');
