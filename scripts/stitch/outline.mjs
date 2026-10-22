#!/usr/bin/env node
/**
 * Print the top-level structure of Stitch screens (what lives directly under <body> / wrapper divs).
 * Usage: node scripts/stitch/outline.mjs <id-prefix> [...] [--depth 2]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { bodyContentNodes, loadManifest } from './convert.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
let depth = 1;
const prefixes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--depth') depth = +args[++i];
  else prefixes.push(args[i]);
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
function describe($, el, indent, d) {
  const cls = clip((el.attribs?.class || '').replace(/\s+/g, ' '), 70);
  const id = el.attribs?.id ? '#' + el.attribs.id : '';
  const text = clip($(el).text().replace(/\s+/g, ' ').trim(), 50);
  const len = $.html(el).length;
  console.log(`${indent}<${el.name}${id}> ${len}ch  .${cls}  « ${text} »`);
  if (d > 1) {
    for (const c of el.children || []) {
      if (c.type === 'tag' && !['script', 'style'].includes(c.name)) describe($, c, indent + '    ', d - 1);
    }
  }
}

for (const m of loadManifest()) {
  if (prefixes.length && !prefixes.some((p) => m.id.startsWith(p))) continue;
  const html = fs.readFileSync(path.join(ROOT, 'design/stitch', m.html), 'utf8');
  const $ = cheerio.load(html);
  console.log(`\n=== ${m.id.slice(0, 8)} ${m.width < 1000 ? '[M]' : '[D]'} ${(m.title || '').replace('IRIS | ', '')}`);
  console.log(`    body.class: ${clip(($('body').attr('class') || '').replace(/\s+/g, ' '), 110)}`);
  for (const n of bodyContentNodes($)) {
    if (n.type === 'tag') describe($, n, '  ', depth);
    else console.log('  (text)', clip((n.data || '').trim(), 40));
  }
}
