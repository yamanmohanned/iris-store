import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { irisDevApi } from './server/dev-api.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // خادم PHP محاكٍ أثناء التطوير فقط (الإنتاج يستخدم server/api/*.php)
  plugins: [react(), irisDevApi(root), ...(mode === 'netlify' ? [noIndex()] : [])],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  build: {
    // ملفات الواجهة فقط؛ واجهة PHP تُضاف بواسطة scripts/deploy/package.mjs
    outDir: 'dist',
    assetsDir: 'assets',
  },
}));

/** النسخة التجريبية على Netlify لا تُفهرس في محركات البحث (المتجر الحقيقي على الاستضافة الدائمة). */
function noIndex(): Plugin {
  return {
    name: 'iris-noindex',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n    <meta name="robots" content="noindex, nofollow" />'),
  };
}
