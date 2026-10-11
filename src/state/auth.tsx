import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readJSON, removeKey, writeJSON } from './storage';

const USER_KEY = 'iris.user.v1';

export interface Customer {
  name: string;
  phone: string;
  city?: string;
}

interface AuthContextValue {
  user: Customer | null;
  /** يسجّل الدخول (بيئة تجريبية — لا يوجد خادم). */
  login: (customer: Customer) => void;
  logout: () => void;
  update: (patch: Partial<Customer>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** رمز التحقق التجريبي لكل الأرقام (لا يوجد مزوّد SMS في هذه النسخة). */
export const DEMO_OTP = '1234';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Customer | null>(() => readJSON<Customer | null>(USER_KEY, null));

  useEffect(() => {
    if (user) writeJSON(USER_KEY, user);
    else removeKey(USER_KEY);
  }, [user]);

  const login = useCallback((c: Customer) => setUser(c), []);
  const logout = useCallback(() => setUser(null), []);
  const update = useCallback((patch: Partial<Customer>) => setUser((u) => (u ? { ...u, ...patch } : u)), []);

  const value = useMemo(() => ({ user, login, logout, update }), [user, login, logout, update]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
