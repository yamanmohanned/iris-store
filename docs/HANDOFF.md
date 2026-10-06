# 🧭 نقطة البداية لأي جلسة جديدة (HANDOFF)

> **إذا كنت (أو Claude) تبدأ جلسة جديدة: اقرأ هذا الملف أولاً، ثم `docs/PLAN.md`، ثم آخر ملف في `docs/progress/`.**

## الحالة الحالية

| البند            | القيمة                                                            |
| ---------------- | ----------------------------------------------------------------- |
| آخر مرحلة مكتملة | **المرحلة 7** — الجودة والنشر ودليل المالك                        |
| المرحلة التالية  | **المرحلة 8** — مطابقة تصميم Stitch (بانتظار المفتاح)             |
| الفرع            | `claude/nifty-turing-csz4ep`                                      |
| بانتظارك         | مفتاح `STITCH_API_KEY` (انظر `progress/00-discovery-and-plan.md`) |

## الخطوة التالية بالضبط

1. **إن وُجد `STITCH_API_KEY` في البيئة:** المرحلة 8 حسب `docs/PLAN.md`.
   - `pnpm stitch:sync`، ثم `docs/STITCH-ANALYSIS.md` (مقارنة الشاشات بالواجهة الحالية).
   - ثم مطابقة الألوان والخطوط والمكونات.
   - يجب أن تبقى `a11y.spec.ts` وكل الاختبارات ناجحة.
2. **إن لم يوجد:** لا تطلب من المستخدم لصق المفتاح في المحادثة؛ يضيفه بنفسه كمتغير بيئة. يمكن أثناء الانتظار:
   - العمل على القيود المعروفة في نهاية `progress/06-admin.md` و`progress/07-qa-deploy.md`:
     دعوة الموظفين بالبريد، واستيراد المنتجات وتصديرها بـ CSV.
   - أو انتظار قرارات المالك المؤجلة: بوابة الدفع، ومزود SMS أو واتساب، والاستضافة.

### خريطة التشغيل والنشر (المرحلة 7)

- الصورة: `Dockerfile`، وتُبنى بـ `BUILD_STANDALONE=1`. أداة التحديث `scripts/migrate.mjs` مجمّعة بـ `pnpm build:migrate` إلى `dist/`.
- الحزمة: `docker-compose.prod.yml` و`Caddyfile` و`scripts/docker/{entrypoint,cron,backup}.sh`، والدليل `docs/DEPLOYMENT.md`.
- Caddy على شبكة الخادم (`network_mode: host`)، والمتجر على `127.0.0.1:3000`.
  - التطبيق يقرأ `X-Forwarded-For` مع `TRUSTED_PROXY_COUNT`: ‏1 عادةً، و2 خلف Cloudflare مع `CADDY_TRUSTED_PROXIES`.
- `src/instrumentation.ts` يوقف خادم الإنتاج عند إعداد ناقص. `/api/health` لفحص الصحة.
- المهام الدورية `/api/cron/{outbox,cleanup}` بترويسة `Authorization: Bearer CRON_SECRET` (`maintenance.ts`).
- لاختبار الصورة في حاويات Claude:
  - Docker Hub محدود (429). استخدم `--build-arg NODE_IMAGE=mirror.gcr.io/library/node:22-bookworm-slim`.
  - شبكة البناء تحتاج شهادة الوكيل: نسخة محلية من Dockerfile تضيف `NODE_EXTRA_CA_CERTS`، مع `--network host`.
  - التفاصيل في `progress/07-qa-deploy.md`.

### خريطة سريعة للوحة التحكم (المرحلة 6)

- الصفحات: `src/app/[locale]/admin/*`. كل صفحة تبدأ بـ `requireStaffPage(locale, permission)`، وكل action بـ `assertStaff(permission)`.
- الخدمات: `admin-orders.ts` (سير الطلب)، `admin-catalog.ts` + `catalog-admin.ts` (المنتجات والأقسام)،
  `shipping-admin.ts`، `coupons-admin.ts`، `settings-admin.ts` (+ `brand-assets.ts`)، `content.ts` (الرئيسية والصفحات)،
  `people-admin.ts` (الزبائن والموظفون)، `audit-admin.ts`، `reports.ts`.
- مكونات مشتركة: `components/admin/kit.tsx` (أزرار وحقول)، `settings/shell.tsx` (`EditorShell` للنماذج وأخطاء الحقول)،
  `pager.tsx`، `image-uploader.tsx` (يرفع إلى `/api/admin/media`)، `product-picker.tsx`.
- اختبارات المتصفح تعيد عدّادات تحديد المعدل قبل التسجيل والدخول (`resetRateLimits` في `tests/e2e/helpers.ts`)،
  و`people.spec.ts` يدخل كمالك أنشأه اختبار الإعداد في `auth.spec.ts`.

## كيف أشغّل المشروع محلياً

```bash
pnpm install
pnpm db:local start      # تشغيل PostgreSQL محلياً
pnpm db:migrate && pnpm db:seed:demo   # أو db:seed لمتجر فارغ
pnpm dev                 # http://localhost:3000
```

## اختبارات المتصفح (E2E)

```bash
pnpm build
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm test:e2e   # في حاويات Claude السحابية
pnpm test:e2e                                                        # على جهازك (بعد: pnpm exec playwright install chromium)
```

تستخدم قاعدة `iris_e2e` (تُمسح وتُعبأ تلقائياً) وتلتقط رسائل البريد في `.data/mail-e2e`.

- `a11y.spec.ts` يفحص 34 صفحة بأداة axe (WCAG 2.2 AA)، ويفشل عند أي مخالفة جدية.
- مخزون المنتجات التجريبية محدود: الاختبار الذي يحتاج أي طلب يمرر منتجاً آخر إلى `placeGuestOrder`.

## سجل الملخصات

| المرحلة | الملف                                                                            |
| ------- | -------------------------------------------------------------------------------- |
| 0       | [`progress/00-discovery-and-plan.md`](./progress/00-discovery-and-plan.md)       |
| 1       | [`progress/01-foundation.md`](./progress/01-foundation.md)                       |
| 2       | [`progress/02-database.md`](./progress/02-database.md)                           |
| 3       | [`progress/03-auth-security.md`](./progress/03-auth-security.md)                 |
| 4       | [`progress/04-storefront.md`](./progress/04-storefront.md)                       |
| 5       | [`progress/05-cart-checkout-account.md`](./progress/05-cart-checkout-account.md) |
| 6       | [`progress/06-admin.md`](./progress/06-admin.md)                                 |
| 7       | [`progress/07-qa-deploy.md`](./progress/07-qa-deploy.md)                         |
