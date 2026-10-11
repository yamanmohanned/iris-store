/**
 * HTML (cheerio/domhandler node) → JSX serializer.
 *
 * Pure functions used by convert.mjs. Handles the quirks of exported Stitch pages:
 *   - class/for/tabindex… → React prop names, SVG hyphenated attrs → camelCase
 *   - inline style strings → style objects
 *   - void elements, whitespace semantics, JSX-unsafe text
 *   - input/select/textarea uncontrolled value props
 *   - inline on* handlers are preserved as data-legacy-on* (ported by hand later)
 *   - remote image URLs are rewritten through an injected resolver
 */

export const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const INLINE_TAGS = new Set([
  'a', 'abbr', 'b', 'bdi', 'bdo', 'big', 'button', 'cite', 'code', 'data', 'del', 'dfn', 'em', 'i', 'img', 'input', 'ins', 'kbd', 'label',
  'mark', 'q', 's', 'samp', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'svg', 'textarea', 'time', 'u', 'var', 'br', 'wbr', 'output',
  'picture', 'video', 'audio', 'canvas', 'iframe', 'object', 'embed',
]);

const ATTR_RENAME = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  maxlength: 'maxLength',
  minlength: 'minLength',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  spellcheck: 'spellCheck',
  contenteditable: 'contentEditable',
  crossorigin: 'crossOrigin',
  srcset: 'srcSet',
  fetchpriority: 'fetchPriority',
  inputmode: 'inputMode',
  enterkeyhint: 'enterKeyHint',
  datetime: 'dateTime',
  accesskey: 'accessKey',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  referrerpolicy: 'referrerPolicy',
  usemap: 'useMap',
  charset: 'charSet',
  'http-equiv': 'httpEquiv',
  'accept-charset': 'acceptCharset',
  formaction: 'formAction',
  autoplay: 'autoPlay',
  playsinline: 'playsInline',
  srclang: 'srcLang',
  hreflang: 'hrefLang',
  itemprop: 'itemProp',
  itemtype: 'itemType',
  itemscope: 'itemScope',
  nomodule: 'noModule',
  readonly: 'readOnly',
  novalidate: 'noValidate',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
  'xmlns:xlink': 'xmlnsXlink',
  // SVG attributes that parse5 leaves lowercase on html-namespace fallbacks
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  gradienttransform: 'gradientTransform',
  gradientunits: 'gradientUnits',
  patternunits: 'patternUnits',
  patterntransform: 'patternTransform',
  clippathunits: 'clipPathUnits',
  maskunits: 'maskUnits',
  maskcontentunits: 'maskContentUnits',
  stddeviation: 'stdDeviation',
  basefrequency: 'baseFrequency',
  numoctaves: 'numOctaves',
  startoffset: 'startOffset',
  textlength: 'textLength',
  lengthadjust: 'lengthAdjust',
  spreadmethod: 'spreadMethod',
  tablevalues: 'tableValues',
  keytimes: 'keyTimes',
  keysplines: 'keySplines',
  repeatcount: 'repeatCount',
  repeatdur: 'repeatDur',
};

const BOOLEAN_PROPS = new Set([
  'disabled', 'hidden', 'required', 'readOnly', 'autoFocus', 'multiple', 'open', 'noValidate', 'itemScope', 'allowFullScreen', 'autoPlay',
  'playsInline', 'controls', 'loop', 'muted', 'default', 'async', 'defer', 'reversed', 'inert', 'noModule',
]);

const VALUE_KEEP_INPUT_TYPES = new Set(['checkbox', 'radio', 'submit', 'button', 'reset', 'image', 'hidden']);

/** React types these props as numbers, so integer literals must be emitted as {N}. */
const NUMERIC_PROPS = new Set(['rows', 'cols', 'maxLength', 'minLength', 'colSpan', 'rowSpan', 'tabIndex', 'size', 'span', 'start']);

export const jsStr = (s) => JSON.stringify(s);

