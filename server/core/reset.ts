/**
 * إعادة ضبط المتجر (للمالك فقط): كلمة المرور + العبارة المكتوبة حرفياً + حد للمحاولات.
 * قبل الحذف تُحفظ نسخة نصية (الكتالوج والطلبات والفريق) في backups/ للطوارئ فقط.
 * حساب المالك وكلمة مروره لا يُمسّان.
 */
import { RESET_PHRASE, type ResetMode } from '../../src/lib/reset.ts';
import type { Auth } from './auth.ts';
import { clearRate, fail, rateLimited, type Json, type Kv } from './base.ts';
import { blankCatalog, loadCatalog } from './catalog.ts';

export async function resetStore(kv: Kv, auth: Auth, b: Json, ip: string): Promise<Json> {
  if (await rateLimited(kv, 'reset', ip, 5, 15 * 60, false)) fail('محاولات كثيرة. حاول بعد 15 دقيقة.', 429);
  const mode: ResetMode = b.mode === 'starter' ? 'starter' : 'empty';
  if (String(b.confirm ?? '').trim() !== RESET_PHRASE) {
    await rateLimited(kv, 'reset', ip, 5, 15 * 60, true);
    fail(`اكتب العبارة «${RESET_PHRASE}» كما هي للتأكيد.`);
  }
  if (typeof b.password !== 'string' || !(await auth.ownerPasswordOk(b.password))) {
    await rateLimited(kv, 'reset', ip, 5, 15 * 60, true);
    // 403 لا 401: الجلسة ما زالت صالحة، الخطأ في كلمة المرور المكتوبة فقط
    fail('كلمة المرور غير صحيحة.', 403);
  }
  await clearRate(kv, 'reset', ip);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await kv.setJSON(`backups/reset-${stamp}`, {
    at: new Date().toISOString(),
    mode,
    catalog: await kv.getJSON('catalog'),
    orders: await kv.getJSON('orders'),
    users: await kv.getJSON('users'),
  });

  for (const key of ['orders', 'users', 'instagram']) await kv.delete(key);
  for (const file of await kv.listFiles()) await kv.deleteFile(file);
  if (mode === 'empty') await kv.setJSON('catalog', { ...blankCatalog(), updatedAt: new Date().toISOString() });
  else await kv.delete('catalog');

  return { catalog: await loadCatalog(kv), mode };
}
