import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export interface AdminUser {
  name: string;
  role: string;
  username: string;
}

/** checking = نتحقق من جلسة سابقة على الخادم عند فتح لوحة الإدارة */
type Stage = 'checking' | 'out' | 'in';

interface AdminAuthContextValue {
  admin: AdminUser | null;
  stage: Stage;
  /** تسجيل الدخول على الخادم (جلسة بملف تعريف ارتباط HttpOnly). يرمي خطأ برسالة عربية عند الفشل. */
  signIn: (username: string, password: string) => Promise<AdminUser>;
  signOut: () => Promise<void>;
  /** تغيير كلمة مرور المالك. */
  changePassword: (current: string, next: string) => Promise<void>;
  /** يبدأ فحص الجلسة مرة واحدة (يستدعيه useAdminAuth تلقائياً). */
  ensureChecked: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

/**
 * جلسة المالك. التحقق يتم على الخادم فقط (api/index.php)؛ المتصفح لا يحفظ أي بيانات دخول.
 * تُفحص الجلسة عند أول استخدام للوحة الإدارة فقط حتى لا يُرسل طلب إضافي لكل زائر للمتجر.
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stage, setStage] = useState<Stage>('checking');
  const started = useRef(false);

  const ensureChecked = useCallback(async () => {
    if (started.current) return;
    started.current = true;
    try {
      const res = await api<{ admin: AdminUser | null }>('auth/me');
      setAdmin(res.admin);
      setStage(res.admin ? 'in' : 'out');
    } catch {
      setAdmin(null);
      setStage('out');
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const res = await api<{ admin: AdminUser }>('auth/login', { method: 'POST', body: { username, password } });
    setAdmin(res.admin);
    setStage('in');
    started.current = true;
    return res.admin;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api('auth/logout', { method: 'POST' });
    } finally {
      setAdmin(null);
      setStage('out');
    }
  }, []);

  const changePassword = useCallback(async (current: string, next: string) => {
    await api('auth/password', { method: 'POST', body: { current, next } });
  }, []);

  const value = useMemo(
    () => ({ admin, stage, signIn, signOut, changePassword, ensureChecked: () => void ensureChecked() }),
    [admin, stage, signIn, signOut, changePassword, ensureChecked],
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
