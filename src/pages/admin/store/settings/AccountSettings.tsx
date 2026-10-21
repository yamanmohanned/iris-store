import { useState, type FormEvent } from 'react';
import { Button, Card, Field, inputClass } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';
import { ACCESS_LABELS, MIN_PASSWORD, SECTION_LABELS, SECTIONS } from '@/lib/permissions';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';
import { SettingsHeader } from './SettingsLayout';

/** حسابي: بيانات الحساب الحالي وصلاحياته، وتغيير كلمة مروره (لكل حساب، مالكاً أو موظفاً). */
export default function AccountSettings() {
  const { admin, isOwner } = useAdminAuth();
  return (
    <>
      <SettingsHeader title="حسابي" description="اسم الدخول وكلمة المرور الخاصة بك في لوحة الإدارة." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-wine-night font-headline-sm text-headline-sm text-champagne-gold">
              {admin?.name.trim().charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{admin?.name}</p>
              <p className="font-label-sm text-label-sm text-muted-rosewood">
                <span dir="ltr">@{admin?.username}</span> · {admin?.title}
              </p>
            </div>
          </div>
          {isOwner ? (
            <p className="font-body-sm text-body-sm text-muted-rosewood">
              حساب المالك يملك كل الصلاحيات. اسم الدخول يُغيّر من ملف <span dir="ltr">api/config.php</span> على الاستضافة.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {SECTIONS.map((s) => (
                <li key={s} className="flex items-center justify-between rounded-xl bg-blush-surface/60 px-3 py-2">
                  <span className="flex items-center gap-2 font-label-md text-label-md text-warm-ink">
                    <Icon name={SECTION_LABELS[s].icon} className="text-[18px] text-antique-gold" />
                    {SECTION_LABELS[s].label}
                  </span>
                  <span
                    className={cn(
                      'font-label-sm text-label-sm',
                      admin?.permissions[s] === 'none' ? 'text-muted-rosewood' : 'font-semibold text-imperial-burgundy',
                    )}
                  >
                    {ACCESS_LABELS[admin?.permissions[s] ?? 'none']}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <PasswordCard />
      </div>
    </>
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
    if (next.length < MIN_PASSWORD) return setError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.');
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
        <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">تغيير كلمة المرور</h3>
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
