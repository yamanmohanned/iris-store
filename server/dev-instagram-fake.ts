/**
 * محاكاة واجهة إنستغرام لخادم التطوير فقط (IRIS_IG_FAKE=1): تعيد منشورات من
 * scripts/qa/fixtures/instagram.json وتقدّم وسائطها من public/images/instagram/.
 * روابط الوسائط فيها بصيغة https://scontent.cdninstagram.com/fake/<ملف> حتى تمر بنفس فحص النطاقات.
 */
import fs from 'node:fs';
import path from 'node:path';

const FAKE_CDN = 'https://scontent.cdninstagram.com/fake/';

export function fakeInstagram(root: string) {
  const fixture = () =>
    JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'qa', 'fixtures', 'instagram.json'), 'utf8')) as {
      me: Record<string, unknown>;
      media: Array<Record<string, unknown> & { id: string }>;
    };
  const reply = (data: unknown) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.href.startsWith(FAKE_CDN)) {
      const file = path.join(root, 'public', 'images', 'instagram', path.basename(url.pathname));
      if (!fs.existsSync(file)) return new Response('not found', { status: 404 });
      return new Response(fs.readFileSync(file));
    }
    if (url.hostname !== 'graph.instagram.com') return new Response('blocked in fake mode', { status: 404 });
    if (url.searchParams.get('access_token') === 'expired') return reply({ error: { code: 190, message: 'expired' } });
    if (url.pathname === '/refresh_access_token') return reply({ access_token: url.searchParams.get('access_token'), expires_in: 5184000 });
    const id = url.pathname.split('/').pop();
    const { me, media } = fixture();
    if (id === 'me') return reply(me);
    if (id === 'media') return reply({ data: media, paging: {} });
    const post = media.find((m) => m.id === id);
    return post ? reply(post) : reply({ error: { code: 100, message: 'not found' } });
  }) as typeof fetch;

  return {
    fetch: fakeFetch,
    /** المتصفح يعرض المعاينات من الملفات المحلية بدل الخادم الوهمي. */
    rewritePreviews: (body: string) => body.split(FAKE_CDN).join('/images/instagram/'),
  };
}
