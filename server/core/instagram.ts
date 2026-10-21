/**
 * الاستيراد من إنستغرام عبر الواجهة الرسمية (Instagram API with Instagram Login).
 * الرمز يُحفظ في الخادم فقط (المفتاح instagram) ولا يظهر في الكتالوج العام.
 * الواجهة لا ترسل أي رابط وسائط: الخادم يقرأ المنشور من Graph برقمه ثم ينزّل وسائطه بنفسه
 * من نطاقات إنستغرام فقط.
 */
import { fail, type Deps, type Json, type Kv } from './base.ts';
import { storeUpload } from './uploads.ts';

export const GRAPH = 'https://graph.instagram.com/v25.0';
const REFRESH_URL = 'https://graph.instagram.com/refresh_access_token';
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}';
const DAY = 24 * 60 * 60 * 1000;
const TOKEN_LIFETIME = 60 * DAY;
const MAX_IMAGE = 15 * 1024 * 1024;
const MAX_VIDEO = 60 * 1024 * 1024;

interface Connection {
  token: string;
  userId: string;
  username: string;
  accountType: string;
  connectedAt: string;
  refreshedAt: string;
  expiresAt: string;
}

export interface IgItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  /** صورة المعاينة (غلاف الفيديو للفيديو) */
  preview: string;
  /** false عندما يحجب إنستغرام ملف الفيديو (موسيقى محمية مثلاً) */
  available: boolean;
  /** ملف الفيديو نفسه (لفحص لقطاته في المتصفح قبل الاستيراد) */
  src?: string;
}

export interface IgPost {
  id: string;
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption: string;
  permalink: string;
  timestamp: string;
  items: IgItem[];
}

/** نطاقات تنزيل الوسائط المسموحة (خوادم صور إنستغرام وفيسبوك فقط). */
export function allowedMediaHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname.endsWith('.cdninstagram.com') || u.hostname.endsWith('.fbcdn.net'));
  } catch {
    return false;
  }
}

const EXPIRED = 'انتهت صلاحية ربط إنستغرام أو أُلغي. أعد الربط من الإعدادات ← إنستغرام.';

