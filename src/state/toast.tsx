import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  message: string;
  icon: string;
}

interface ToastContextValue {
  show: (message: string, icon?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * إشعار عائم بنمط نظام التصميم: خلفية Deep Oxblood، نص Champagne Gold،
 * وشريط ذهبي على الحافة اليمنى (اتجاه RTL).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const seq = useRef(0);

  const show = useCallback((message: string, icon = 'check_circle') => {
    window.clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, message, icon });
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), 3200);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className={`pointer-events-none fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[2000] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 transition-all duration-300 md:bottom-6 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
      >
        {toast && (
          <div className="flex items-center gap-3 rounded-xl border border-royal-gold/40 border-r-[3px] border-r-royal-gold bg-deep-oxblood px-5 py-3 text-champagne-gold shadow-[0_24px_64px_rgba(42,3,13,0.24)]">
            <span className="material-symbols-outlined text-[20px] text-royal-gold">{toast.icon}</span>
            <span className="font-label-md text-label-md">{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
