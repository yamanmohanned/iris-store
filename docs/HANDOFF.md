# 🧭 نقطة البداية لأي جلسة جديدة (HANDOFF)

> **إذا كنت (أو Claude) تبدأ جلسة جديدة: اقرأ هذا الملف أولاً، ثم `docs/PLAN.md`، ثم آخر ملف في `docs/progress/`.**

## الحالة الحالية

| البند            | القيمة                                                            |
| ---------------- | ----------------------------------------------------------------- |
| آخر مرحلة مكتملة | **المرحلة 4** — واجهة المتجر (Mobile-first)                       |
| المرحلة الجارية  | **المرحلة 5** — السلة والدفع والطلبات وحساب الزبون                |
| الفرع            | `claude/nifty-turing-csz4ep`                                      |
| بانتظارك         | مفتاح `STITCH_API_KEY` (انظر `progress/00-discovery-and-plan.md`) |

## الخطوة التالية بالضبط

1. إكمال المرحلة 5 (السلة ← إتمام الطلب ← تأكيد/تتبع الطلب ← حساب الزبون) حسب `docs/PLAN.md`.
   نقطة الربط: الخاصية `onAddToCart` في `src/components/store/product/product-experience.tsx`.
2. عند توفر `STITCH_API_KEY` في البيئة: تشغيل `pnpm stitch:sync` ثم تنفيذ المرحلة 8 (التحليل والمطابقة).

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

| المرحلة | الملف                                                                      |
| ------- | -------------------------------------------------------------------------- |
| 0       | [`progress/00-discovery-and-plan.md`](./progress/00-discovery-and-plan.md) |
| 1       | [`progress/01-foundation.md`](./progress/01-foundation.md)                 |
| 2       | [`progress/02-database.md`](./progress/02-database.md)                     |
| 3       | [`progress/03-auth-security.md`](./progress/03-auth-security.md)           |
| 4       | [`progress/04-storefront.md`](./progress/04-storefront.md)                 |
