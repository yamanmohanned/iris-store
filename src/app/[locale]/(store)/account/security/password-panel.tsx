"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert, PasswordInput, SubmitButton } from "@/components/forms/form-controls";
import { Field } from "@/components/ui/label";
import { changePasswordAction } from "./actions";

export function PasswordPanel({ minLength }: { minLength: number }) {
  const t = useTranslations("account.password");
  const tAuth = useTranslations("auth");
  const [state, action] = useActionState(changePasswordAction, null);
  return (
    <section className="rounded-2xl border bg-surface p-5 shadow-card sm:p-6">
      <h2 className="text-lg font-semibold">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      <form action={action} className="mt-5 space-y-4" noValidate>
        <FormAlert state={state} />
        <Field
          label={tAuth("currentPassword")}
          htmlFor="currentPassword"
          error={state?.fieldErrors?.currentPassword}
        >
          <PasswordInput
            id="currentPassword"
            name="currentPassword"
            autoComplete="current-password"
            required
          />
        </Field>
        <Field
          label={tAuth("newPassword")}
          htmlFor="newPassword"
          error={state?.fieldErrors?.newPassword}
          hint={tAuth("passwordHint", { min: minLength })}
        >
          <PasswordInput
            id="newPassword"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={minLength}
          />
        </Field>
        <SubmitButton>{t("submit")}</SubmitButton>
      </form>
    </section>
  );
}
