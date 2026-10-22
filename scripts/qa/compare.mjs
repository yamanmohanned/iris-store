#!/usr/bin/env node
/**
 * Pixel-compare two directories of PNG screenshots produced by shoot.mjs.
 *
 * Usage: node scripts/qa/compare.mjs <baselineDir> <candidateDir> [--diff <diffDir>] [--top 25]
 */
import fs from 'node:fs';
import path from 'node:path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'design/stitch/manifest.json'), 'utf8'));
const titleOf = Object.fromEntries(manifest.map((m) => [m.id, (m.title || '').replace(/^IRIS \| /, '')]));

const [base, cand, ...rest] = process.argv.slice(2);
let diffDir = null;
let top = 25;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--diff') diffDir = path.resolve(rest[++i]);
  else if (rest[i] === '--top') top = +rest[++i];
}
if (diffDir) fs.mkdirSync(diffDir, { recursive: true });

const files = fs.readdirSync(cand).filter((f) => f.endsWith('.png'));
const rows = [];
for (const f of files) {
  const bp = path.join(base, f);
  if (!fs.existsSync(bp)) continue;
  const a = PNG.sync.read(fs.readFileSync(bp));
  const b = PNG.sync.read(fs.readFileSync(path.join(cand, f)));
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const crop = (img) => {
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(img, out, 0, 0, w, h, 0, 0);
    return out;
  };
  const ca = crop(a);
  const cb = crop(b);
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(ca.data, cb.data, diff.data, w, h, { threshold: 0.12 });
  const pct = (n / (w * h)) * 100;
  rows.push({ id: f.replace('.png', ''), pct, hBase: a.height, hCand: b.height, wBase: a.width, wCand: b.width });
  if (diffDir && pct > 0.5) fs.writeFileSync(path.join(diffDir, f), PNG.sync.write(diff));
}
rows.sort((x, y) => y.pct - x.pct);
const avg = rows.reduce((s, r) => s + r.pct, 0) / (rows.length || 1);
console.log(`compared ${rows.length} pages | mean diff ${avg.toFixed(2)}%`);
console.log('id      diff%   height(base→cand)  title');
for (const r of rows.slice(0, top)) {
  const dh = r.hCand - r.hBase;
  console.log(`${r.id.slice(0, 6)}  ${r.pct.toFixed(2).padStart(6)}  ${String(r.hBase).padStart(5)}→${String(r.hCand).padEnd(5)} ${dh ? `(${dh > 0 ? '+' : ''}${dh})` : '    '}  ${titleOf[r.id] || ''}`);
}
