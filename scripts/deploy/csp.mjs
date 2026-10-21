/**
 * ترويسات أمان الواجهة وسياسة أمان المحتوى (CSP) — مصدر واحد لثلاثة أماكن:
 *   - الاستضافة: package.mjs يكتبها في .htaccess مكان السطر «# @iris-security-headers»
 *   - Netlify:   netlify.mjs يكتبها في dist/_headers
 *   - المعاينة:  vite.config.ts (vite preview) لتجربة البناء محلياً بنفس القيود
 *
 * السكربتات المضمّنة في index.html (سكربت الإقلاع) تُسمح ببصمتها sha256 فقط، فأي سكربت يُحقن
 * في الصفحة لا يعمل. المصادر الخارجية الوحيدة: MediaPipe لفحص الأشخاص في الاستيراد من إنستغرام
 * (jsDelivr + نماذج Google) وصور/فيديو إنستغرام نفسها.
 */
import { createHash } from 'node:crypto';

/** بصمات السكربتات المضمّنة (بلا src) في صفحة مبنية. */
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => `'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`,
  );
}

export function contentSecurityPolicy(html) {
  return [
    "default-src 'self'",
    // wasm-unsafe-eval: تشغيل WebAssembly لـ MediaPipe فقط (لا eval لنصوص JavaScript)
    `script-src 'self' ${inlineScriptHashes(html).join(' ')} https://cdn.jsdelivr.net 'wasm-unsafe-eval'`,
    // React والهوية (الخطوط المرفوعة) تضع أنماطاً مضمّنة
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://cdn.jsdelivr.net https://storage.googleapis.com https://*.cdninstagram.com https://*.fbcdn.net",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** ترويسات ثابتة لكل صفحة (HSTS يُضاف فقط حين يعمل الموقع على HTTPS). */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const HSTS = 'max-age=31536000';

/** كل الترويسات لصفحة مبنية (index.html الناتج). */
export function pageHeaders(html) {
  return { ...SECURITY_HEADERS, 'Content-Security-Policy': contentSecurityPolicy(html) };
}