/**
 * Binding markers (see convert.mjs `applyBindings`):
 *   EXPR_OPEN expr EXPR_CLOSE   inline expression inside text / attribute values
 *   RAW_OPEN code RAW_CLOSE     a text node emitted verbatim (.map()/&& wrappers, embedded components)
 */
export const EXPR_OPEN = '';
export const EXPR_CLOSE = '';
export const RAW_OPEN = '';
export const RAW_CLOSE = '';

const EXPR_RE = /([\s\S]*?)/g;
const hasExpr = (v) => typeof v === 'string' && v.includes(EXPR_OPEN);

/** attribute value containing expression markers → JSX attribute value */
function exprAttrValue(v) {
  const whole = v.match(/^([\s\S]*?)$/);
  if (whole && !whole[1].includes(EXPR_OPEN)) return `{${whole[1]}}`;
  const tpl = v.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(EXPR_RE, (_, e) => '${' + e + '}');
  return '{`' + tpl + '`}';
}

const needsStringLiteral = (t) => /[{}<>&]/.test(t) || /^ | $/.test(t);

/** text containing expression markers → JSX children string */
function exprText(t) {
  let out = '';
  let last = 0;
  for (const m of t.matchAll(EXPR_RE)) {
    const lit = t.slice(last, m.index);
    if (lit) out += needsStringLiteral(lit) ? `{${jsStr(lit)}}` : lit;
    out += `{${m[1]}}`;
    last = m.index + m[0].length;
  }
  const tail = t.slice(last);
  if (tail) out += needsStringLiteral(tail) ? `{${jsStr(tail)}}` : tail;
  return out;
}

const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

function cssPropToReact(prop) {
  const p = prop.trim();
  if (p.startsWith('--')) return jsStr(p);
  const lower = p.toLowerCase();
  if (lower.startsWith('-ms-')) return 'ms' + camel(lower.slice(3)).replace(/^./, (c) => c.toUpperCase());
  if (lower.startsWith('-webkit-')) return 'Webkit' + camel(lower.slice(7)).replace(/^./, (c) => c.toUpperCase());
  if (lower.startsWith('-moz-')) return 'Moz' + camel(lower.slice(4)).replace(/^./, (c) => c.toUpperCase());
  return camel(lower);
}

