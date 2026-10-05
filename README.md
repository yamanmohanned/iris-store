# Iris Store — متجر Iris

متجر إلكتروني احترافي **(موقع ويب)** بتصميم يناسب الهاتف أولاً، يدعم العربية (افتراضياً) والإنجليزية،
مع لوحة تحكم سهلة للمالك وأمان عالٍ.

> **للمطوّرين ولجلسات Claude الجديدة:** ابدأ من [`docs/HANDOFF.md`](docs/HANDOFF.md) ثم [`docs/PLAN.md`](docs/PLAN.md).

## التشغيل السريع (للتطوير)

المتطلبات: Node.js 22+ و pnpm و PostgreSQL 16+ (أو Docker).

```bash
pnpm install
cp .env.example .env          # ثم عدّل القيم (خاصة AUTH_SECRET)

# قاعدة البيانات — اختر طريقة واحدة:
pnpm db:local start           # PostgreSQL المثبت على الجهاز (بدون Docker)
docker compose up -d          # أو عبر Docker (يشمل Mailpit لاستعراض الرسائل)

pnpm db:migrate               # إنشاء الجداول
pnpm db:seed                  # بيانات تجريبية
pnpm dev                      # http://localhost:3000
```

## الأوامر المهمة

| الأمر              | الوظيفة                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `pnpm check`       | الفحص الكامل: lint + الأنواع + الاختبارات                                 |
| `pnpm test`        | اختبارات الوحدات والتكامل (Vitest)                                        |
| `pnpm test:e2e`    | اختبارات المتصفح على مقاس الهاتف والحاسوب (Playwright) — بعد `pnpm build` |
| `pnpm db:generate` | توليد ترحيل جديد بعد تعديل مخطط قاعدة البيانات                            |
| `pnpm stitch:sync` | سحب تصميم Stitch (يحتاج `STITCH_API_KEY`)                                 |

## التقنيات

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · next-intl · PostgreSQL · Drizzle ORM ·
Better Auth · Zod · Vitest · Playwright.

## الأمان

راجع [`docs/SECURITY.md`](docs/SECURITY.md) (يُستكمل في المرحلة 3). للإبلاغ عن ثغرة أمنية تواصل مع
مالك المستودع مباشرة ولا تفتح Issue عاماً.
