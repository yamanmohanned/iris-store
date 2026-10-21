/**
 * جسر المعالجات المضمّنة القادمة من تصاميم Stitch.
 *
 * يحوّل المحوّل `onclick="toggleFaq(this)"` إلى `data-legacy-onclick="toggleFaq(this)"`.
 * هذا المفسّر (بلا eval) ينفّذ الأنماط الشائعة تلقائياً، وأي دالة خاصة بصفحة
 * تُسجَّل عبر `useLegacy({ toggleFaq(el) {…} })` (انظر hooks/useLegacy.ts).
 */

export type LegacyFn = (el: HTMLElement, ...args: unknown[]) => void;

const registry = new Map<string, LegacyFn>();

export function registerLegacy(fns: Record<string, LegacyFn>): () => void {
  const names = Object.keys(fns);
  names.forEach((n) => registry.set(n, fns[n]));
  return () => names.forEach((n) => registry.delete(n));
}

export interface LegacyServices {
  toast: (message: string, icon?: string) => void;
  back: () => void;
}

/** يقسم النص على `sep` متجاهلاً ما بين علامات الاقتباس والأقواس. */
function splitTop(src: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      cur += ch;
      if (ch === '\\') cur += src[++i] ?? '';
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      cur += ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
      cur += ch;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
      cur += ch;
    } else if (ch === sep && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

function parseArg(raw: string, el: HTMLElement): unknown {
  const s = raw.trim();
  if (s === 'this') return el;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === 'undefined') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  const q = s.match(/^(['"`])([\s\S]*)\1$/);
  if (q) return q[2].replace(/\\(['"`\\])/g, '$1');
  return s;
}

const CLASS_CALL = /^document\.getElementById\((['"])(.+?)\1\)\.classList\.(add|remove|toggle)\(([\s\S]*)\)$/;
const THIS_CLASS_CALL = /^this\.classList\.(add|remove|toggle)\(([\s\S]*)\)$/;

function runStatement(stmt: string, el: HTMLElement, svc: LegacyServices): void {
  const code = stmt.replace(/\?\./g, '.').replace(/^return\s+/, '').trim();
  if (!code || code === 'false' || code === 'event.preventDefault()' || code === 'event.stopPropagation()') return;

  let m = code.match(CLASS_CALL);
  if (m) {
    const target = document.getElementById(m[2]);
    const classes = splitTop(m[4], ',').map((a) => String(parseArg(a, el)));
    if (target) classes.forEach((c) => target.classList[m![3] as 'add' | 'remove' | 'toggle'](c));
    return;
  }
  m = code.match(THIS_CLASS_CALL);
  if (m) {
    const classes = splitTop(m[2], ',').map((a) => String(parseArg(a, el)));
    classes.forEach((c) => el.classList[m![1] as 'add' | 'remove' | 'toggle'](c));
    return;
  }
  if (code === 'this.parentElement.remove()') {
    el.parentElement?.remove();
    return;
  }
  if (code === 'history.back()' || code === 'window.history.back()') {
    svc.back();
    return;
  }
  m = code.match(/^navigator\.clipboard\.writeText\(([\s\S]*)\)$/);
  if (m) {
    const text = String(parseArg(m[1], el));
    void navigator.clipboard?.writeText(text).catch(() => undefined);
    svc.toast('تم النسخ إلى الحافظة', 'content_copy');
    return;
  }
  m = code.match(/^([A-Za-z_$][\w$.]*)\(([\s\S]*)\)$/);
  if (m) {
    const [, name, argSrc] = m;
    const args = splitTop(argSrc, ',').map((a) => parseArg(a, el));
    if (name === 'alert' || name === 'showToast' || name === 'triggerToast') {
      svc.toast(String(args[0] ?? ''), 'check_circle');
      return;
    }
    const fn = registry.get(name);
    if (fn) {
      fn(el, ...args);
      return;
    }
  }
  if (import.meta.env.DEV) console.debug('[legacy] unhandled inline handler:', code);
}

/** ينفّذ نص معالج مضمّن (يدعم عدة جمل مفصولة بـ ;). */
export function runLegacy(code: string, el: HTMLElement, svc: LegacyServices): void {
  for (const stmt of splitTop(code, ';')) {
    try {
      runStatement(stmt, el, svc);
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[legacy] failed:', stmt, err);
    }
  }
}
