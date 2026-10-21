import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { Button, Card, Field, inputClass, Notice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { instagramApi, type InstagramStatus } from '@/lib/adminApi';
import { isBrowserOnly } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useToast } from '@/state/toast';
import { SettingsHeader } from './SettingsLayout';

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: 'حوّل الحساب إلى حساب احترافي (مجاناً)',
    body: 'من تطبيق إنستغرام: الإعدادات ← نوع الحساب والأدوات ← التبديل إلى حساب احترافي، واختر «نشاط تجاري» أو «صانع محتوى».',
  },
  {
    title: 'أنشئ تطبيقاً في لوحة مطوري Meta',
    body: 'ادخل developers.facebook.com بحساب فيسبوك ← تطبيقاتي ← إنشاء تطبيق، واختر نوع «Business».',
  },
  {
    title: 'أضف منتج Instagram',
    body: 'من لوحة التطبيق: Instagram ← API setup with Instagram business login.',
  },
  {
    title: 'ولّد رمز الوصول',
    body: 'في قسم «Generate access tokens» اضغط Add account وسجّل الدخول بحساب المتجر، ثم اضغط Generate token وانسخ الرمز كاملاً.',
  },
  {
    title: 'الصق الرمز هنا واضغط «ربط الحساب»',
    body: 'الرمز صالح 60 يوماً ويُجدَّد تلقائياً كل أسبوع ما دام الاستيراد يُستخدم. إن انتهى، كرّر الخطوة 4 فقط.',
  },
];

/** ربط حساب إنستغرام للاستيراد (للمالك فقط). الرمز يُحفظ في الخادم ولا يظهر لأحد بعد ذلك. */
export default function InstagramSettings() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [status, setStatus] = useState<InstagramStatus | null>(null);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const browserOnly = isBrowserOnly();

  useEffect(() => {
    instagramApi
      .status()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'تعذر قراءة حالة الربط.'));
  }, []);

  const connect = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const s = await instagramApi.connect(token);
      setStatus(s);
      setToken('');
      toast.show(`تم ربط @${s.username}`, 'check_circle');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر الربط');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    const ok = await confirm({
      title: 'إلغاء ربط إنستغرام؟',
      body: 'المنتجات المستوردة سابقاً تبقى كما هي. يُحذف الرمز من الخادم ولن يعمل الاستيراد حتى تربط الحساب مجدداً.',
      confirmLabel: 'إلغاء الربط',
      tone: 'danger',
      icon: 'link_off',
    });
    if (!ok) return;
    setStatus(await instagramApi.disconnect());
    toast.show('أُلغي ربط إنستغرام', 'link_off');
  };

  return (
    <>
      <SettingsHeader
        title="ربط إنستغرام"
        description="بعد الربط تظهر منشورات حسابك في صفحة «الاستيراد من إنستغرام»، فتختار القطع وتستوردها بصورها وفيديوهاتها بضغطة."
      />
      {browserOnly && (
        <Notice tone="warning" className="mb-5">
          هذه نسخة عرض تعمل داخل المتصفح فقط؛ الاستيراد من إنستغرام يحتاج الموقع على الاستضافة الفعلية.
        </Notice>
      )}
      {error && (
        <Notice tone="danger" className="mb-5">
          {error}
        </Notice>
      )}

      {status?.connected ? (
        <Card className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-semantic-success-bg text-semantic-success">
            <Icon name="link" className="text-[26px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-label-lg text-label-lg font-semibold text-deep-oxblood">
              مربوط بالحساب <span dir="ltr">@{status.username}</span>
            </p>
            <p className="font-label-sm text-label-sm text-muted-rosewood">
              منذ {status.connectedAt ? formatDate(status.connectedAt) : '—'} · صلاحية الرمز حتى {status.expiresAt ? formatDate(status.expiresAt) : '—'}{' '}
              (تتجدد تلقائياً)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/instagram"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-imperial-burgundy px-4 font-label-lg text-label-lg font-semibold text-ivory-canvas"
            >
              <Icon name="photo_library" className="text-[18px]" />
              فتح الاستيراد
            </Link>
            <Button variant="danger" icon="link_off" onClick={() => void disconnect()}>
              إلغاء الربط
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-5 flex flex-col gap-4">
          <Field label="رمز الوصول (Access Token)" hint="يبدأ عادة بـ IG ويتكون من أكثر من 100 حرف. لا تشاركه مع أحد.">
            <textarea
              dir="ltr"
              rows={3}
              spellCheck={false}
              autoComplete="off"
              className={`${inputClass} font-mono text-[13px]`}
              value={token}
              onChange={(e) => setToken(e.target.value.trim())}
              placeholder="IGAA…"
            />
          </Field>
          <Button icon="link" busy={busy} disabled={token.length < 40 || browserOnly} onClick={() => void connect()} className="self-start">
            ربط الحساب
          </Button>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 font-headline-sm text-headline-sm font-semibold text-deep-oxblood">طريقة الحصول على الرمز (مرة واحدة)</h3>
        <ol className="flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush-surface font-label-lg text-label-lg font-bold text-imperial-burgundy">
                {i + 1}
              </span>
              <div>
                <p className="font-label-lg text-label-lg font-semibold text-warm-ink">{s.title}</p>
                <p className="font-body-sm text-body-sm text-muted-rosewood">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-5 border-t border-hairline-burgundy pt-4 font-label-sm text-label-sm text-muted-rosewood">
          الربط يستخدم واجهة إنستغرام الرسمية (Instagram API with Instagram Login) بصلاحية القراءة فقط؛ لا ننشر ولا نعدّل شيئاً في حسابك.
        </p>
      </Card>
    </>
  );
}
