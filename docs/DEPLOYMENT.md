# دليل النشر — تشغيل المتجر على خادمك

هذا الدليل يشغّل المتجر كاملاً على **خادم واحد** باستخدام Docker. يعمل على الخادم:

- قاعدة البيانات (PostgreSQL).
- المتجر نفسه.
- **Caddy**، الذي يستخرج شهادة HTTPS ويجدّدها تلقائياً.
- خدمة تشغّل المهام الدورية: إرسال الرسائل كل دقيقة، والتنظيف يومياً.
- خدمة نسخ احتياطي يومي.

> لا يحتاج الأمر خبرة برمجية، لكن ستنسخ بعض الأوامر إلى سطر الأوامر. كل أمر هنا يُنسخ كما هو.

## ما تحتاجه

| البند                | التوصية                                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| خادم (VPS)           | 2 معالج و2 غيغابايت ذاكرة على الأقل (4 أفضل) و40 غيغابايت تخزين، بنظام **Ubuntu 24.04**                    |
| اسم نطاق (دومين)     | مثل `shop.example.com`، مع إمكانية تعديل إعدادات DNS                                                       |
| بريد إرسال (SMTP)    | من مزود بريدك (Zoho، Google Workspace) أو خدمة إرسال (Amazon SES، Brevo، Resend). بدونه لا تصل رموز التحقق |
| (اختياري) Cloudflare | حماية إضافية من الروبوتات (Turnstile) وتسريع                                                               |

## 1) اربط النطاق بالخادم

في إعدادات DNS لنطاقك أضف سجلاً من نوع **A** يشير إلى عنوان IP للخادم (وسجل **AAAA** إن كان للخادم عنوان IPv6):

```
shop.example.com   A   203.0.113.10
```

انتظر دقائق حتى ينتشر السجل. يمكنك التأكد بالأمر `ping shop.example.com`.

## 2) جهّز الخادم

ادخل إلى الخادم ثم ثبّت Docker وفعّل جدار الحماية:

```bash
ssh root@203.0.113.10
curl -fsSL https://get.docker.com | sh
ufw allow OpenSSH && ufw allow 80 && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable
```

## 3) انسخ المتجر

```bash
git clone https://github.com/<حسابك>/iris-store.git /opt/iris
cd /opt/iris
```

## 4) اكتب الإعدادات

```bash
cp .env.production.example .env.production
nano .env.production
```

املأ الحقول التالية، والباقي اختياري:

| الحقل               | القيمة                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| `DOMAIN`, `APP_URL` | نطاقك، مثل `shop.example.com` و`https://shop.example.com`                            |
| `POSTGRES_PASSWORD` | ناتج الأمر `openssl rand -hex 24`                                                    |
| `AUTH_SECRET`       | ناتج الأمر `openssl rand -base64 48`                                                 |
| `SETUP_TOKEN`       | ناتج الأمر `openssl rand -hex 24`. يُستخدم مرة واحدة لإنشاء حساب المالك              |
| `CRON_SECRET`       | ناتج الأمر `openssl rand -hex 24`                                                    |
| `EMAIL_*`, `SMTP_*` | بيانات بريد الإرسال من مزودك. `EMAIL_FROM` مثل `"متجري <no-reply@shop.example.com>"` |

> شغّل كل أمر `openssl` على الخادم وانسخ الناتج. **لا تشارك هذا الملف مع أحد** ولا ترفعه إلى GitHub (ملف `.gitignore` يمنع ذلك).

## 5) شغّل المتجر

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- التشغيل الأول يستغرق بضع دقائق، لأن المتجر يُبنى على الخادم.
- تُطبَّق تحديثات قاعدة البيانات تلقائياً عند كل تشغيل.
- يستخرج Caddy شهادة HTTPS خلال دقيقة تقريباً.

تأكد أن كل شيء يعمل:

```bash
docker compose -f docker-compose.prod.yml ps          # كل الخدمات running و app بحالة healthy
curl https://shop.example.com/api/health               # يجب أن يظهر {"ok":true}
```

## 6) أنشئ حساب المالك

1. افتح `https://shop.example.com/setup?token=` متبوعاً بقيمة `SETUP_TOKEN` التي كتبتها.
2. اكتب اسم المتجر واختر **الدولة**، ثم اكتب اسمك وبريدك وكلمة مرور قوية.
   - تُضبط تلقائياً حسب الدولة: العملة، ورمز الهاتف، والتوقيت، والمحافظات مع أجور توصيل مبدئية.
3. فعّل **التحقق بخطوتين** بتطبيق مثل Google Authenticator، واحتفظ بالرموز الاحتياطية في مكان آمن.
4. احذف قيمة `SETUP_TOKEN` من `.env.production` ثم أعد التشغيل:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

بعدها ادخل إلى `/admin` واتبع "اليوم الأول" في [دليل المالك](./OWNER-GUIDE.md).

> تنبيه: الدولة والعملة لا يمكن تغييرهما بعد الإعداد، لأن الأسعار وأرقام الهواتف تُحفظ على أساسهما.

## النسخ الاحتياطي

خدمة `backup` تكتب في مجلد `/opt/iris/backups`:

- نسخة من قاعدة البيانات **يومياً** (`db-التاريخ.dump`).
- أرشيف للصور المرفوعة **أسبوعياً** (`media-التاريخ.tar.gz`).
- تحتفظ بآخر 14 يوماً، ويمكنك تغيير المدة بالإعداد `BACKUP_KEEP_DAYS`.

