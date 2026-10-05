"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert, PasswordInput, SubmitButton } from "@/components/forms/form-controls";
import { Turnstile } from "@/components/turnstile";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { signUpAction } from "../actions";

export function RegisterForm({
  next,
  turnstileKey,
  nonce,
  minLength,
}: {
  next: string;
  turnstileKey: string | null;
  nonce?: string;
  minLength: number;
}) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(signUpAction, null);
  const err = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormAlert state={state} />
      <Field label={t("name")} htmlFor="name" error={err.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          defaultValue={state?.values?.name}
          aria-invalid={Boolean(err.name)}
        />
      </Field>
      <Field label={t("email")} htmlFor="email" error={err.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          required
          defaultValue={state?.values?.email}
          aria-invalid={Boolean(err.email)}
        />
      </Field>
      <Field
        label={t("password")}
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
      {turnstileKey ? <Turnstile siteKey={turnstileKey} nonce={nonce} action="register" /> : null}
      <SubmitButton block size="lg">
        {t("signUp")}
      </SubmitButton>
      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        {t.rich("termsNotice", {
          terms: (chunks) => (
            <Link href="/pages/terms" className="underline hover:text-foreground">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/pages/privacy" className="underline hover:text-foreground">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}
