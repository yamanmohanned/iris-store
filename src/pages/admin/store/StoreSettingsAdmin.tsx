import { useState, type FormEvent } from 'react';
import { ImageField } from '@/components/admin/ImageField';
import { AdminPage, Button, Card, Field, inputClass, OfflineNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { cn } from '@/lib/cn';
import { DEFAULT_HERO_IMAGE } from '@/pages/mobile/home/MobileHome';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';
import { useCatalogEditor } from './useCatalogEditor';

const digits = (v: string) => v.replace(/[^\d]/g, '');

/** إعدادات البيع (التوصيل، القسائم، واتساب وإنستغرام، غلاف الرئيسية) + تغيير كلمة مرور المالك. */
export default function StoreSettingsAdmin() {
  const { settings } = useCatalog();
  const { commit, saving, online } = useCatalogEditor();
  const [fee, setFee] = useState(String(settings.shippingFee));
  const [threshold, setThreshold] = useState(String(settings.freeShippingThreshold));
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp ?? '');
  const [instagram, setInstagram] = useState(settings.instagram ?? '');
  const [hero, setHero] = useState(settings.heroImage ?? '');
  const [coupons, setCoupons] = useState(() =>
    Object.entries(settings.coupons).map(([code, c]) => ({ code, percent: String(c.percent), label: c.label })),
  );

  const save = () =>
    commit(
      (d) => ({
        ...d,
        settings: {
          ...d.settings,
          shippingFee: Number(digits(fee) || 0),
          freeShippingThreshold: Number(digits(threshold) || 0),
          whatsapp: digits(whatsapp),
          instagram: instagram.trim().replace(/^@/, ''),
          heroImage: hero,
          coupons: Object.fromEntries(
            coupons
              .filter((c) => c.code.trim() && Number(c.percent) > 0)
              .map((c) => [
                c.code.trim().toUpperCase(),
                { percent: Math.min(90, Number(digits(c.percent))), label: c.label.trim() || `خصم ${c.percent}%` },
              ]),
          ),
        },
      }),
      'تم حفظ الإعدادات',
    );

  return (
    <AdminPage
      title="إعدادات المتجر"
      actions={
        <Button icon="check" busy={saving} onClick={() => void save()}>
          حفظ الإعدادات
        </Button>
      }
    >
      {!online && <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن تُحفظ الإعدادات." />}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">التوصيل</h2>
          <Field label="أجور التوصيل (د.ع)">
            <input className={inputClass} dir="ltr" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
          <Field label="توصيل مجاني للطلبات من (د.ع)" hint="اكتب 0 لإيقاف التوصيل المجاني.">
            <input className={inputClass} dir="ltr" inputMode="numeric" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
          <Field label="رقم واتساب المتجر" hint="بالصيغة الدولية بلا أصفار، مثل 9647701234567.">
            <input className={inputClass} dir="ltr" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </Field>
          <Field label="حساب إنستغرام" hint="اسم الحساب فقط، مثل iris.jewelry — يظهر في صفحة «تواصل معنا».">
            <input className={inputClass} dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="iris.jewelry" />
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">غلاف الصفحة الرئيسية (الهاتف)</h2>
          <ImageField value={hero || DEFAULT_HERO_IMAGE} onChange={setHero} aspect="aspect-[4/5] max-h-[360px]" />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">قسائم الخصم</h2>
          {coupons.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_40px] items-center gap-2 sm:grid-cols-[1fr_80px_1.4fr_40px]">
              <input
                aria-label="رمز القسيمة"
                dir="ltr"
                className={cn(inputClass, 'py-2 uppercase')}
                value={c.code}
                placeholder="IRIS10"
                onChange={(e) => setCoupons(coupons.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))}
              />
              <input
                aria-label="النسبة"
                dir="ltr"
                inputMode="numeric"
                className={cn(inputClass, 'py-2')}
                value={c.percent}
                placeholder="%"
                onChange={(e) => setCoupons(coupons.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
              />
              <input
                aria-label="الوصف"
                className={cn(inputClass, 'col-span-2 py-2 sm:col-span-1')}
                value={c.label}
                placeholder="وصف يظهر للزبون"
                onChange={(e) => setCoupons(coupons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
              />
              <button
                type="button"
                aria-label="حذف القسيمة"
                onClick={() => setCoupons(coupons.filter((_, j) => j !== i))}
                className="col-start-3 row-start-1 flex h-9 w-9 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg sm:col-start-4"
              >
                <Icon name="delete" className="text-[20px]" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            icon="add"
            className="self-start"
            onClick={() => setCoupons([...coupons, { code: '', percent: '10', label: '' }])}
          >
            إضافة قسيمة
          </Button>
        </Card>

        <PasswordCard />
      </div>
    </AdminPage>
  );
}

function PasswordCard() {
  const { changePassword } = useAdminAuth();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
    if (next !== confirm) return setError('تأكيد كلمة المرور غير مطابق.');
    setError(undefined);
    setBusy(true);
    try {
      await changePassword(current, next);
      toast.show('تم تغيير كلمة المرور', 'lock');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تغيير كلمة المرور');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
        <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">كلمة مرور لوحة الإدارة</h2>
        <Field label="كلمة المرور الحالية">
          <input
            type="password"
            autoComplete="current-password"
            dir="ltr"
            className={inputClass}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل.">
          <input
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field label="تأكيد كلمة المرور الجديدة" error={error}>
          <input
            type="password"
            autoComplete="new-password"
            dir="ltr"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="secondary" icon="lock_reset" busy={busy} disabled={!current || !next} className="self-start">
          تغيير كلمة المرور
        </Button>
      </form>
    </Card>
  );
}
