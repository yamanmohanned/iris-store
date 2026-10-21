/**
 * خادم آيريس المشترك: Netlify Functions (netlify/functions/api.mts) وخادم التطوير (server/dev-api.ts).
 * نفس عقد server/api/index.php — كل مسار يحدد من يُسمح له به في جدول ROUTES.
 */
import { allows, type Section } from '../../src/lib/permissions.ts';
import { createAuth, type Actor } from './auth.ts';
import { fail, Fail, json, ok, rateLimited, readBody, type Deps, type Env, type Json, type Kv } from './base.ts';
import { cleanCatalog, loadCatalog, mergeForPermissions } from './catalog.ts';
import { createInstagram } from './instagram.ts';
import { createOrders } from './orders.ts';
import { resetStore } from './reset.ts';
import { parseKind, serveUpload, storeUpload, UPLOAD_LIMITS } from './uploads.ts';

export type { Deps, Env, Json, Kv } from './base.ts';

type Need = 'public' | 'signedIn' | 'owner' | 'catalogEdit' | { section: Section; level: 'view' | 'edit' };

/** من يحق له كل مسار. الصلاحيات الدقيقة (مثل أجزاء الكتالوج) تُفحص داخل المسار أيضاً. */
const ROUTES: Record<string, Need> = {
  'GET health': 'public',
  'GET catalog': 'public',
  'POST catalog/save': 'catalogEdit',
  'POST upload': 'catalogEdit',
  'POST auth/login': 'public',
  'POST auth/logout': 'public',
  'GET auth/me': 'public',
  'POST auth/password': 'signedIn',
  'POST orders': 'public',
  'GET orders': { section: 'orders', level: 'view' },
  'POST orders/status': { section: 'orders', level: 'edit' },
  'GET orders/track': 'public',
  'GET users': 'owner',
  'POST users/save': 'owner',
  'POST users/delete': 'owner',
  'GET instagram/status': { section: 'products', level: 'edit' },
  'POST instagram/connect': 'owner',
  'POST instagram/disconnect': 'owner',
  'GET instagram/media': { section: 'products', level: 'edit' },
  'POST instagram/fetch': { section: 'products', level: 'edit' },
  'POST system/reset': 'owner',
};

/** أجزاء الكتالوج التي يحفظها catalog/save (الطلبات ليست منها). */
const CATALOG_SECTIONS: Section[] = ['products', 'categories', 'settings'];

function permitted(actor: Actor, need: Need): boolean {
  if (need === 'public' || need === 'signedIn') return true;
  if (need === 'owner') return actor.role === 'owner';
  if (need === 'catalogEdit') return CATALOG_SECTIONS.some((s) => allows(actor.permissions, s, 'edit'));
  return allows(actor.permissions, need.section, need.level);
}

