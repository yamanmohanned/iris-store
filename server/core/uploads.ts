/**
 * رفع الملفات وتقديمها: صور، شعار، خطوط، فيديو. النوع يُعرف من أول بايتات الملف لا من اسمه.
 * الملفات تُحفظ بأسماء عشوائية تحت YYYY/MM/ (والخطوط تحت fonts/) وتُقدَّم من /uploads/.
 */
import { randomBytes } from 'node:crypto';
import { fail, type Kv } from './base.ts';

export type UploadKind = 'image' | 'logo' | 'font' | 'video';
type Family = 'image' | 'font' | 'video';

interface Sniffed {
  ext: string;
  type: string;
  family: Family;
}

const MB = 1024 * 1024;
export const UPLOAD_LIMITS: Record<Family, number> = { image: 8 * MB, font: 5 * MB, video: 40 * MB };

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/** يتعرّف على نوع الملف من توقيعه (magic bytes). */
export function sniff(data: ArrayBuffer): Sniffed | null {
  const b = new Uint8Array(data.slice(0, 16));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg', family: 'image' };
  if (b[0] === 0x89 && ascii(b, 1, 4) === 'PNG') return { ext: 'png', type: 'image/png', family: 'image' };
  if (ascii(b, 0, 4) === 'GIF8') return { ext: 'gif', type: 'image/gif', family: 'image' };
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return { ext: 'webp', type: 'image/webp', family: 'image' };
  if (ascii(b, 0, 4) === 'wOF2') return { ext: 'woff2', type: 'font/woff2', family: 'font' };
  if (ascii(b, 0, 4) === 'wOFF') return { ext: 'woff', type: 'font/woff', family: 'font' };
  if (ascii(b, 0, 4) === 'OTTO') return { ext: 'otf', type: 'font/otf', family: 'font' };
  if ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) || ascii(b, 0, 4) === 'true') return { ext: 'ttf', type: 'font/ttf', family: 'font' };
  if (ascii(b, 4, 8) === 'ftyp') return { ext: 'mp4', type: 'video/mp4', family: 'video' };
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ext: 'webm', type: 'video/webm', family: 'video' };
  return null;
}

const KIND_FAMILY: Record<UploadKind, Family> = { image: 'image', logo: 'image', font: 'font', video: 'video' };

const WRONG_TYPE: Record<UploadKind, string> = {
  image: 'الملف ليس صورة مدعومة (JPG أو PNG أو WEBP).',
  logo: 'الشعار يجب أن يكون صورة PNG أو JPG أو WEBP.',
  font: 'ملف الخط غير مدعوم. استخدم WOFF2 أو WOFF أو TTF أو OTF.',
  video: 'الفيديو غير مدعوم. استخدم ملف MP4 أو WEBM.',
};

export function parseKind(v: string | null): UploadKind {
  return v === 'logo' || v === 'font' || v === 'video' ? v : 'image';
}

/** يتحقق من الملف ويحفظه ويعيد رابطه العام. */
export async function storeUpload(kv: Kv, data: ArrayBuffer, kind: UploadKind, maxBytes?: number): Promise<string> {
  const family = KIND_FAMILY[kind];
  const found = sniff(data);
  if (!found || found.family !== family) fail(WRONG_TYPE[kind]);
  const limit = Math.min(UPLOAD_LIMITS[family], maxBytes ?? Infinity);
  if (data.byteLength > limit) fail(`حجم الملف أكبر من ${Math.floor(limit / MB)} ميغابايت.`);
  const now = new Date();
  const dir = family === 'font' ? 'fonts' : `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = `${dir}/${randomBytes(10).toString('hex')}.${found!.ext}`;
  await kv.setFile(key, data, found!.type);
  return `/uploads/${key}`;
}

export const UPLOAD_KEY = /^(\d{4}\/\d{2}|fonts)\/[a-f0-9]{20}\.(jpg|png|webp|gif|mp4|webm|woff2|woff|ttf|otf)$/;

/** يقدّم ملفاً مرفوعاً، مع دعم Range الذي يحتاجه Safari لتشغيل الفيديو. */
export async function serveUpload(kv: Kv, req: Request, pathname: string): Promise<Response> {
  const key = decodeURIComponent(pathname.replace(/^\/uploads\//, ''));
  if (!UPLOAD_KEY.test(key)) return new Response('Not found', { status: 404 });
  const file = await kv.getFile(key);
  if (!file) return new Response('Not found', { status: 404 });
  const headers: Record<string, string> = {
    'Content-Type': file.type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    // لو فُتح ملف مرفوع مباشرة فلا يُنفَّذ فيه شيء (مثل uploads/.htaccess)
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Accept-Ranges': 'bytes',
  };
  const size = file.data.byteLength;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(size - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    return new Response(file.data.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(file.data, { headers: { ...headers, 'Content-Length': String(size) } });
}
