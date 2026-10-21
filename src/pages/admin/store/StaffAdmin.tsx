import { useCallback, useEffect, useState } from 'react';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { AdminPage, Button, Card, Drawer, EmptyState, Field, inputClass, Notice, Toggle } from '@/components/admin/ui';
import { Icon } from '@/components/common/Icon';
import { staffApi, type StaffInput } from '@/lib/adminApi';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import {
  ACCESS_LABELS,
  ACCESS_LEVELS,
  MIN_PASSWORD,
  PERMISSION_PRESETS,
  presetOf,
  SECTION_LABELS,
  SECTIONS,
  USERNAME_PATTERN,
  type Access,
  type Permissions,
  type StaffMember,
} from '@/lib/permissions';
import { useAdminAuth } from '@/state/adminAuth';
import { useToast } from '@/state/toast';

const EMPTY: StaffInput = {
  username: '',
  name: '',
  title: '',
  password: '',
  permissions: PERMISSION_PRESETS[1].permissions,
  active: true,
};

/** كلمة مرور عشوائية مقروءة (بلا أحرف متشابهة) يسلّمها المالك للموظف. */
function generatePassword(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

const ACCESS_TONE: Record<Access, string> = {
  none: 'bg-surface-container-high text-muted-rosewood line-through decoration-muted-rosewood/40',
  view: 'bg-semantic-info-bg text-semantic-info',
  edit: 'bg-semantic-success-bg text-semantic-success',
};

/** فريق العمل: حسابات الموظفين وصلاحية كل واحد (للمالك فقط). */
export default function StaffAdmin() {
  const { admin } = useAdminAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState<StaffInput | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers((await staffApi.list()).users);
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل فريق العمل.');
    }
  }, []);

  useEffect(() => void load(), [load]);

  const remove = async (u: StaffMember) => {
    const ok = await confirm({
      title: `حذف حساب ${u.name}؟`,
      body: 'سيخرج من لوحة الإدارة فوراً ولن يستطيع الدخول مجدداً. يمكنك بدلاً من ذلك إيقاف الحساب مؤقتاً من شاشة التعديل.',
      confirmLabel: 'حذف الحساب',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      setUsers((await staffApi.remove(u.id)).users);
      toast.show('تم حذف الحساب', 'check_circle');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'تعذر الحذف', 'error');
    }
  };

  return (
    <AdminPage
      title="فريق العمل"
      subtitle="أنشئ حساباً لكل موظف وحدد ما يراه وما يستطيع تعديله. الخادم يطبّق الصلاحيات على كل طلب."
      actions={
        <Button icon="person_add" onClick={() => setDraft({ ...EMPTY, password: generatePassword() })}>
          إضافة موظف
        </Button>
      }
    >
      {error && (
        <Notice tone="danger" className="mb-5">
          {error}
        </Notice>
      )}

      <Card className="mb-4 flex items-center gap-3 !p-4">
        <Avatar name={admin?.name ?? 'م'} owner />
        <div className="min-w-0 flex-1">
          <p className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{admin?.name}</p>
          <p className="truncate font-label-sm text-label-sm text-muted-rosewood" dir="ltr">
            @{admin?.username}
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-champagne-gold/40 px-3 py-1 font-label-sm text-label-sm text-antique-gold">
          <Icon name="workspace_premium" className="text-[16px]" />
          المالك · كل الصلاحيات
        </span>
      </Card>

      {users === null && !error ? (
        <div className="flex justify-center py-16" role="status" aria-label="جارٍ التحميل">
          <Icon name="progress_activity" className="animate-spin text-[32px] text-antique-gold" />
        </div>
      ) : users && users.length === 0 ? (
        <EmptyState
          icon="groups"
          title="لا يوجد موظفون بعد"
          body="أضف حساباً لمن يساعدك في المتجر: مسؤول الطلبات يتابع الطلبات فقط، ومدخل المنتجات يضيف القطع والصور، وأنت تحدد التفاصيل."
          action={
            <Button icon="person_add" onClick={() => setDraft({ ...EMPTY, password: generatePassword() })}>
              إضافة أول موظف
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {users?.map((u) => (
            <li key={u.id}>
              <Card className="flex h-full flex-col gap-3 !p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} muted={!u.active} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate font-label-lg text-label-lg font-semibold text-deep-oxblood">{u.name}</span>
                      {!u.active && (
                        <span className="shrink-0 rounded-full bg-semantic-warning-bg px-2 font-label-sm text-label-sm text-semantic-warning">
                          موقوف
                        </span>
                      )}
                    </p>
                    <p className="truncate font-label-sm text-label-sm text-muted-rosewood">
                      <span dir="ltr">@{u.username}</span>
                      {u.title && ` · ${u.title}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`تعديل ${u.name}`}
                    onClick={() => setDraft({ ...u, password: '' })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-imperial-burgundy hover:bg-blush-surface"
                  >
                    <Icon name="edit" className="text-[20px]" />
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف ${u.name}`}
                    onClick={() => void remove(u)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-semantic-error hover:bg-semantic-error-bg"
                  >
                    <Icon name="delete" className="text-[20px]" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SECTIONS.map((s) => (
                    <span key={s} className={cn('rounded-full px-2.5 py-0.5 font-label-sm text-label-sm', ACCESS_TONE[u.permissions[s]])}>
                      {SECTION_LABELS[s].label}: {ACCESS_LABELS[u.permissions[s]]}
                    </span>
                  ))}
                </div>
                <p className="mt-auto font-label-sm text-label-sm text-muted-rosewood">
                  {u.lastLoginAt ? `آخر دخول: ${formatDate(u.lastLoginAt)}` : 'لم يدخل بعد'}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <StaffEditor
          initial={draft}
          onClose={() => setDraft(null)}
          onSaved={(list) => {
            setUsers(list);
            setDraft(null);
          }}
        />
      )}
    </AdminPage>
  );
}

function Avatar({ name, owner, muted }: { name: string; owner?: boolean; muted?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-headline-sm text-headline-sm',
        owner ? 'bg-wine-night text-champagne-gold' : 'bg-blush-surface text-imperial-burgundy',
        muted && 'opacity-50',
      )}
    >
      {name.trim().charAt(0) || '؟'}
    </span>
  );
}

function StaffEditor({ initial, onClose, onSaved }: { initial: StaffInput; onClose: () => void; onSaved: (users: StaffMember[]) => void }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<'name' | 'username' | 'password' | 'form', string>>>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(!initial.id);
  const editing = Boolean(initial.id);
  const preset = presetOf(f.permissions);

  const setPermission = (section: (typeof SECTIONS)[number], access: Access) =>
    setF({ ...f, permissions: { ...f.permissions, [section]: access } as Permissions });

  const save = async () => {
    const next: typeof errors = {};
    if (f.name.trim().length < 2) next.name = 'اكتب اسم الموظف.';
    if (!USERNAME_PATTERN.test(f.username.trim().toLowerCase())) next.username = 'من 3 إلى 32 حرفاً إنجليزياً صغيراً أو رقماً أو (. _ -).';
    if ((!editing || f.password) && f.password.length < MIN_PASSWORD) next.password = 'كلمة المرور 8 أحرف على الأقل.';
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      const res = await staffApi.save({ ...f, username: f.username.trim().toLowerCase() });
      toast.show(editing ? 'تم حفظ التعديلات' : 'تم إنشاء الحساب', 'check_circle');
      onSaved(res.users);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : 'تعذر الحفظ' });
    } finally {
      setBusy(false);
    }
  };

  const copyCredentials = async () => {
    const text = `رابط الدخول: ${window.location.origin}/admin/login\nاسم الدخول: ${f.username}\nكلمة المرور: ${f.password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.show('نُسخت بيانات الدخول', 'content_copy');
    } catch {
      toast.show('تعذر النسخ؛ انسخها يدوياً', 'error');
    }
  };

  return (
    <Drawer
      open
      title={editing ? `تعديل حساب ${initial.name}` : 'موظف جديد'}
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button icon="check" busy={busy} onClick={() => void save()}>
            {editing ? 'حفظ التعديلات' : 'إنشاء الحساب'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="اسم الموظف" required error={errors.name}>
            <input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} autoFocus />
          </Field>
          <Field label="المسمى الوظيفي" hint="يظهر في اللوحة، مثل: مسؤولة الطلبات.">
            <input className={inputClass} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={40} />
          </Field>
        </div>
        <Field label="اسم الدخول" required error={errors.username} hint="بالإنجليزية، مثل sara أو ahmed.orders">
          <input
            className={inputClass}
            dir="ltr"
            autoCapitalize="none"
            autoComplete="off"
            spellCheck={false}
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
            maxLength={32}
          />
        </Field>
        <Field
          label={editing ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}
          required={!editing}
          error={errors.password}
          hint={editing ? 'اتركها فارغة للإبقاء على الحالية. تعيين كلمة جديدة يُخرج الموظف من أجهزته.' : 'سلّمها للموظف؛ يستطيع تغييرها من «حسابي».'}
        >
          <div className="flex gap-2">
            <input
              className={cn(inputClass, 'font-mono')}
              dir="ltr"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={f.password}
              onChange={(e) => setF({ ...f, password: e.target.value })}
            />
            <button
              type="button"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              onClick={() => setShowPassword((v) => !v)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush-surface text-imperial-burgundy"
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
            </button>
            <button
              type="button"
              aria-label="توليد كلمة مرور"
              title="توليد كلمة مرور قوية"
              onClick={() => {
                setF({ ...f, password: generatePassword() });
                setShowPassword(true);
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blush-surface text-imperial-burgundy"
            >
              <Icon name="autorenew" className="text-[20px]" />
            </button>
          </div>
        </Field>
        {f.password && f.username && (
          <button
            type="button"
            onClick={() => void copyCredentials()}
            className="-mt-2 inline-flex items-center gap-1.5 self-start font-label-md text-label-md text-imperial-burgundy underline decoration-royal-gold/50 underline-offset-4"
          >
            <Icon name="content_copy" className="text-[16px]" />
            نسخ بيانات الدخول لإرسالها للموظف
          </button>
        )}

        <section className="flex flex-col gap-3 border-t border-hairline-burgundy pt-5">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">الصلاحيات</h3>
          <div className="grid grid-cols-2 gap-2">
            {PERMISSION_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={preset === p.id}
                onClick={() => setF({ ...f, permissions: p.permissions })}
                className={cn(
                  'rounded-xl p-3 text-right transition-colors',
                  preset === p.id
                    ? 'bg-imperial-burgundy text-ivory-canvas shadow-[0_4px_14px_rgba(78,24,37,0.25)]'
                    : 'bg-surface-container-lowest text-warm-ink shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)] hover:bg-blush-surface',
                )}
              >
                <span className="block font-label-lg text-label-lg font-semibold">{p.label}</span>
                <span className={cn('block font-label-sm text-label-sm', preset === p.id ? 'text-rose-mist' : 'text-muted-rosewood')}>
                  {p.description}
                </span>
              </button>
            ))}
          </div>
          {!preset && <p className="font-label-sm text-label-sm text-antique-gold">صلاحيات مخصصة لهذا الموظف.</p>}

          <div className="flex flex-col divide-y divide-hairline-burgundy rounded-2xl bg-surface-container-lowest px-4 shadow-[inset_0_0_0_1px_rgba(78,24,37,0.1)]">
            {SECTIONS.map((s) => (
              <div key={s} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <Icon name={SECTION_LABELS[s].icon} className="mt-0.5 text-[20px] text-antique-gold" />
                  <div>
                    <p className="font-label-lg text-label-lg text-warm-ink">{SECTION_LABELS[s].label}</p>
                    <p className="font-label-sm text-label-sm text-muted-rosewood">{SECTION_LABELS[s].hint}</p>
                  </div>
                </div>
                <div role="radiogroup" aria-label={SECTION_LABELS[s].label} className="flex shrink-0 rounded-xl bg-blush-surface p-1">
                  {ACCESS_LEVELS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={f.permissions[s] === a}
                      onClick={() => setPermission(s, a)}
                      className={cn(
                        'flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 font-label-md text-label-md transition-colors',
                        f.permissions[s] === a ? 'bg-white font-semibold text-imperial-burgundy shadow-sm' : 'text-muted-rosewood hover:text-warm-ink',
                      )}
                    >
                      {ACCESS_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="font-label-sm text-label-sm text-muted-rosewood">
            فريق العمل وربط إنستغرام وإعادة ضبط المتجر تبقى للمالك وحده. الاستيراد من إنستغرام يحتاج «عرض وتعديل» في المنتجات.
          </p>
        </section>

        <div className="border-t border-hairline-burgundy pt-5">
          <Toggle checked={f.active} onChange={(active) => setF({ ...f, active })} label="الحساب مفعّل (إيقافه يُخرج الموظف فوراً دون حذف حسابه)" />
        </div>
      </div>
    </Drawer>
  );
}
