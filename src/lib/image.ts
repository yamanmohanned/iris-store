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

/** يرفع صورة إلى الخادم ويعيد رابطها (/uploads/…). */
export async function uploadImage(file: File): Promise<string> {
  const blob = await compressImage(file);
  const form = new FormData();
  const name = blob.type === 'image/jpeg' ? file.name.replace(/\.\w+$/, '') + '.jpg' : file.name;
  form.append('file', blob, name);
  const res = await api<{ url: string }>('upload', { method: 'POST', form });
  return res.url;
}