export function createHandler(kv: Kv, env: Env, deps: Deps = { fetch }) {
  const auth = createAuth(kv, env);
  const orders = createOrders(kv);
  const instagram = createInstagram(kv, deps);
  const maxVideo = env.maxVideoUpload ?? 5 * 1024 * 1024;

  async function route(req: Request, url: URL, ip: string): Promise<Response> {
    const r = (url.searchParams.get('r') ?? '').replace(/^\/+|\/+$/g, '');
    const key = `${req.method} ${r}`;
    const need = ROUTES[key];
    if (!need) fail('المسار غير موجود.', 404);
    // مثل PHP: كل طلب يغيّر البيانات أو يخص اللوحة يحتاج ترويسة X-Requested-With (حماية CSRF)
    if ((req.method !== 'GET' || need !== 'public') && req.headers.get('x-requested-with') !== 'iris') fail('طلب غير مسموح.', 403);

    let actor: Actor | null = null;
    if (need !== 'public') {
      actor = await auth.actorOf(req);
      if (!actor) fail('انتهت الجلسة. يرجى تسجيل الدخول من جديد.', 401);
      if (!permitted(actor!, need)) fail('لا تملك صلاحية لهذا الإجراء. اطلبها من مالك المتجر.', 403);
    }
    const me = actor!;

    switch (key) {
      case 'GET health': {
        const custom = Boolean(env.password) || Boolean(await kv.getJSON('auth'));
        return ok({
          server: env.server ?? 'netlify',
          writable: true,
          uploads: true,
          catalog: (await kv.getJSON('catalog')) ? 'owner' : 'seed',
          passwordSet: true,
          demoLogin: !custom,
          instagram: true,
          limits: { image: UPLOAD_LIMITS.image, font: UPLOAD_LIMITS.font, video: Math.min(UPLOAD_LIMITS.video, maxVideo) },
        });
      }

      case 'GET catalog':
        return ok({ catalog: await loadCatalog(kv) });

      case 'POST catalog/save': {
        const c = (await readBody(req)).catalog as Json | undefined;
        if (!c || typeof c !== 'object') fail('لم تصل بيانات الكتالوج.');
        const merged = mergeForPermissions(c!, await loadCatalog(kv), me.permissions);
        const saved = { ...cleanCatalog(merged), updatedAt: new Date().toISOString() };
        await kv.setJSON('catalog', saved);
        return ok({ catalog: saved });
      }

      case 'POST upload': {
        const kind = parseKind(url.searchParams.get('kind'));
        const section: Section = kind === 'logo' || kind === 'font' ? 'settings' : 'products';
        if (!allows(me.permissions, section, 'edit') && !(kind === 'image' && allows(me.permissions, 'categories', 'edit')))
          fail('لا تملك صلاحية رفع هذا النوع من الملفات.', 403);
        const form = await req.formData().catch(() => null);
        const file = form?.get('file');
        if (!file || typeof file === 'string') fail('لم يصل أي ملف.');
        return ok({ url: await storeUpload(kv, await (file as File).arrayBuffer(), kind, kind === 'video' ? maxVideo : undefined) });
      }

      case 'POST auth/login': {
        const { admin, cookie } = await auth.login(await readBody(req), ip, url.protocol === 'https:');
        return ok({ admin }, { 'Set-Cookie': cookie });
      }

      case 'POST auth/logout':
        await auth.logout(req);
        return ok({}, { 'Set-Cookie': 'IRISADMIN=; Path=/; Max-Age=0' });

      case 'GET auth/me': {
        const a = await auth.actorOf(req);
        if (!a) return ok({ admin: null });
        const { token: _t, ...admin } = a;
        return ok({ admin });
      }

      case 'POST auth/password':
        await auth.changeOwnPassword(me, await readBody(req));
        return ok();

      case 'POST orders':
        return ok({ order: await orders.create(await readBody(req)) });

      case 'GET orders':
        return ok({ orders: await orders.list() });

      case 'POST orders/status':
        return ok({ order: await orders.setStatus(await readBody(req)) });

      case 'GET orders/track':
        if (await rateLimited(kv, 'track', ip, 40, 600, true)) fail('محاولات كثيرة. حاول بعد قليل.', 429);
        return ok({ order: await orders.track(url.searchParams.get('id'), url.searchParams.get('phone')) });

      case 'GET users':
        return ok({ users: await auth.listStaff(), owner: { username: auth.owner.username } });

      case 'POST users/save':
        return ok({ users: await auth.saveMember((await readBody(req)).user ?? {}) });

      case 'POST users/delete':
        return ok({ users: await auth.deleteMember((await readBody(req)).id) });

      case 'GET instagram/status':
        return ok(await instagram.status());

      case 'POST instagram/connect':
        return ok(await instagram.connect((await readBody(req)).token));

      case 'POST instagram/disconnect':
        await instagram.disconnect();
        return ok({ connected: false });

      case 'GET instagram/media':
        return ok(await instagram.media(url.searchParams.get('after')));

      case 'POST instagram/fetch': {
        const b = await readBody(req);
        return ok(await instagram.fetchPost(b.id, b.childIds));
      }

      case 'POST system/reset':
        return ok(await resetStore(kv, auth, await readBody(req), ip));
    }
    return fail('المسار غير موجود.', 404);
  }

  return async function handle(req: Request, ip = ''): Promise<Response> {
    const url = new URL(req.url);
    try {
      if (url.pathname.startsWith('/uploads/'))
        return req.method === 'GET' || req.method === 'HEAD' ? await serveUpload(kv, req, url.pathname) : new Response(null, { status: 405 });
      return await route(req, url, ip);
    } catch (e) {
      if (e instanceof Fail) return json(e.status, { ok: false, error: e.message });
      console.error(e);
      return json(500, { ok: false, error: 'خطأ غير متوقع في الخادم. حاول مجدداً.' });
    }
  };
}
