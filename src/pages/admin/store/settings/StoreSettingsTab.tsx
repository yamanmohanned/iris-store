import { useState } from 'react';
import { ImageField } from '@/components/admin/ImageField';
import { Button, Card, Field, inputClass, OfflineNotice, ReadOnlyNotice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { cn } from '@/lib/cn';
import { DEFAULT_HERO_IMAGE } from '@/pages/mobile/home/MobileHome';
import { useAdminAuth } from '@/state/adminAuth';
import { useCatalogEditor } from '../useCatalogEditor';
import { SettingsHeader } from './SettingsLayout';

const digits = (v: string) => v.replace(/[^\d]/g, '');

/** إعدادات البيع: التوصيل، واتساب وإنستغرام، غلاف الرئيسية، القسائم. */
export default function StoreSettingsTab() {
  const { settings } = useCatalog();
  const readOnly = !useAdminAuth().can('settings', 'edit');
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
    <>
      <SettingsHeader
        title="المتجر والتوصيل"
        description="أجور التوصيل، أرقام التواصل التي تظهر للزبائن، غلاف الصفحة الرئيسية على الهاتف، وقسائم الخصم."
        actions={
          !readOnly && (
            <Button icon="check" busy={saving} onClick={() => void save()}>
              حفظ الإعدادات
            </Button>
          )
        }
      />
      {!online && <OfflineNotice message="الخادم غير متاح حالياً، لذلك لن تُحفظ الإعدادات." />}
      {readOnly && <ReadOnlyNotice />}
      <fieldset disabled={readOnly} className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-2">
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
          <Field label="حساب إنستغرام" hint="اسم الحساب فقط، مثل iris_st0re1 — يظهر في صفحة «تواصل معنا» وأسفل الموقع.">
            <input className={inputClass} dir="ltr" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="iris_st0re1" />
          </Field>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">غلاف الصفحة الرئيسية (الهاتف)</h2>
          <ImageField value={hero || DEFAULT_HERO_IMAGE} onChange={setHero} aspect="aspect-[4/5] max-h-[360px]" />
        </Card>

        <Card className="flex flex-col gap-3">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">قسائم الخصم</h2>
          <p className="font-body-sm text-body-sm text-muted-rosewood">
            رموز الخصم تُحمَّل مع بيانات المتجر ويستطيع من يفحص الموقع قراءتها، فاستخدميها كرموز ترويج عامة (مثل رمز لمتابعي إنستغرام) لا كرموز سرية.
          </p>
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

      </fieldset>
    </>
  );
}
