import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { allows, type Access, type AdminProfile, type Section } from '@/lib/permissions';
import { resetAdminOrders } from './adminOrders';

export type { AdminProfile } from '@/lib/permissions';

/** checking = نتحقق من جلسة سابقة على الخادم عند فتح لوحة الإدارة */
type Stage = 'checking' | 'out' | 'in';

interface AdminAuthContextValue {
  admin: AdminProfile | null;
  stage: Stage;
  /** هل الحساب الحالي هو المالك؟ (إدارة الفريق وإنستغرام وإعادة الضبط له وحده) */
  isOwner: boolean;
  /** هل يملك الحساب الحالي هذا المستوى من الصلاحية؟ (التعديل يتضمن العرض) */
  can: (section: Section, level?: Exclude<Access, 'none'>) => boolean;
  /** تسجيل الدخول على الخادم (جلسة بملف تعريف ارتباط HttpOnly). يرمي خطأ برسالة عربية عند الفشل. */
  signIn: (username: string, password: string) => Promise<AdminProfile>;
  signOut: () => Promise<void>;
  /** تغيير كلمة مرور الحساب الحالي. */
  changePassword: (current: string, next: string) => Promise<void>;
  /** يعيد قراءة الحساب من الخادم (بعد تغيير صلاحيات أو إعادة ضبط). */
  refresh: () => Promise<void>;
  /** يبدأ فحص الجلسة مرة واحدة (يستدعيه useAdminAuth تلقائياً). */
  ensureChecked: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * جلسة لوحة الإدارة (المالك أو موظف). التحقق والصلاحيات تُفرض على الخادم؛ هنا فقط لإخفاء
 * ما لا يخص الحساب. تُفحص الجلسة عند أول استخدام للوحة فقط حتى لا يُرسل طلب إضافي لكل زائر.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const started = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ admin: AdminProfile | null }>('auth/me');
      setAdmin(res.admin);
      setStage(res.admin ? 'in' : 'out');
    } catch {
      setAdmin(null);
      setStage('out');
    }
  }, []);

  const ensureChecked = useCallback(() => {
    if (started.current) return;
    started.current = true;
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await api<{ admin: AdminProfile }>('auth/login', { method: 'POST', body: { username, password } });
    resetAdminOrders();
    setAdmin(res.admin);
    setStage('in');
    started.current = true;
    return res.admin;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api('auth/logout', { method: 'POST' });
    } finally {
      resetAdminOrders();
      setAdmin(null);
      setStage('out');
    }
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    await api('auth/password', { method: 'POST', body: { current, next } });
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      admin,
      stage,
      isOwner: admin?.role === 'owner',
      can: (section, level = 'view') => allows(admin?.permissions, section, level),
      signIn,
      signOut,
      changePassword,
      refresh,
      ensureChecked,
    }),
    [admin, stage, signIn, signOut, changePassword, refresh, ensureChecked],
  );
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used inside <AdminAuthProvider>');
  const { ensureChecked } = ctx;
  useEffect(ensureChecked, [ensureChecked]);
  return ctx;
}
