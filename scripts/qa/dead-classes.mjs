#!/usr/bin/env node
/**
 * يكتشف أصناف Tailwind المكتوبة في الكود ولا يولّد لها Tailwind أي CSS (تُتجاهل بصمت):
 * مثل text-headline-lg-mobile قبل إضافته للتوكنز، أو shadow-xs من Tailwind 4.
 * هذه الأصناف كانت سبب اختلاف أحجام الخطوط والظلال بين الصفحات.
 *
 *   node scripts/qa/dead-classes.mjs          يفشل (exit 1) إن وُجد صنف ميت
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const loadConfig = require('tailwindcss/loadConfig');

// كلمات تظهر داخل نصوص الكود وليست أصنافاً
const IGNORE = new Set(['text', 'from', 'col', 'order', 'animate-in', 'outline-variant', 'order-number-val']);

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.tsx$/.test(e.name)) files.push(p);
  }
};
walk(path.join(ROOT, 'src'));

const tokenUse = new Map();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)) {
    const str = m[2];
    if (!/[a-z]-/.test(str) || str.length > 2000) continue;
    for (const t of str.split(/\s+/)) {
      if (!t || t.includes('${') || /[^\w\-:/.[\]()#%,'!&>*@+=~]/.test(t) || !/^!?-?[a-z@[]/.test(t)) continue;
      if (!tokenUse.has(t)) tokenUse.set(t, new Set());
      tokenUse.get(t).add(path.relative(ROOT, f));
    }
  }
}
const tokens = [...tokenUse.keys()];

const config = loadConfig(path.join(ROOT, 'tailwind.config.ts'));
const { css } = await postcss([tailwind({ ...config, content: [{ raw: tokens.join(' '), extension: 'html' }] })]).process(
  '@tailwind base; @tailwind components; @tailwind utilities;',
  { from: undefined },
);
const unesc = (x) => x.replace(/\\([0-9a-fA-F]{1,6}) ?/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/\\(.)/g, '$1');
const generated = new Set();
for (const m of css.matchAll(/\.((?:[\w-]|\\[0-9a-fA-F]{1,6} ?|\\.)+)/g)) generated.add(unesc(m[1]));
const ownCss = ['src/styles/index.css', 'src/styles/effects.css'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');

const UTILITY =
  /^(!?-?)([a-z0-9-]+:)*(text|font|leading|tracking|bg|from|via|to|border|ring|shadow|rounded|p[xytrbls]?|m[xytrbls]?|w|h|min|max|gap|space|top|left|right|bottom|inset|z|opacity|grid|col|row|items|justify|self|place|object|aspect|translate|scale|rotate|blur|backdrop|decoration|underline|outline|divide|animate|duration|ease|delay|cursor|select|whitespace|shrink|grow|basis)(-|$)/;
const dead = tokens.filter((t) => {
  const base = t.replace(/^!/, '');
  if (IGNORE.has(base) || generated.has(base) || !UTILITY.test(base)) return false;
  if (/^space-(xs|sm|md|lg|xl|2xl|3xl)$/.test(base)) return false; // أسماء توكنز المسافات نفسها
  return !ownCss.includes('.' + base.split(':').pop());
});

if (dead.length) {
  console.error('أصناف Tailwind بلا أثر (لا تولّد CSS):');
  for (const t of dead.sort()) console.error(`  ${t.padEnd(36)} ${[...tokenUse.get(t)].join(', ')}`);
  process.exit(1);
}
console.log(`✓ لا توجد أصناف Tailwind ميتة (${tokens.length} صنفاً مفحوصاً)`);
