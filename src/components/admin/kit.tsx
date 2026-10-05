"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Small square icon button with a tooltip label (rows, galleries, toolbars). */
export function IconButton({
  label,
  onClick,
  disabled,
  danger,
  active,
  size = "md",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30",
        size === "md" ? "size-9 rounded-lg" : "size-7 rounded-md",
        danger && "hover:bg-danger-soft hover:text-danger",
        active && "bg-danger text-white hover:bg-danger hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

/** Two-tap delete: the first tap arms it for a few seconds, the second confirms. */
export function useConfirm(timeoutMs = 4000) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    armed,
    /** Returns true when this tap confirms. */
    tap(): boolean {
      if (armed) {
        window.clearTimeout(timer.current);
        setArmed(false);
        return true;
      }
      setArmed(true);
      timer.current = window.setTimeout(() => setArmed(false), timeoutMs);
      return false;
    },
  };
}

export function DeleteIconButton({
  label,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const confirm = useConfirm();
  return (
    <IconButton
      label={confirm.armed ? confirmLabel : label}
      danger
      active={confirm.armed}
      disabled={disabled}
      onClick={() => confirm.tap() && onConfirm()}
    >
      <Trash2 className="size-4" />
    </IconButton>
  );
}

export function PageTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[1.8rem] leading-tight font-bold">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminCard({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("space-y-4 rounded-2xl border bg-surface p-4 shadow-card sm:p-5", className)}
    >
      {title ? (
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** A switch with a label and an optional explanation (the whole row is clickable). */
export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3">
      <label htmlFor={id} className="min-w-0 cursor-pointer text-sm">
        <span className="block font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

/**
 * Number input with a fixed unit at the end ("د.ع", "%", "يوم"). It follows the page direction
 * so the number sits at the start and the unit at the end in both Arabic and English.
 */
export function UnitInput({
  unit,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className="relative">
      <Input className={cn("pe-14 text-start tabular-nums", className)} {...props} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 end-3.5 flex items-center text-sm text-muted-foreground"
      >
        {unit}
      </span>
    </div>
  );
}

/** Amount field edited as text in major units (parsed with `parseMoneyInput` on save). */
export function MoneyField({
  id,
  label,
  value,
  onChange,
  symbol,
  hint,
  error,
  optionalText,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  symbol: string;
  hint?: React.ReactNode;
  error?: string;
  optionalText?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} optionalText={optionalText}>
      <UnitInput
        id={id}
        unit={symbol}
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Field>
  );
}

export function SubmitBar({ label, pending }: { label: string; pending: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-4 border-t bg-surface/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-md">
      <Button type="submit" block size="lg" loading={pending}>
        {label}
      </Button>
    </div>
  );
}
