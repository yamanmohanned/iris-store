import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button, inputClass, Modal } from './ui';

interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  icon?: string;
}

interface ChooseOptions extends ConfirmOptions {
  /** خيارات يختار منها المستخدم قبل التأكيد (مثل القسم الذي تُنقل إليه المنتجات) */
  choices: Array<{ value: string; label: string }>;
  choiceLabel: string;
}

type Pending = (ConfirmOptions & { choices?: ChooseOptions['choices']; choiceLabel?: string }) & {
  resolve: (value: string | boolean | null) => void;
};

interface ConfirmApi {
  /** نافذة تأكيد بدل window.confirm. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** نافذة تأكيد مع اختيار من قائمة؛ تعيد القيمة المختارة أو null عند الإلغاء. */
  choose: (options: ChooseOptions) => Promise<string | null>;
}

const ConfirmContext = createContext<ConfirmApi | null>(null);

/** نوافذ التأكيد في لوحة الإدارة (بدل نوافذ المتصفح الافتراضية). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [choice, setChoice] = useState('');
  const current = useRef<Pending | null>(null);

  const open = useCallback((p: Pending) => {
    current.current?.resolve(p.choices ? null : false);
    current.current = p;
    setChoice(p.choices?.[0]?.value ?? '');
    setPending(p);
  }, []);

  const close = useCallback((result: string | boolean | null) => {
    current.current?.resolve(result);
    current.current = null;
    setPending(null);
  }, []);

  const api = useMemo<ConfirmApi>(
    () => ({
      confirm: (options) => new Promise<boolean>((resolve) => open({ ...options, resolve: (v) => resolve(v === true) })),
      choose: (options) => new Promise<string | null>((resolve) => open({ ...options, resolve: (v) => resolve(typeof v === 'string' ? v : null) })),
    }),
    [open],
  );

  const cancel = () => close(pending?.choices ? null : false);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <Modal
        open={!!pending}
        title={pending?.title ?? ''}
        icon={pending?.icon ?? (pending?.tone === 'danger' ? 'delete' : 'help')}
        tone={pending?.tone === 'danger' ? 'danger' : 'default'}
        onClose={cancel}
        footer={
          <>
            <Button variant="ghost" onClick={cancel}>
              إلغاء
            </Button>
            <Button
              autoFocus
              className={cn(pending?.tone === 'danger' && '!bg-semantic-error !text-white hover:!bg-semantic-error/90')}
              onClick={() => close(pending?.choices ? choice : true)}
              disabled={!!pending?.choices && !choice}
            >
              {pending?.confirmLabel ?? 'تأكيد'}
            </Button>
          </>
        }
      >
        {pending?.body && <div className="mb-3 text-muted-rosewood">{pending.body}</div>}
        {pending?.choices && (
          <label className="flex flex-col gap-1.5">
            <span className="font-label-lg text-label-lg text-warm-ink">{pending.choiceLabel}</span>
            <select className={inputClass} value={choice} onChange={(e) => setChoice(e.target.value)}>
              {pending.choices.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
