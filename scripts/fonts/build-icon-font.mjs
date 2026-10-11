#!/usr/bin/env node
/**
 * يولّد خط أيقونات Material Symbols المقتطع (public/fonts/material-symbols-outlined.woff2)
 * من الأيقونات المستخدمة فعلاً في الكود فقط — 40KB تقريباً بدل 4MB لو حُمّل الخط كاملاً من Google.
 *
 *   npm run icons            يعيد التوليد (يحتاج إنترنت)
 *   npm run icons -- --check يتحقق فقط أن كل أيقونة مستخدمة موجودة في القائمة المحفوظة
 *
 * القائمة المحفوظة: scripts/fonts/icons.txt (للمراجعة في git).
 * الأيقونة تُكتب في الكود كنص: <Icon name="search" /> أو <span className="material-symbols-outlined">search</span>
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT_FONT = path.join(ROOT, 'public/fonts/material-symbols-outlined.woff2');
const LIST = path.join(ROOT, 'scripts/fonts/icons.txt');
const CODEPOINTS =
  'https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints';
// المحور الوحيد المتغير: FILL (أيقونات ممتلئة)؛ الوزن 400 والحجم البصري 24 ثابتان
const AXES = 'opsz,wght,FILL,GRAD@24,400,0..1,0';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function sourceFiles() {
  const files = [path.join(ROOT, 'index.html')];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|json)$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(ROOT, 'src'));
  return files;
}

/** الأسماء المرشحة: نص داخل عناصر الأيقونات، وقيم name/icon، وأي نص بين علامتي تنصيص يطابق اسم أيقونة. */
function collect(valid) {
  const strict = new Set();
  const literal = new Set();
  for (const f of sourceFiles()) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</g)) strict.add(m[1]);
    for (const m of s.matchAll(/\b(?:name|icon)\s*[:=]\s*\{?\s*['"]([a-z0-9_]+)['"]/g)) strict.add(m[1]);
    // أيقونة الإشعار: toast.show('…', 'favorite')
    for (const m of s.matchAll(/\.show\([^;]*?,\s*['"]([a-z0-9_]+)['"]\s*\)/g)) strict.add(m[1]);
    for (const m of s.matchAll(/['"`]([a-z][a-z0-9_]{1,40})['"`]/g)) if (!valid || valid.has(m[1])) literal.add(m[1]);
  }
  return { strict, literal };
}

const check = process.argv.includes('--check');
const saved = fs.existsSync(LIST) ? new Set(fs.readFileSync(LIST, 'utf8').split(/\s+/).filter(Boolean)) : new Set();

if (check) {
  const { strict } = collect(null);
  const missing = [...strict].filter((n) => !saved.has(n) && !/^(metal|username|payment_method|drawer|payment_mode|full_name|phone_number|email_address|family|settlement_option|viewport)$/.test(n));
  if (missing.length) {
    console.error(`أيقونات غير موجودة في الخط المقتطع: ${missing.join(', ')}\nشغّل: npm run icons`);
    process.exit(1);
  }
  console.log(`✓ كل الأيقونات المستخدمة (${strict.size}) موجودة في الخط`);
  process.exit(0);
}

const cpText = await (await fetch(CODEPOINTS)).text();
const valid = new Set(cpText.split(/\r?\n/).map((l) => l.split(' ')[0]).filter(Boolean));
const { strict, literal } = collect(valid);
const unknown = [...strict].filter((n) => !valid.has(n));
if (unknown.length) console.warn('تنبيه — أسماء ليست أيقونات (تُتجاهل):', unknown.join(', '));
const names = [...new Set([...strict, ...literal])].filter((n) => valid.has(n)).sort();

const cssUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:${AXES}&icon_names=${names.join(',')}&display=block`;
const css = await (await fetch(cssUrl, { headers: { 'User-Agent': UA } })).text();
const fontUrl = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!fontUrl) throw new Error('لم يُعثر على رابط الخط في استجابة Google Fonts:\n' + css.slice(0, 300));
const buf = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
fs.writeFileSync(OUT_FONT, buf);
fs.writeFileSync(LIST, names.join('\n') + '\n');
console.log(`✓ ${names.length} أيقونة → ${path.relative(ROOT, OUT_FONT)} (${(buf.length / 1024).toFixed(1)}KB)`);
