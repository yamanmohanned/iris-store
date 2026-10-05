"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import {
  FormAlert,
  OtpInput,
  PasswordInput,
  ResendCountdown,
  SubmitButton,
} from "@/components/forms/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";
import {
  forgotPasswordAction,
  requestSignInCodeAction,
  resendCodeAction,
  resetPasswordAction,
  signInWithCodeAction,
  verifyEmailAction,
  verifyTwoFactorAction,
} from "../actions";

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

function ResendCode({
  purpose,
}: {
  purpose: "email-verification" | "sign-in" | "forget-password";
}) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(resendCodeAction, null);
  const [round, setRound] = useState(0);
  return (
    <form
      action={(fd) => {
        setRound((r) => r + 1);
        return action(fd);
      }}
      className="mt-4 text-center"
    >
      <input type="hidden" name="purpose" value={purpose} />
      <ResendCountdown key={round} seconds={60}>
        {(remaining) =>
          remaining > 0 ? (
            <p className="text-sm text-muted-foreground tabular">
              {t("resendIn", { seconds: remaining })}
            </p>
          ) : (
            <SubmitButton variant="link" size="sm">
              {t("resendCode")}
            </SubmitButton>
          )
        }
      </ResendCountdown>
      {state?.message ? (
        <p className={state.ok ? "mt-2 text-sm text-success" : "mt-2 text-sm text-danger"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/** Six-digit code entry used by email verification and passwordless sign-in. */
export function CodeForm({ kind, next }: { kind: "verify-email" | "sign-in"; next: string }) {
  const t = useTranslations("auth");
  const action: Action = kind === "verify-email" ? verifyEmailAction : signInWithCodeAction;
  const [state, formAction] = useActionState(action, null);
  return (
    <>
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <FormAlert state={state} />
        <Field label={t("codeLabel")} htmlFor="code">
          <OtpInput id="code" autoFocus aria-describedby="code-hint" />
        </Field>
        <SubmitButton block size="lg">
          {kind === "verify-email" ? t("verify") : t("signIn")}
        </SubmitButton>
        <p id="code-hint" className="text-center text-xs text-muted-foreground">
          {t("checkSpam")}
        </p>
      </form>
      <ResendCode purpose={kind === "verify-email" ? "email-verification" : "sign-in"} />
    </>
  );
}

/** Email-only step (passwordless sign-in or forgot password). */
export function EmailStepForm({
  kind,
  next,
  turnstileKey,
  nonce,
}: {
  kind: "sign-in" | "forgot";
  next: string;
  turnstileKey: string | null;
  nonce?: string;
}) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(
    kind === "sign-in" ? requestSignInCodeAction : forgotPasswordAction,
    null,
  );
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <Field label={t("email")} htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          required
          autoFocus
          defaultValue={state?.values?.email}
          aria-invalid={Boolean(state?.fieldErrors?.email)}
        />
      </Field>
      {turnstileKey ? <Turnstile siteKey={turnstileKey} nonce={nonce} action={kind} /> : null}
      <SubmitButton block size="lg">
        {t("sendCode")}
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ minLength }: { minLength: number }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(resetPasswordAction, null);
  const err = state?.fieldErrors ?? {};
  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        <FormAlert state={state} />
        <Field label={t("codeLabel")} htmlFor="code" error={err.code}>
          <OtpInput id="code" autoSubmit={false} autoFocus />
        </Field>
        <Field
          label={t("newPassword")}
          htmlFor="password"
          error={err.password}
          hint={t("passwordHint", { min: minLength })}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={minLength}
            aria-invalid={Boolean(err.password)}
          />
        </Field>
        <SubmitButton block size="lg">
          {t("resetSubmit")}
        </SubmitButton>
      </form>
      <ResendCode purpose="forget-password" />
    </>
  );
}

export function TwoFactorForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(verifyTwoFactorAction, null);
  const [kind, setKind] = useState<"totp" | "backup">("totp");
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="kind" value={kind} />
      <FormAlert state={state} />
      {kind === "totp" ? (
        <Field label={t("codeLabel")} htmlFor="code">
          <OtpInput id="code" autoFocus key="totp" />
        </Field>
      ) : (
        <Field label={t("backupCodeLabel")} htmlFor="code">
          <Input
            id="code"
            name="code"
            autoComplete="off"
            dir="ltr"
            required
            autoFocus
            key="backup"
            className="font-mono tracking-widest"
          />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" name="trustDevice" className="size-4 accent-[var(--primary)]" />
        {t("trustDevice")}
      </label>
      <SubmitButton block size="lg">
        {t("verify")}
      </SubmitButton>
      <Button
        type="button"
        variant="link"
        block
        onClick={() => setKind(kind === "totp" ? "backup" : "totp")}
      >
        {kind === "totp" ? t("useBackupCode") : t("useAuthenticator")}
      </Button>
    </form>
  );
}
