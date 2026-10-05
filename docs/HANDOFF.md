# 🧭 نقطة البداية لأي جلسة جديدة (HANDOFF)

> **إذا كنت (أو Claude) تبدأ جلسة جديدة: اقرأ هذا الملف أولاً، ثم `docs/PLAN.md`، ثم آخر ملف في `docs/progress/`.**

## الحالة الحالية

| البند            | القيمة                                                            |
| ---------------- | ----------------------------------------------------------------- |
| آخر مرحلة مكتملة | **المرحلة 1** — الأساس                                            |
| المرحلة الجارية  | **المرحلة 2** — قاعدة البيانات                                    |
| الفرع            | `claude/nifty-turing-csz4ep`                                      |
| بانتظارك         | مفتاح `STITCH_API_KEY` (انظر `progress/00-discovery-and-plan.md`) |

## الخطوة التالية بالضبط

1. إكمال المرحلة 2 (قاعدة البيانات) حسب جدول المراحل في `docs/PLAN.md`.
2. عند توفر `STITCH_API_KEY` في البيئة: تشغيل `pnpm stitch:sync` ثم تنفيذ المرحلة 8 (التحليل والمطابقة).

## كيف أشغّل المشروع محلياً

```bash
pnpm install
pnpm db:local start      # تشغيل PostgreSQL محلياً
pnpm db:migrate && pnpm db:seed
pnpm dev                 # http://localhost:3000
```

## سجل الملخصات

| المرحلة | الملف                                                                      |
| ------- | -------------------------------------------------------------------------- |
| 0       | [`progress/00-discovery-and-plan.md`](./progress/00-discovery-and-plan.md) |
| 1       | [`progress/01-foundation.md`](./progress/01-foundation.md)                 |
