/**
 * خادم التطوير داخل `npm run dev` فقط: يشغّل نفس منطق الخادم المشترك (server/core) المستخدم على Netlify،
 * مع تخزين في ملفات `.dev-data/` ورفع إلى `public/uploads/` (كلاهما غير مُتتبَّع في git).
 * الدخول: owner / owner12345 (أو IRIS_DEV_USER / IRIS_DEV_PASSWORD).
 * IRIS_IG_FAKE=1 يحاكي إنستغرام من ملفات محلية لاختبار الاستيراد بلا حساب حقيقي.
 * الإنتاج يستخدم PHP الحقيقي — هذا الملف لا يدخل في البناء.
 */
import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Plugin } from 'vite';
import { createHandler, type Json, type Kv } from './core/handler.ts';
import { fakeInstagram } from './dev-instagram-fake.ts';

const FILE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff2: 'font/woff2',
  woff: 'font/woff',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

function fileKv(dataDir: string, uploadsDir: string): Kv {
  const jsonPath = (key: string) => path.join(dataDir, `${key}.json`);
  const walk = (dir: string, prefix = ''): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
        )
      : [];
  return {
    getJSON: async (key) => {
      try {
        const value = JSON.parse(fs.readFileSync(jsonPath(key), 'utf8')) as Json;
        // نسخة خادم التطوير القديمة كانت تحفظ كلمة المرور نصاً؛ نتجاهلها فتعود كلمة المرور الافتراضية
        return key === 'auth' && !value.salt ? null : value;
      } catch {
        return null;
      }
    },
    setJSON: async (key, value) => {
      fs.mkdirSync(path.dirname(jsonPath(key)), { recursive: true });
      fs.writeFileSync(jsonPath(key), JSON.stringify(value, null, 2));
    },
    delete: async (key) => fs.rmSync(jsonPath(key), { force: true }),
    getFile: async (key) => {
      const file = path.join(uploadsDir, key);
      if (!fs.existsSync(file)) return null;
      const data = fs.readFileSync(file);
      return { data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), type: FILE_TYPES[key.split('.').pop() ?? ''] ?? 'application/octet-stream' };
    },
    setFile: async (key, data) => {
      fs.mkdirSync(path.dirname(path.join(uploadsDir, key)), { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, key), Buffer.from(data));
    },
    deleteFile: async (key) => fs.rmSync(path.join(uploadsDir, key), { force: true }),
    listFiles: async () => walk(uploadsDir),
  };
}

function toRequest(req: IncomingMessage): Request {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v != null) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    duplex: 'half',
  } as RequestInit);
}

async function send(res: ServerResponse, r: Response, rewrite?: (body: string) => string) {
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  const body = Buffer.from(await r.arrayBuffer());
  res.end(rewrite ? Buffer.from(rewrite(body.toString('utf8'))) : body);
}

export function irisDevApi(root: string): Plugin {
  const fake = process.env.IRIS_IG_FAKE ? fakeInstagram(root) : null;
  const handle = createHandler(
    fileKv(path.join(root, '.dev-data'), path.join(root, 'public', 'uploads')),
    {
      user: process.env.IRIS_DEV_USER ?? 'owner',
      password: process.env.IRIS_DEV_PASSWORD ?? 'owner12345',
      server: 'dev',
      maxVideoUpload: 40 * 1024 * 1024,
    },
    { fetch: fake?.fetch ?? fetch },
  );

  return {
    name: 'iris-dev-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/index.php')) return next();
        const request = toRequest(req);
        const isMedia = new URL(request.url).searchParams.get('r') === 'instagram/media';
        handle(request, req.socket.remoteAddress ?? '')
          .then((r) => send(res, r, isMedia ? fake?.rewritePreviews : undefined))
          .catch((e) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: String(e) }));
          });
      });
    },
  };
}
