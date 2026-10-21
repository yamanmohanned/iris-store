import { api } from './api';

/**
 * يصغّر صورة الهاتف (عادة 4–12 ميغابايت) قبل رفعها: أطول ضلع 1600px وجودة JPEG 0.85.
 * يُبقي PNG الشفاف كما هو إن كان صغيراً. صور الكاميرا (JPEG/HEIC/WEBP) تُعاد رسمها دائماً حتى تُحذف
 * بياناتها المخفية (EXIF) — ومنها موقع التصوير GPS — قبل أن تصبح عامة في المتجر.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار ليس صورة.');
  if (file.type === 'image/gif' || (file.type === 'image/png' && file.size < 600_000)) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000 && file.type === 'image/png') return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#F4EDE2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  return blob ?? file;
}

/** نوع الملف المرفوع: الخادم يتحقق منه من محتواه ويحدد مكانه وحدّ حجمه. */
export type UploadKind = 'image' | 'logo' | 'font' | 'video';

async function upload(blob: Blob, name: string, kind: UploadKind): Promise<string> {
  const form = new FormData();
  form.append('file', blob, name);
  const res = await api<{ url: string }>('upload', { method: 'POST', form, ...(kind !== 'image' ? { query: { kind } } : {}) });
  return res.url;
}

/** يرفع صورة إلى الخادم ويعيد رابطها (/uploads/…). */
export async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const name = blob.type === 'image/jpeg' ? file.name.replace(/\.\w+$/, '') + '.jpg' : file.name;
  return upload(blob, name, 'image');
}

/** أطول ضلع للشعار بعد التحويل: يكفي للترويسة والأيقونة بوضوح على الشاشات عالية الدقة. */
const LOGO_MAX_SIDE = 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('تعذر فتح صورة الشعار. جرّب ملف PNG أو JPG أو WEBP أو SVG.'));
    img.src = url;
  }).finally(() => URL.revokeObjectURL(url));
}

/**
 * يجهّز الشعار للرفع: PNG/WEBP المعتدلة تُرفع كما هي حتى تبقى خلفيتها الشفافة؛ وأي صورة أخرى يفتحها
 * المتصفح (SVG، HEIC من iPhone، AVIF، GIF…) أو صورة كبيرة تُحوَّل إلى PNG بأطول ضلع 1024px مع الشفافية.
 */
async function prepareLogo(file: File): Promise<Blob> {
  const svg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  // JPEG يُعاد رسمه دائماً حتى تُحذف بيانات الكاميرا (EXIF/GPS) كما في compressImage
  if (!svg && /^image\/(png|webp)$/.test(file.type) && file.size <= 1_500_000) return file;
  const img = await loadImage(file);
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (svg && (!w || !h)) {
    // SVG بلا width/height: النسبة من viewBox
    const box = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(await file.text());
    w = box ? Number(box[1]) : 1;
    h = box ? Number(box[2]) : 1;
  }
  if (!w || !h) throw new Error('تعذر قراءة أبعاد صورة الشعار.');
  // الرسم المتجه يُكبَّر بلا فقد؛ الصور النقطية تُصغَّر فقط
  const scale = svg ? LOGO_MAX_SIDE / Math.max(w, h) : Math.min(1, LOGO_MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر تجهيز الشعار في هذا المتصفح.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) throw new Error('تعذر تجهيز الشعار في هذا المتصفح.');
  return blob;
}

export async function uploadLogo(file: File): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(svg|png|jpe?g|webp|heic|heif|avif|gif)$/i.test(file.name)) {
    throw new Error('اختر صورة للشعار (PNG أو JPG أو WEBP أو SVG).');
  }
  const blob = await prepareLogo(file);
  const name = blob === file ? file.name : `${file.name.replace(/\.\w+$/, '')}.${blob.type === 'image/jpeg' ? 'jpg' : 'png'}`;
  return upload(blob, name, 'logo');
}

export function uploadFont(file: File): Promise<string> {
  if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) return Promise.reject(new Error('اختر ملف خط بصيغة WOFF2 أو WOFF أو TTF أو OTF.'));
  return upload(file, file.name, 'font');
}

export function uploadVideo(file: File): Promise<string> {
  if (!file.type.startsWith('video/')) return Promise.reject(new Error('اختر ملف فيديو (MP4).'));
  return upload(file, file.name, 'video');
}
