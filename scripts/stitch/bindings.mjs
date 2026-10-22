/**
 * Declarative data-binding for converted Stitch screens.
 *
 * A page config may carry `bind: [ rule, … ]`. Rules run on the cheerio DOM *before* JSX
 * serialisation, so the generated component stays one-to-one with the design while its
 * dynamic parts become React expressions.
 *
 * Expressions are written between ⟦ ⟧ (e.g. 'طلب #⟦order.id⟧').
 *
 * Rule fields (sel is required):
 *   sel          CSS selector (cheerio) – matches may be many
 *   first        true → only the first match;  nth: n → only the n-th (0-based)
 *   text         replace all children with this text
 *   swap         [[from, to], …]  string replacement inside descendant text nodes
 *   attr         { name: value } set/override attributes (value may contain ⟦ ⟧; a lone ⟦expr⟧ → {expr})
 *   class        replace the class attribute with a static string
 *   classExpr    class attribute as an expression: "cn('a', ⟦cond⟧ && 'b')" → className={…}
 *   addClass / removeClass   space separated
 *   remove       true → delete the element
 *   replace      raw JSX replacing the element (e.g. '<ProductGrid items={items} />')
 *   before/after raw JSX inserted as siblings
 *   if           expression → element rendered only when truthy
 *   repeat       { of, as, index?, key? } → first match becomes the template of `of.map(as => …)`
 *   optional     true → no warning when nothing matches
 */
import { Text } from 'domhandler';
import { EXPR_CLOSE, EXPR_OPEN, RAW_CLOSE, RAW_OPEN } from './jsx.mjs';

export const mark = (s) => String(s).replace(/⟦([\s\S]*?)⟧/g, `${EXPR_OPEN}$1${EXPR_CLOSE}`);
const rawNode = (code) => new Text(`${RAW_OPEN}${code}${RAW_CLOSE}`);

function textNodes(el, out = []) {
  for (const c of el.children || []) {
    if (c.type === 'text') out.push(c);
    else if (c.type === 'tag') textNodes(c, out);
  }
  return out;
}

export function applyBindings($, rules, label, warn = console.warn) {
  for (const rule of rules) {
    let matched = $(rule.sel).toArray();
    if (rule.first) matched = matched.slice(0, 1);
    if (typeof rule.nth === 'number') matched = matched.slice(rule.nth, rule.nth + 1);
    if (matched.length === 0) {
      if (!rule.optional) warn(`  ! [${label}] selector matched nothing: ${rule.sel}`);
      continue;
    }

    for (const el of matched) {
      const $el = $(el);

      if (rule.text !== undefined) $el.empty().append(new Text(mark(rule.text)));

      if (rule.swap) {
        for (const tn of textNodes(el)) {
          let d = tn.data;
          for (const [from, to] of rule.swap) d = d.split(from).join(mark(to));
          tn.data = d;
        }
      }

      if (rule.attr) {
        for (const [k, v] of Object.entries(rule.attr)) {
          // overriding a converted inline handler: drop the original on* attribute
          if (k.startsWith('data-legacy-')) delete el.attribs[k.slice('data-legacy-'.length)];
          el.attribs[k] = mark(v);
        }
      }
      if (rule.class !== undefined) el.attribs.class = rule.class;
      if (rule.classExpr !== undefined) el.attribs.class = mark(rule.classExpr);
      if (rule.addClass) {
        const set = new Set((el.attribs.class || '').split(/\s+/).filter(Boolean));
        rule.addClass.split(/\s+/).forEach((c) => set.add(c));
        el.attribs.class = [...set].join(' ');
      }
      if (rule.removeClass) {
        const drop = new Set(rule.removeClass.split(/\s+/));
        el.attribs.class = (el.attribs.class || '')
          .split(/\s+/)
          .filter((c) => c && !drop.has(c))
          .join(' ');
      }
      if (rule.before) $el.before(rawNode(rule.before));
      if (rule.after) $el.after(rawNode(rule.after));
      if (rule.remove) {
        $el.remove();
        continue;
      }
      if (rule.replace !== undefined) {
        $el.replaceWith(rawNode(rule.replace));
        continue;
      }
    }

    // structural wrappers (apply to the surviving elements)
    if (rule.repeat) {
      const { of, as, index, key } = rule.repeat;
      const [first, ...rest] = matched.filter((m) => $(m).closest('html').length);
      if (first) {
        rest.forEach((r) => $(r).remove());
        if (key) first.attribs.key = mark(`⟦${key}⟧`);
        const args = index ? `(${as}, ${index})` : `(${as})`;
        $(first).before(rawNode(`{${of}.map(${args} => (`));
        $(first).after(rawNode('))}'));
      }
    }
    if (rule.if) {
      for (const el of matched) {
        if (!$(el).closest('html').length) continue;
        $(el).before(rawNode(`{${rule.if} && (`));
        $(el).after(rawNode(')}'));
      }
    }
  }
}
