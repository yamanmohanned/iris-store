"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { FormAlert, PasswordInput, SubmitButton } from "@/components/forms/form-controls";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import type { CountryPreset } from "@/lib/countries";
import { tl } from "@/lib/localized";
import { setupAction } from "./actions";

export function SetupForm({
  token,
  countries,
  minLength,
}: {
  token: string;
  countries: CountryPreset[];
  minLength: number;
}) {
  const t = useTranslations("setup");
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [state, action] = useActionState(setupAction, null);
  const err = state?.fieldErrors ?? {};
  const v = state?.values ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormAlert state={state} />
      {token ? (
        <input type="hidden" name="token" value={token} />
      ) : (
        <Field label={t("token")} htmlFor="token" hint={t("tokenHint")} error={err.token}>
          <Input
            id="token"
            name="token"
            autoComplete="off"
            dir="ltr"
            required
            aria-invalid={Boolean(err.token)}
          />
        </Field>
      )}

      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-primary">{t("storeSection")}</legend>
        <Field label={t("storeNameAr")} htmlFor="storeNameAr" error={err.storeNameAr}>
          <Input
            id="storeNameAr"
            name="storeNameAr"
            dir="rtl"
            required
            defaultValue={v.storeNameAr}
          />
        </Field>
        <Field
          label={t("storeNameEn")}
          htmlFor="storeNameEn"
          optionalText={tCommon("optional")}
          error={err.storeNameEn}
        >
          <Input id="storeNameEn" name="storeNameEn" dir="ltr" defaultValue={v.storeNameEn} />
        </Field>
        <Field label={t("country")} htmlFor="country" hint={t("countryHint")} error={err.country}>
          <NativeSelect id="country" name="country" defaultValue={v.country || "IQ"}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {tl(c.name, locale)} ({c.currency})
              </option>
            ))}
          </NativeSelect>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-1 text-sm font-semibold text-primary">{t("ownerSection")}</legend>
        <Field label={t("ownerName")} htmlFor="ownerName" error={err.ownerName}>
          <Input
            id="ownerName"
            name="ownerName"
            autoComplete="name"
            required
            defaultValue={v.ownerName}
          />
        </Field>
        <Field label={tAuth("email")} htmlFor="email" error={err.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            dir="ltr"
            required
            defaultValue={v.email}
          />
        </Field>
        <Field
          label={tAuth("password")}
          htmlFor="password"
          error={err.password}
          hint={tAuth("passwordHint", { min: minLength })}
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={minLength}
          />
        </Field>
      </fieldset>

      <SubmitButton block size="lg">
        {t("submit")}
      </SubmitButton>
    </form>
  );
}
