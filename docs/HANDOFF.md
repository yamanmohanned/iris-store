# 🧭 نقطة البداية لأي جلسة جديدة (HANDOFF)

> **إذا كنت (أو Claude) تبدأ جلسة جديدة: اقرأ هذا الملف أولاً، ثم `docs/PLAN.md`، ثم آخر ملف في `docs/progress/`.**

## الحالة الحالية

| البند            | القيمة                                                            |
| ---------------- | ----------------------------------------------------------------- |
| آخر مرحلة مكتملة | **المرحلة 6** — لوحة تحكم المالك                                  |
| المرحلة الجارية  | **المرحلة 7** — الجودة والنشر ودليل المالك                        |
| الفرع            | `claude/nifty-turing-csz4ep`                                      |
| بانتظارك         | مفتاح `STITCH_API_KEY` (انظر `progress/00-discovery-and-plan.md`) |

## الخطوة التالية بالضبط

1. المرحلة 7 حسب `docs/PLAN.md`:
   - مسار cron محمي بسر (`/api/cron/*`) يشغّل `processOutbox` (`src/server/services/outbox.ts`)
     و`deleteExpiredCarts` (`cart.ts`) وتنظيف `rate_limit_buckets`.
   - مراجعة إمكانية الوصول والأداء على الهاتف (Lighthouse)، واختبارات إضافية.
   - `Dockerfile` للإنتاج، و`docker-compose` مع Caddy (HTTPS تلقائي) وPostgreSQL، ودليل النشر.
   - دليل المالك بالعربية (`docs/OWNER-GUIDE.md`) يشرح أقسام لوحة التحكم (انطلق من `progress/06-admin.md`).
2. عند توفر `STITCH_API_KEY` في البيئة: تشغيل `pnpm stitch:sync` ثم تنفيذ المرحلة 8 (التحليل والمطابقة).

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
