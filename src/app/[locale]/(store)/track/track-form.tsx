"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert, SubmitButton } from "@/components/forms/form-controls";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import type { FormState } from "@/lib/form-state";

export function TrackForm({
  action,
  phonePlaceholder,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  phonePlaceholder: string;
}) {
  const t = useTranslations("track");
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label={t("orderNumber")} htmlFor="orderNumber">
        <Input
          id="orderNumber"
          name="orderNumber"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          placeholder={t("orderNumberPlaceholder")}
          defaultValue={state?.values?.orderNumber}
          required
          maxLength={20}
        />
      </Field>
      <Field label={t("phone")} htmlFor="phone">
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          placeholder={phonePlaceholder}
          defaultValue={state?.values?.phone}
          required
          maxLength={30}
        />
      </Field>
      <SubmitButton block size="lg">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
