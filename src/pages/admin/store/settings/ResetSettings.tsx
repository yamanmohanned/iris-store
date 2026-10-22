import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Card, Field, inputClass, Modal, Notice } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { useCatalog } from '@/data/catalog';
import { staffApi, systemApi } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import { RESET_PHRASE, type ResetMode } from '@/lib/reset';
import { resetAdminOrders, useAdminOrders } from '@/state/adminOrders';
import { useCatalogSync } from '@/state/catalog';
import { useToast } from '@/state/toast';
import { SettingsHeader } from './SettingsLayout';

const MODES: Array<{ id: ResetMode; title: string; body: string; icon: string }> = [
  {
    id: 'empty',
    title: 'متجر فارغ',
    body: 'بلا أقسام ولا منتجات — جاهز لتبدأ إدخال بياناتك من الصفر.',
    icon: 'check_box_outline_blank',
  },
  {
    id: 'starter',
    title: 'المحتوى الافتتاحي',
    body: 'يعود الموقع كما سُلّم أول مرة: الأقسام والمنتجات الأولى من إنستغرام.',
    icon: 'auto_awesome',
  },
];

/** إعادة ضبط المتجر (للمالك فقط) — نافذة بخطوتين: ماذا سيُحذف، ثم كلمة المرور والعبارة. */
export default function ResetSettings() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsHeader title="إعادة ضبط المتجر" description="لإرجاع الموقع إلى حالته الأولى قبل إطلاقه أو بعد التجربة. هذه الخطوة نهائية." />
      <Card className="flex flex-col gap-4 ring-1 ring-semantic-error/25">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-semantic-error-bg text-semantic-error">
            <Icon name="restart_alt" className="text-[24px]" />
          </span>
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">حذف كل البيانات والبدء من جديد</h3>
            <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">
              تُحذف المنتجات والأقسام والطلبات وحسابات الموظفين والصور والخطوط المرفوعة وربط إنستغرام، وتعود الإعدادات والشعار والخطوط
              لافتراضيها. حساب المالك وكلمة مروره يبقيان كما هما.
            </p>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-2 font-body-sm text-body-sm sm:grid-cols-3">
          {[
            ['lock', 'تحتاج كلمة مرور المالك'],
            ['keyboard', `وكتابة «${RESET_PHRASE}» حرفياً`],
            ['timer', '5 محاولات خاطئة توقفها 15 دقيقة'],
          ].map(([icon, label]) => (
            <li key={label} className="flex items-center gap-2 rounded-xl bg-blush-surface/60 px-3 py-2 text-warm-ink">
              <Icon name={icon} className="text-[18px] text-antique-gold" />
              {label}
            </li>
          ))}
        </ul>
        <Button
          icon="restart_alt"
          onClick={() => setOpen(true)}
          className="self-start !bg-semantic-error !text-white shadow-none hover:!bg-semantic-error/90"
        >
          إعادة ضبط المتجر…
        </Button>
      </Card>
      {open && <ResetDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function ResetDialog({ onClose }: { onClose: () => void }) {
  const catalog = useCatalog();
  const { orders } = useAdminOrders();
  const { reload } = useCatalogSync();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [mode, setMode] = useState<ResetMode>('empty');
  const [phrase, setPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [staffCount, setStaffCount] = useState<number | null>(null);

  useEffect(() => {
    staffApi
      .list()
      .then((r) => setStaffCount(r.users.length))
      .catch(() => setStaffCount(null));
  }, []);

  const ready = phrase.trim() === RESET_PHRASE && password.length > 0 && understood;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setError(undefined);
    try {
      await systemApi.reset({ password, confirm: phrase.trim(), mode });
      resetAdminOrders();
      await reload();
      toast.show(mode === 'empty' ? 'أُعيد ضبط المتجر — أصبح فارغاً وجاهزاً لبياناتك' : 'أُعيد المتجر إلى محتواه الافتتاحي', 'check_circle');
      navigate('/admin', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذرت إعادة الضبط');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  const counts: Array<[string, string]> = [
    ['inventory_2', `${catalog.products.length} منتج`],
    ['category', `${catalog.categories.length} قسم`],
    ['receipt_long', `${orders.length} طلب`],
    ['badge', staffCount === null ? 'حسابات الموظفين' : `${staffCount} حساب موظف`],
    ['image', 'كل الصور والفيديوهات والخطوط المرفوعة'],
    ['link_off', 'ربط إنستغرام'],
  ];

  return (
    <Modal
      open
      title={step === 1 ? 'إعادة ضبط المتجر' : 'تأكيد نهائي'}
      icon="warning"
      tone="danger"
      onClose={onClose}
      footer={
        step === 1 ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              إلغاء
            </Button>
            <Button icon="arrow_back" onClick={() => setStep(2)}>
              متابعة
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setStep(1)}>
              رجوع
            </Button>
            <Button
              icon="delete_forever"
              busy={busy}
              disabled={!ready}
              onClick={() => void submit()}
              className="!bg-semantic-error !text-white shadow-none hover:!bg-semantic-error/90"
            >
              احذف كل شيء وأعد الضبط
            </Button>
          </>
        )
      }
    >
      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 font-label-lg text-label-lg text-warm-ink">سيُحذف نهائياً:</p>
            <ul className="grid grid-cols-2 gap-1.5">
              {counts.map(([icon, label]) => (
                <li key={label} className="flex items-center gap-2 rounded-lg bg-semantic-error-bg/60 px-2.5 py-1.5 font-label-md text-label-md text-semantic-error">
                  <Icon name={icon} className="text-[16px]" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 font-label-lg text-label-lg text-warm-ink">يعود المتجر إلى:</p>
            <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    'flex flex-col gap-1 rounded-xl p-3 text-right transition-colors',
                    mode === m.id ? 'bg-imperial-burgundy text-ivory-canvas' : 'bg-surface-container-lowest shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)]',
                  )}
                >
                  <span className="flex items-center gap-2 font-label-lg text-label-lg font-semibold">
                    <Icon name={m.icon} className="text-[18px]" />
                    {m.title}
                  </span>
                  <span className={cn('font-label-sm text-label-sm', mode === m.id ? 'text-rose-mist' : 'text-muted-rosewood')}>{m.body}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="flex items-center gap-2 font-label-md text-label-md text-semantic-success">
            <Icon name="verified_user" className="text-[18px]" />
            يبقى: حساب المالك وكلمة مروره.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label={`اكتب «${RESET_PHRASE}» للتأكيد`}>
            <input
              className={cn(inputClass, phrase && phrase.trim() !== RESET_PHRASE && 'shadow-[inset_0_0_0_2px_#B42318]')}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              autoComplete="off"
              autoFocus
              placeholder={RESET_PHRASE}
            />
          </Field>
          <Field label="كلمة مرور المالك">
            <input
              type="password"
              dir="ltr"
              autoComplete="current-password"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
            />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-semantic-error-bg/60 p-3">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-semantic-error text-semantic-error focus:ring-semantic-error"
            />
            <span className="font-body-sm text-body-sm text-semantic-error">
              أفهم أن هذا الإجراء لا يمكن التراجع عنه، وأن الطلبات والمنتجات والصور ستُحذف نهائياً
              {mode === 'empty' ? ' ويصبح المتجر فارغاً.' : ' ويعود المحتوى الافتتاحي.'}
            </span>
          </label>
        </div>
      )}
    </Modal>
  );
}