export function createInstagram(kv: Kv, deps: Deps) {
  const load = async () => (await kv.getJSON('instagram')) as Connection | null;

  async function graph(url: string): Promise<Json> {
    let res: Response;
    try {
      res = await deps.fetch(url, { signal: AbortSignal.timeout(20_000) });
    } catch {
      return fail('تعذر الوصول إلى إنستغرام من الخادم. حاول بعد قليل.', 502);
    }
    const data = (await res.json().catch(() => null)) as Json | null;
    if (!res.ok || !data || data.error) {
      const code = Number(data?.error?.code);
      // 190 = رمز غير صالح أو منتهٍ (لا نستخدم 401 حتى لا تُفهم كانتهاء جلسة اللوحة)
      if (code === 190 || res.status === 401) fail(EXPIRED, 409);
      return fail(`رد إنستغرام: ${String(data?.error?.message ?? `خطأ ${res.status}`).slice(0, 200)}`, 502);
    }
    return data;
  }

  const withToken = (url: string, token: string) => `${url}${url.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;

  async function connection(): Promise<Connection> {
    const c = await load();
    if (!c) fail('لم يُربط حساب إنستغرام بعد. اربطه من الإعدادات ← إنستغرام.', 409);
    // تجديد الرمز الطويل كل أسبوع تقريباً (يجب أن يكون عمره 24 ساعة على الأقل)
    if (Date.now() - Date.parse(c!.refreshedAt) > 7 * DAY) {
      try {
        const r = await graph(`${REFRESH_URL}?grant_type=ig_refresh_token&access_token=${encodeURIComponent(c!.token)}`);
        if (typeof r.access_token === 'string') {
          c!.token = r.access_token;
          c!.refreshedAt = new Date().toISOString();
          c!.expiresAt = new Date(Date.now() + Number(r.expires_in || TOKEN_LIFETIME / 1000) * 1000).toISOString();
          await kv.setJSON('instagram', c);
        }
      } catch (e) {
        // انتهاء الرمز نهائياً يُبلَّغ للمالك؛ أي خطأ مؤقت آخر لا يوقف الاستيراد
        if (e instanceof Error && e.message === EXPIRED) throw e;
      }
    }
    return c!;
  }

  function normalize(m: Json): IgPost {
    const item = (x: Json): IgItem => ({
      id: String(x.id),
      type: x.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      preview: String((x.media_type === 'VIDEO' ? x.thumbnail_url : x.media_url) ?? x.thumbnail_url ?? ''),
      available: Boolean(x.media_url),
      ...(x.media_type === 'VIDEO' && x.media_url ? { src: String(x.media_url) } : {}),
    });
    const children = Array.isArray(m.children?.data) ? m.children.data : [];
    return {
      id: String(m.id),
      type: m.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL_ALBUM' : m.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
      caption: String(m.caption ?? ''),
      permalink: String(m.permalink ?? ''),
      timestamp: String(m.timestamp ?? ''),
      items: m.media_type === 'CAROUSEL_ALBUM' ? children.map(item) : [item(m)],
    };
  }

  /** تنزيل من نطاقات إنستغرام فقط، مع تتبع التحويلات يدوياً للتأكد من بقائها في نفس النطاقات. */
  async function download(url: string, maxBytes: number): Promise<ArrayBuffer> {
    let target = url;
    for (let hop = 0; hop < 4; hop++) {
      if (!allowedMediaHost(target)) fail('رابط وسائط من خارج إنستغرام — رُفض لأسباب أمنية.', 502);
      const res = await deps.fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(45_000) }).catch(() => null);
      if (!res) fail('تعذر تنزيل الوسائط من إنستغرام. حاول مجدداً.', 502);
      if (res!.status >= 300 && res!.status < 400 && res!.headers.get('location')) {
        target = new URL(res!.headers.get('location')!, target).toString();
        continue;
      }
      if (!res!.ok) fail(`تعذر تنزيل الوسائط من إنستغرام (${res!.status}).`, 502);
      if (Number(res!.headers.get('content-length') ?? 0) > maxBytes) fail('ملف الوسائط أكبر من المسموح.', 413);
      const data = await res!.arrayBuffer();
      if (data.byteLength > maxBytes) fail('ملف الوسائط أكبر من المسموح.', 413);
      return data;
    }
    return fail('تحويلات كثيرة عند تنزيل الوسائط.', 502);
  }

  return {
    async status() {
      const c = await load();
      return c
        ? { connected: true, username: c.username, accountType: c.accountType, connectedAt: c.connectedAt, expiresAt: c.expiresAt }
        : { connected: false };
    },

    async connect(rawToken: unknown) {
      const token = String(rawToken ?? '').trim();
      if (!/^[A-Za-z0-9_\-.|]{40,600}$/.test(token)) fail('رمز الوصول غير صالح. انسخه كاملاً من لوحة مطوري Meta.');
      const me = await graph(withToken(`${GRAPH}/me?fields=user_id,username,account_type`, token));
      const now = new Date();
      const conn: Connection = {
        token,
        userId: String(me.user_id ?? me.id ?? ''),
        username: String(me.username ?? ''),
        accountType: String(me.account_type ?? ''),
        connectedAt: now.toISOString(),
        // رموز لوحة المطورين صالحة 60 يوماً؛ التجديد الأسبوعي يمدّها تلقائياً
        refreshedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + TOKEN_LIFETIME).toISOString(),
      };
      await kv.setJSON('instagram', conn);
      return this.status();
    },

    async disconnect() {
      await kv.delete('instagram');
    },

    async media(after: string | null) {
      const c = await connection();
      const cursor = after && /^[A-Za-z0-9_\-=]{1,400}$/.test(after) ? `&after=${after}` : '';
      const data = await graph(withToken(`${GRAPH}/me/media?fields=${FIELDS}&limit=24${cursor}`, c.token));
      const posts = (Array.isArray(data.data) ? data.data : []).map(normalize);
      return { posts, next: data.paging?.next ? (data.paging?.cursors?.after ?? null) : null, username: c.username };
    },

    /** ينزّل الوسائط المختارة من منشور واحد إلى uploads (طلب لكل منشور حتى لا تطول المهلة). */
    async fetchPost(id: unknown, childIds: unknown) {
      const postId = String(id ?? '');
      if (!/^\d{5,30}$/.test(postId)) fail('رقم المنشور غير صالح.');
      const c = await connection();
      const m = await graph(withToken(`${GRAPH}/${postId}?fields=${FIELDS}`, c.token));
      const raw: Json[] = m.media_type === 'CAROUSEL_ALBUM' ? (m.children?.data ?? []) : [m];
      const wanted = new Set(Array.isArray(childIds) ? childIds.map(String) : raw.map((x) => String(x.id)));
      const chosen = raw.filter((x) => wanted.has(String(x.id)));
      if (!chosen.length) fail('لم تُختر أي صورة أو فيديو من هذا المنشور.');
      const media: Array<{ id: string; kind: 'image' | 'video'; url: string; poster?: string }> = [];
      for (const x of chosen.slice(0, 12)) {
        if (x.media_type === 'VIDEO') {
          const poster = x.thumbnail_url ? await storeUpload(kv, await download(String(x.thumbnail_url), MAX_IMAGE), 'image') : undefined;
          if (!x.media_url) {
            // الفيديو محجوب (حقوق موسيقى مثلاً): نكتفي بغلافه كصورة
            if (poster) media.push({ id: String(x.id), kind: 'image', url: poster });
            continue;
          }
          const url = await storeUpload(kv, await download(String(x.media_url), MAX_VIDEO), 'video', MAX_VIDEO);
          media.push({ id: String(x.id), kind: 'video', url, ...(poster ? { poster } : {}) });
        } else if (x.media_url) {
          media.push({ id: String(x.id), kind: 'image', url: await storeUpload(kv, await download(String(x.media_url), MAX_IMAGE), 'image', MAX_IMAGE) });
        }
      }
      if (!media.length) fail('إنستغرام لم يتح تنزيل وسائط هذا المنشور.', 502);
      return { media, permalink: String(m.permalink ?? ''), caption: String(m.caption ?? '') };
    },
  };
}
