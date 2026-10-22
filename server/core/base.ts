/**
 * أساسيات خادم آيريس المشترك (Netlify وخادم التطوير): أنواع التخزين، الأخطاء، الاستجابات.
 * نفس عقد واجهة PHP في server/api/index.php — أي تغيير في المسارات يجب أن يُطبّق هناك أيضاً.
 */
import { createHash } from 'node:crypto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>;

/** تخزين مفتاح/قيمة: Netlify Blobs في النشر، وملفات .dev-data أثناء التطوير، وذاكرة في الاختبارات. */
export interface Kv {
  getJSON(key: string): Promise<Json | null>;
  setJSON(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  getFile(key: string): Promise<{ data: ArrayBuffer; type: string } | null>;
  setFile(key: string, data: ArrayBuffer, type: string): Promise<void>;
  deleteFile(key: string): Promise<void>;
  listFiles(): Promise<string[]>;
}

export interface Env {
  /** اسم دخول المالك (الافتراضي owner) */
  user?: string;
  /** كلمة مرور المالك قبل أن يغيّرها من اللوحة */
  password?: string;
  /** اسم يظهر في الاستجابة health */
  server?: string;
  /** أقصى حجم لفيديو يُرفع يدوياً (طلبات Netlify Functions محدودة بحوالي 6MB) */
  maxVideoUpload?: number;
}

/** مداخل يمكن استبدالها في الاختبارات (طلبات إنستغرام). */
export interface Deps {
  fetch: typeof fetch;
}

export class Fail extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function fail(message: string, status = 400): never {
  throw new Fail(message, status);
}

export const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** ترويسات كل استجابة JSON: لا تخزين، لا تخمين للنوع، ولا عرض داخل صفحة أخرى (مثل iris_bootstrap في PHP). */
export const API_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Referrer-Policy': 'same-origin',
};

export function json(status: number, data: Json, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...API_HEADERS, ...headers } });
}

export const ok = (data: Json = {}, headers?: Record<string, string>) => json(200, { ok: true, ...data }, headers);

/** جسم JSON: 4 ميغابايت للوحة (حفظ الكتالوج)، و64 كيلوبايت للمسارات العامة (دخول، طلب، تتبع) — يقابل iris_body في PHP. */
export const BODY_MAX = 4 * 1024 * 1024;
export const PUBLIC_BODY_MAX = 64 * 1024;

export async function readBody(req: Request, max = BODY_MAX): Promise<Json> {
  const text = await req.text().catch(() => '');
  if (text.length > max) throw new Fail('حجم البيانات المرسلة كبير جداً.', 413);
  try {
    const b = JSON.parse(text);
    return b && typeof b === 'object' && !Array.isArray(b) ? (b as Json) : {};
  } catch {
    return {};
  }
}

/** رمز الجلسة من ملف تعريف الارتباط IRISADMIN. */
export function sessionToken(req: Request): string | null {
  return /(?:^|;\s*)IRISADMIN=([a-f0-9]{48})/.exec(req.headers.get('cookie') ?? '')?.[1] ?? null;
}

/**
 * حد بسيط للمحاولات (مثل iris_rate_limit في PHP). يعيد true عند تجاوز الحد.
 * ip هو صاحب العدّاد: عنوان IP عادةً، أو `user:<اسم>` لعدّاد حساب واحد.
 */
export async function rateLimited(kv: Kv, bucket: string, ip: string, max: number, windowSec: number, hit: boolean): Promise<boolean> {
  const key = `rate/${bucket}/${sha(ip || 'unknown').slice(0, 24)}`;
  const now = Math.floor(Date.now() / 1000);
  const rec = (await kv.getJSON(key)) as { count: number; until: number } | null;
  const live = rec && rec.until > now ? rec : { count: 0, until: now + windowSec };
  if (hit) await kv.setJSON(key, { count: live.count + 1, until: live.until });
  return live.count >= max;
}

export async function clearRate(kv: Kv, bucket: string, ip: string): Promise<void> {
  await kv.delete(`rate/${bucket}/${sha(ip || 'unknown').slice(0, 24)}`);
}