**مهم:** النسخة الموجودة على الخادم نفسه لا تنفع إن فُقد الخادم. انسخ المجلد خارج الخادم بانتظام. مثلاً من جهازك:

```bash
rsync -av root@203.0.113.10:/opt/iris/backups/ ~/iris-backups/
```

أو ارفعه تلقائياً إلى تخزين سحابي (Backblaze B2، Google Drive، S3) بأداة `rclone`.

### الاستعادة من نسخة

```bash
cd /opt/iris
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C stop app cron
$C exec -T db pg_restore --clean --if-exists -U iris -d iris < backups/db-XXXXXXXX-XXXXXX.dump
docker run --rm -v iris_media:/media -v "$PWD/backups:/backups" alpine \
  sh -c "cd /media && tar -xzf /backups/media-XXXXXXXX-XXXXXX.tar.gz"
$C start app cron
```

> جرّب الاستعادة مرة واحدة على خادم تجريبي، حتى تتأكد أن نسخك صالحة قبل أن تحتاجها.

## التحديث إلى نسخة جديدة

```bash
cd /opt/iris
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C exec backup sh -c 'pg_dump --format=custom --file=/backups/before-update.dump'   # نسخة قبل التحديث
git pull
$C up -d --build
```

تُطبَّق تحديثات قاعدة البيانات تلقائياً عند التشغيل، ثم يعمل المتجر بالنسخة الجديدة.

## المراقبة والسجلات

```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.production"
$C logs -f app      # سجل المتجر (الأخطاء، البريد، المهام)
$C logs -f caddy    # الشهادة والطلبات
$C logs -f cron     # المهام الدورية
$C logs -f backup   # النسخ الاحتياطي
```

- أضف الرابط `https://shop.example.com/api/health` إلى خدمة مراقبة مجانية مثل UptimeRobot، لتصلك رسالة إن توقف المتجر.
- كل تغيير مهم في المتجر يُسجَّل في **سجل التدقيق** داخل لوحة التحكم.

## خلف Cloudflare (اختياري)

1. شغّل المتجر أولاً والسجل في Cloudflare بوضع **DNS only** (السحابة الرمادية)، حتى يستخرج Caddy الشهادة.
2. فعّل الوكيل (السحابة البرتقالية)، واضبط **SSL/TLS** على **Full (strict)**.
3. على الخادم، اكتب عناوين Cloudflare في `.env.production` ثم أعد التشغيل:

```bash
cd /opt/iris
CF="$(for f in ips-v4 ips-v6; do curl -fsS https://www.cloudflare.com/$f; echo; done | xargs)"
sed -i "s|^CADDY_TRUSTED_PROXIES=.*|CADDY_TRUSTED_PROXIES=\"$CF\"|; s|^TRUSTED_PROXY_COUNT=.*|TRUSTED_PROXY_COUNT=2|" .env.production
grep -E "^(CADDY_TRUSTED_PROXIES|TRUSTED_PROXY_COUNT)=" .env.production   # تأكد أن القائمة ليست فارغة
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

بهذا تحسب حدود الأمان عنوان الزائر الحقيقي، لا عنوان Cloudflare. ويتجاهل Caddy هذه المعلومة إن جاءت من أي جهة
غير Cloudflare، فلا يستطيع أحد تزويرها بالاتصال بالخادم مباشرة. Cloudflare نادراً ما تغيّر عناوينها، وإن أعلنت
تغييرها فأعد الخطوة 3.

## حل المشكلات الشائعة

| المشكلة                           | الحل                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| الموقع لا يفتح                    | تأكد من سجل DNS، ومن فتح المنفذين 80 و443، ومن حالة الخدمات بالأمر `ps`، ثم راجع `logs caddy`      |
| رموز التحقق ورسائل الطلبات لا تصل | راجع إعدادات SMTP، ثم `logs app`. الرسائل الفاشلة يُعاد إرسالها تلقائياً حتى 6 مرات                |
| "محاولات كثيرة"                   | حدود أمان مؤقتة ضد الهجمات. انتظر ربع ساعة                                                         |
| نسيت كلمة مرور المالك             | صفحة "نسيت كلمة المرور" في صفحة الدخول (يصلك رمز على بريدك)                                        |
| فقدت جهاز التحقق بخطوتين          | استخدم أحد الرموز الاحتياطية في صفحة التحقق، ثم أعد تفعيل التحقق بجهازك الجديد من صفحة "الأمان"    |
| الخادم امتلأ                      | احذف النسخ القديمة من `backups`، ونظّف Docker بالأمر `docker system prune` (لا يحذف بيانات المتجر) |

## بديل بلا خادم (خدمات مُدارة)

يمكن تشغيل المتجر بدون خادم خاص، بالجمع بين الخدمات التالية:

- **Vercel** للمتجر.
- قاعدة PostgreSQL مُدارة، مثل **Neon** أو **Supabase**.
- **Cloudflare R2** للصور، بالإعداد `STORAGE_DRIVER=s3`.

في هذه الحالة:

- اضبط في Vercel المتغيرات نفسها الموجودة في `.env.example`.
- أضف مهام **Vercel Cron** تستدعي `/api/cron/outbox` كل دقيقة و`/api/cron/cleanup` يومياً. يرسل Vercel قيمة `CRON_SECRET` تلقائياً.
- طبّق تحديثات قاعدة البيانات قبل كل نشر بالأمر `pnpm db:migrate`.
- النسخ الاحتياطي عندها مسؤولية مزود قاعدة البيانات.
