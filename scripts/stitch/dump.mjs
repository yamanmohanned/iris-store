#!/usr/bin/env node
/**
 * Pretty-print a fragment of a Stitch screen.
 * Usage: node scripts/stitch/dump.mjs <id-prefix> <css-selector> [--n 1] [--max 20000]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as cheerio from 'cheerio';
import prettier from 'prettier';
import { loadManifest } from './convert.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const [prefix, selector, ...rest] = process.argv.slice(2);
let nth = 0;
let max = 20000;
for (let i = 0; i < rest.length; i++) {
  if (rest[i] === '--n') nth = +rest[++i] - 1;
  if (rest[i] === '--max') max = +rest[++i];
}
const m = loadManifest().find((x) => x.id.startsWith(prefix));
if (!m) {
  console.error('no such screen');
  process.exit(1);
}
const $ = cheerio.load(fs.readFileSync(path.join(ROOT, 'design/stitch', m.html), 'utf8'));
const el = $(selector).eq(nth);
if (!el.length) {
  console.error('selector matched nothing');
  process.exit(1);
}
const html = $.html(el);
const pretty = await prettier.format(html, { parser: 'html', printWidth: 160, htmlWhitespaceSensitivity: 'ignore' });
console.log(pretty.length > max ? pretty.slice(0, max) + '\n… (truncated)' : pretty);