/** Split a CSS declaration list on ';' that are not inside quotes or parentheses. */
export function splitDecls(css) {
  const out = [];
  let cur = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    if (quote) {
      cur += ch;
      if (ch === quote && css[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
    } else if (ch === '(') {
      depth++;
      cur += ch;
    } else if (ch === ')') {
      depth--;
      cur += ch;
    } else if (ch === ';' && depth === 0) {
      if (cur.trim()) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

export function styleToObject(css, rewriteUrls) {
  const entries = [];
  for (const decl of splitDecls(css)) {
    const idx = decl.indexOf(':');
    if (idx < 0) continue;
    const prop = decl.slice(0, idx);
    let val = decl.slice(idx + 1).trim().replace(/\s*!important\s*$/i, '');
    if (rewriteUrls) val = rewriteUrls(val);
    entries.push(`${cssPropToReact(prop)}: ${jsStr(val)}`);
  }
  return entries.length ? `{{ ${entries.join(', ')} }}` : null;
}

const needsExprText = (t) => /[{}<>&]/.test(t);

function textOf(node) {
  return node.data ?? '';
}

function isElement(n) {
  return n && (n.type === 'tag' || n.type === 'script' || n.type === 'style');
}

function isInlineish(n) {
  if (!n) return false;
  if (n.type === 'text') return textOf(n).trim() !== '';
  if (n.type === 'tag') return INLINE_TAGS.has(n.name);
  return false;
}

/**
 * @param {object} node  domhandler node
 * @param {object} ctx   { rewriteUrls(str)->str, report, inSvg, inPre }
 */
export function serialize(node, ctx = {}) {
  switch (node.type) {
    case 'text':
      return serializeText(node, ctx);
    case 'comment':
    case 'directive':
    case 'cdata':
      return '';
    case 'script':
    case 'style':
      return '';
    case 'tag':
      return serializeElement(node, ctx);
    default:
      return '';
  }
}

export function serializeChildren(parent, ctx) {
  const kids = (parent.children || []).filter((c) => !(c.type === 'script' || c.type === 'style' || c.type === 'comment'));
  const out = [];
  for (let i = 0; i < kids.length; i++) {
    const n = kids[i];
    if (n.type === 'text') {
      const raw = textOf(n);
      if (raw.startsWith(RAW_OPEN) && raw.endsWith(RAW_CLOSE)) {
        out.push(raw.slice(1, -1));
        continue;
      }
      if (hasExpr(raw)) {
        out.push(exprText(raw.replace(/[ \t\r\n\f]+/g, ' ')));
        continue;
      }
      if (ctx.inPre) {
        out.push(raw ? `{${jsStr(raw)}}` : '');
        continue;
      }
      const collapsed = raw.replace(/[ \t\r\n\f]+/g, ' ');
      if (collapsed.trim() === '') {
        const prev = kids[i - 1];
        const next = kids[i + 1];
        if (prev && next && isInlineish(prev) && isInlineish(next)) out.push('{" "}');
        continue;
      }
      let t = collapsed;
      const prev = kids[i - 1];
      const next = kids[i + 1];
      if (!prev || (prev.type === 'tag' && !INLINE_TAGS.has(prev.name))) t = t.replace(/^ /, '');
      if (!next || (next.type === 'tag' && !INLINE_TAGS.has(next.name))) t = t.replace(/ $/, '');
      if (t === '') continue;
      if (needsExprText(t) || /^ | $/.test(t)) out.push(`{${jsStr(t)}}`);
      else out.push(t);
    } else {
      const s = serialize(n, ctx);
      if (s) out.push(s);
    }
  }
  return out.join('');
}

function serializeText(node, ctx) {
  const t = textOf(node).replace(/[ \t\r\n\f]+/g, ' ');
  if (t.trim() === '') return '';
  return needsExprText(t) ? `{${jsStr(t)}}` : t;
}

/** attributes that only existed to carry Stitch routing hints / scripted state */
const DROP_ATTRS = new Set(['data-path', 'data-active-classes', 'data-nav', 'data-state']);

function attrsOf(node, ctx, opts = {}) {
  const { name: tag } = node;
  const attribs = node.attribs || {};
  const out = [];
  const inSvg = ctx.inSvg || tag === 'svg';
  const inputType = (attribs.type || '').toLowerCase();

  // select: lift selected option to defaultValue
  let selectDefault = null;
  if (tag === 'select') {
    const opts = (node.children || []).flatMap((c) => (c.type === 'tag' && c.name === 'optgroup' ? c.children || [] : [c])).filter((c) => c.type === 'tag' && c.name === 'option');
    const sel = opts.find((o) => 'selected' in (o.attribs || {}));
    if (sel) {
      const v = sel.attribs.value ?? collectText(sel).trim();
      selectDefault = v;
    }
  }

  for (const [rawName, rawValue] of Object.entries(attribs)) {
    let name = rawName;
    let value = rawValue;

    if (ctx.dropRoutingAttrs !== false && DROP_ATTRS.has(name)) continue;
    if (opts.skip && opts.skip.has(name)) continue;

    // inline event handlers → keep as data-legacy-on*
    if (/^on[a-z]+$/.test(name)) {
      ctx.report?.handlers?.push({ tag, event: name, code: value });
      out.push(`data-legacy-${name}=${'{'}${jsStr(value)}${'}'}`);
      continue;
    }

    if (tag === 'option' && name === 'selected') continue;

    // value → defaultValue for uncontrolled form controls
    if (name === 'value' && (tag === 'input' || tag === 'textarea' || tag === 'select')) {
      if (tag === 'input' && VALUE_KEEP_INPUT_TYPES.has(inputType)) {
        // keep value
      } else {
        name = 'defaultValue';
        out.push(`defaultValue=${jsStr(rewrite(value, ctx))}`);
        continue;
      }
    }
    if (name === 'checked') {
      out.push('defaultChecked');
      continue;
    }

    if (name === 'style') {
      const obj = styleToObject(value, (v) => rewrite(v, ctx));
      if (obj) out.push(`style=${obj}`);
      continue;
    }

    let prop = ATTR_RENAME[name] ?? name;
    if (prop === name && inSvg && name.includes('-') && !/^(aria|data)-/.test(name)) prop = camel(name);
    if (prop === name && name.includes(':')) prop = camel(name.replace(':', '-'));

    if (BOOLEAN_PROPS.has(prop) && (value === '' || value === name || value === 'true')) {
      out.push(prop);
      continue;
    }

    if (prop === 'className') value = value.replace(/\s+/g, ' ').trim();
    value = rewrite(value, ctx);
    if (tag === 'img' && name === 'src' && ctx.imgSrc) value = ctx.imgSrc(value, attribs);

    if (tag === 'img' && name === 'src') ctx.report?.images?.add(value);
    if (tag === 'a' && name === 'href') ctx.report?.hrefs?.push(value);

    if (hasExpr(value)) {
      out.push(`${prop}=${exprAttrValue(value)}`);
      continue;
    }

    if (NUMERIC_PROPS.has(prop) && /^-?\d+$/.test(value)) {
      out.push(`${prop}={${value}}`);
      continue;
    }

    if (/["&{}\\\n\r<>]/.test(value)) out.push(`${prop}={${jsStr(value)}}`);
    else out.push(`${prop}="${value}"`);
  }
  if (selectDefault !== null) out.push(`defaultValue=${jsStr(selectDefault)}`);
  return out;
}

function rewrite(value, ctx) {
  return ctx.rewriteUrls ? ctx.rewriteUrls(value) : value;
}

export function collectText(node) {
  if (node.type === 'text') return node.data ?? '';
  return (node.children || []).map(collectText).join('');
}

function serializeElement(node, ctx) {
  const tag = node.name;
  if (['script', 'style', 'meta', 'link', 'title', 'noscript', 'base'].includes(tag)) return '';
  const childCtx = { ...ctx, inSvg: ctx.inSvg || tag === 'svg', inPre: ctx.inPre || tag === 'pre' };

  // anchors → react-router <Link> (or hardened external <a>)
  if (tag === 'a' && ctx.mapLink) {
    const mapped = ctx.mapLink(node);
    if (mapped && mapped.to) {
      const attrs = attrsOf(node, ctx, { skip: new Set(['href', 'target', 'rel']) });
      ctx.usedComponents?.add('Link');
      const attrStr = ` to=${jsStr(mapped.to)}${attrs.length ? ' ' + attrs.join(' ') : ''}`;
      const inner = serializeChildren(node, childCtx);
      return inner === '' ? `<Link${attrStr} />` : `<Link${attrStr}>${inner}</Link>`;
    }
    if (mapped && mapped.external) {
      const attrs = attrsOf(node, ctx, { skip: new Set(['target', 'rel']) });
      const extra = mapped.blank ? ' target="_blank" rel="noreferrer"' : '';
      const attrStr = (attrs.length ? ' ' + attrs.join(' ') : '') + extra;
      const inner = serializeChildren(node, childCtx);
      return inner === '' ? `<a${attrStr} />` : `<a${attrStr}>${inner}</a>`;
    }
  }

  const attrs = attrsOf(node, ctx);
  const attrStr = attrs.length ? ' ' + attrs.join(' ') : '';
  if (VOID_TAGS.has(tag)) return `<${tag}${attrStr} />`;

  // textarea: text content → defaultValue
  if (tag === 'textarea') {
    const txt = collectText(node);
    const extra = txt.trim() ? ` defaultValue=${jsStr(txt.replace(/^\n/, ''))}` : '';
    return `<textarea${attrStr}${extra} />`;
  }

  const inner = serializeChildren(node, childCtx);
  if (inner === '') return `<${tag}${attrStr} />`;
  return `<${tag}${attrStr}>${inner}</${tag}>`;
}
