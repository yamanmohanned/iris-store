"use client";

import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/misc";
import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

/** Submit button that shows a spinner while its form's action is running. */
export function SubmitButton({ children, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...props}>
      {children}
    </Button>
  );
}

/** Summary message for a form result (announced to screen readers). */
export function FormAlert({ state, className }: { state: FormState; className?: string }) {
  if (!state?.message) return null;
  return (
    <Alert tone={state.ok ? "success" : "danger"} className={className}>
      {state.message}
    </Alert>
  );
}

export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const t = useTranslations("auth");
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      {/* Inherits the page direction so the end padding always sits under the toggle button. */}
      <Input {...props} type={visible ? "text" : "password"} className={cn("pe-12", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute end-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

/**
 * One-time code input: numeric keypad on phones, SMS/email autofill (`one-time-code`), accepts
 * pasted codes with spaces or Arabic-Indic digits, and submits the form once 6 digits are entered.
 */
export function OtpInput({
  name = "code",
  length = 6,
  autoSubmit = true,
  ...props
}: Omit<ComponentProps<"input">, "onChange" | "value"> & {
  length?: number;
  autoSubmit?: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (autoSubmit && value.length === length && !submitted.current) {
      submitted.current = true;
      ref.current?.form?.requestSubmit();
    }
    if (value.length < length) submitted.current = false;
  }, [value, length, autoSubmit]);

  return (
    <input
      ref={ref}
      name={name}
      value={value}
      onChange={(e) => {
        const digits = e.target.value
          .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
          .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
          .replace(/\D/g, "")
          .slice(0, length);
        setValue(digits);
      }}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern={`\\d{${length}}`}
      maxLength={length + 4}
      dir="ltr"
      className="h-16 w-full rounded-xl border border-input bg-surface text-center font-mono text-3xl font-semibold tracking-[0.6em] text-foreground shadow-xs focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
      {...props}
    />
  );
}

/** "Resend code" with a cooldown, so impatient taps don't burn the rate limit. */
export function ResendCountdown({
  seconds = 60,
  children,
}: {
  seconds?: number;
  children: (remaining: number) => ReactNode;
}) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);
  return <>{children(remaining)}</>;
}
