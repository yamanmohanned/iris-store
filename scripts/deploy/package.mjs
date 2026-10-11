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
 * اختياري: IRIS_ADMIN_USER و IRIS_ADMIN_PASSWORD لكتابة بيانات دخول المالك في api/config.php مباشرة.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

// 2) إعدادات الخادم + مجلد الصور
copy(path.join(root, 'server/hosting'), out);

// 3) واجهة PHP + الكتالوج الأولي
copy(path.join(root, 'server/api'), path.join(out, 'api'));
fs.copyFileSync(path.join(root, 'src/data/seed.json'), path.join(out, 'api/data/catalog.seed.json'));

// 4) بيانات دخول المالك (اختياري)
const user = process.env.IRIS_ADMIN_USER;
const pass = process.env.IRIS_ADMIN_PASSWORD;
if (pass) {
  if (pass.length < 8) {
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
