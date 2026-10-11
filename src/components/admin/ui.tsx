import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/common/Icon';
import { cn } from '@/lib/cn';

/** عناصر واجهة مشتركة لصفحات إدارة المتجر — بنفس لغة تصميم لوحة آيريس. */

export function AdminPage({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-md font-bold text-deep-oxblood md:text-headline-lg">{title}</h1>
          {subtitle && <p className="mt-1 font-body-sm text-body-sm text-muted-rosewood">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </main>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-2xl bg-surface-container-lowest p-4 shadow-luxury md:p-6', className)}>{children}</section>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  icon,
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cn(
        'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 font-label-lg text-label-lg font-semibold transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-imperial-burgundy text-ivory-canvas shadow-[0_4px_14px_rgba(78,24,37,0.25)] hover:bg-burgundy-600',
        variant === 'secondary' &&
          'bg-surface-container-lowest text-imperial-burgundy shadow-[inset_0_0_0_1px_rgba(78,24,37,0.25)] hover:bg-blush-surface',
        variant === 'ghost' && 'text-imperial-burgundy hover:bg-blush-surface',
        variant === 'danger' && 'text-semantic-error hover:bg-semantic-error-bg',
        className,
      )}
    >
      {busy ? (
        <Icon name="progress_activity" className="animate-spin text-[18px]" />
      ) : icon ? (
        <Icon name={icon} className="text-[18px]" />
      ) : null}
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-xl bg-ivory-canvas/60 px-3.5 py-2.5 font-body-md text-body-md text-warm-ink shadow-[inset_0_0_0_1px_rgba(78,24,37,0.16)] outline-none transition-shadow placeholder:text-muted-rosewood/50 focus:bg-white focus:shadow-[inset_0_0_0_2px_#4E1825,0_0_0_3px_#EED9DB]';

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex items-center gap-1 font-label-lg text-label-lg text-warm-ink">
        {label}
        {required && <span className="text-semantic-error">*</span>}
      </span>
      {children}
      {error ? (
        <span className="flex items-center gap-1 font-label-sm text-label-sm text-semantic-error">
          <Icon name="error" className="text-[14px]" />
          {error}
        </span>
      ) : hint ? (
        <span className="font-label-sm text-label-sm text-muted-rosewood">{hint}</span>
      ) : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-right"
    >
      <span
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-imperial-burgundy' : 'bg-outline-variant')}
      >
        <span
          className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'right-0.5' : 'right-[22px]')}
        />
      </span>
      <span className="font-body-sm text-body-sm text-warm-ink">{label}</span>
    </button>
  );
}

/** لوحة تحرير منزلقة من الجانب (ملء الشاشة على الهاتف). */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-start" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="إغلاق" onClick={onClose} className="absolute inset-0 bg-wine-night/50 backdrop-blur-[1px]" />
      <div className="relative flex h-full w-full max-w-[560px] flex-col bg-ivory-canvas shadow-[0_0_60px_rgba(42,3,13,0.35)]">
        <div className="pt-safe flex items-center justify-between border-b border-hairline-burgundy px-5 py-3">
          <h2 className="font-headline-sm text-headline-sm font-semibold text-deep-oxblood">{title}</h2>
          <button
            type="button"
            aria-label="إغلاق"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-warm-ink hover:bg-blush-surface"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="pb-safe border-t border-hairline-burgundy bg-surface-container-lowest px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-container-lowest px-6 py-12 text-center shadow-luxury">
      <Icon name={icon} className="text-[40px] text-rose-mist" />
      <p className="font-headline-sm text-headline-sm text-warm-ink">{title}</p>
      {body && <p className="max-w-md font-body-sm text-body-sm text-muted-rosewood">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** تنبيه عندما يتعذر الوصول للخادم (مثلاً على استضافة بلا PHP). */
export function OfflineNotice({ message }: { message: string }) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl bg-semantic-warning-bg p-4 text-semantic-warning">
      <Icon name="cloud_off" className="mt-0.5 text-[20px]" />
      <p className="font-body-sm text-body-sm">{message}</p>
    </div>
  );
}
