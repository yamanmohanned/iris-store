/**
 * واجهة الخادم لنسخة Netlify التجريبية — المنطق كله في server/core (نفس عقد server/api/index.php)،
 * وهذا الملف يربطه بـ Netlify Blobs فقط. بهذا يرى كل من يفتح الرابط نفس الأقسام والمنتجات والطلبات.
 *
 * بيانات دخول المالك: متغيرا البيئة IRIS_ADMIN_USER و IRIS_ADMIN_PASSWORD في Netlify
 * (الافتراضي owner / demo1234 ويظهر تلميحه في صفحة الدخول حتى تُضبط كلمة مرور خاصة).
 */
import { getStore } from '@netlify/blobs';
import { createHandler, type Json, type Kv } from '../../server/core/handler.ts';

function blobsKv(): Kv {
  const data = getStore({ name: 'iris-data', consistency: 'strong' });
  const files = getStore({ name: 'iris-uploads', consistency: 'strong' });
  return {
    getJSON: async (k) => ((await data.get(k, { type: 'json' })) as Json | null) ?? null,
    setJSON: async (k, v) => {
      await data.setJSON(k, v);
    },
    delete: async (k) => {
      await data.delete(k);
    },
    getFile: async (k) => {
      const r = await files.getWithMetadata(k, { type: 'arrayBuffer' });
      return r ? { data: r.data, type: String(r.metadata?.type ?? 'application/octet-stream') } : null;
    },
    setFile: async (k, d, type) => {
      await files.set(k, d, { metadata: { type } });
    },
    deleteFile: async (k) => {
      await files.delete(k);
    },
    listFiles: async () => (await files.list()).blobs.map((b) => b.key),
  };
}

let handler: ((req: Request, ip?: string) => Promise<Response>) | null = null;

export default async (req: Request, context: { ip?: string }) => {
  handler ??= createHandler(blobsKv(), {
    user: process.env.IRIS_ADMIN_USER,
    password: process.env.IRIS_ADMIN_PASSWORD,
    server: 'netlify',
    // طلبات Netlify Functions محدودة بحوالي 6MB
    maxVideoUpload: 5 * 1024 * 1024,
  });
  return handler(req, context?.ip ?? '');
};

export const config = {
  path: ['/api/index.php', '/uploads/*'],
};
