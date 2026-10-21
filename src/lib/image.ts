import { api } from './api';

/**
 * يصغّر صورة الهاتف (عادة 4–12 ميغابايت) قبل رفعها: أطول ضلع 1600px وجودة JPEG 0.85.
 * يُبقي PNG الشفاف كما هو إن كان صغيراً.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('الملف المختار ليس صورة.');
  if (file.type === 'image/gif' || (file.type === 'image/png' && file.size < 600_000)) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 900_000) return file;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.fillStyle = '#FBF6EF';
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

/** الشعار يُرفع كما هو حتى تبقى خلفيته الشفافة (بلا ضغط إلى JPEG). */
export function uploadLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return Promise.reject(new Error('الشعار يجب أن يكون صورة PNG أو JPG أو WEBP.'));
  return upload(file, file.name, 'logo');
}

export function uploadFont(file: File): Promise<string> {
  if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) return Promise.reject(new Error('اختر ملف خط بصيغة WOFF2 أو WOFF أو TTF أو OTF.'));
  return upload(file, file.name, 'font');
}

export function uploadVideo(file: File): Promise<string> {
  if (!file.type.startsWith('video/')) return Promise.reject(new Error('اختر ملف فيديو (MP4).'));
  return upload(file, file.name, 'video');
}
